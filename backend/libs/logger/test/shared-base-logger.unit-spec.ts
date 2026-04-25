// libs/logger/test/shared-base-logger.unit-spec.ts
import type { Logger } from "winston";

type TRequestContext = {
  traceId?: string;
  requestId?: string;
  userId?: string | null;
  ip?: string;
};

type TLoadLoggerModuleOptions = {
  awsRegion?: string;
  loggerLevel?: string;
  requestContext?: TRequestContext | null;
  ci?: string;
  logSilent?: string;
};

type TSharedBaseLoggerModule = {
  getOrCreateBaseLogger: () => Logger;
};

const ORIGINAL_ENV = { ...process.env };

let mockAwsRegion: string | undefined;
let mockLoggerLevel = "info";
let mockRequestContext: TRequestContext | null = null;
const mockRequestContextGet = jest.fn(() => mockRequestContext);

jest.mock("config", () => ({
  get AWS_REGION() {
    return mockAwsRegion;
  },
  get LOGGER_LEVEL() {
    return mockLoggerLevel;
  },
}));

jest.mock("../src/request-context", () => ({
  RequestContext: {
    get: () => mockRequestContextGet(),
  },
}));

jest.mock("winston-cloudwatch", () => {
  const { transports } = require("winston");

  /**
   * Lightweight CloudWatch transport mock to avoid loading AWS stack in unit tests.
   */
  return class MockCloudWatchTransport extends transports.Console {
    public readonly opts: unknown;

    /**
     * @param {unknown} options
     */
    constructor(options: unknown) {
      super({ silent: true });
      this.opts = options;
    }
  };
});

/**
 * Overrides process.mainModule for the duration of a callback.
 *
 * @param {string | undefined} filename
 * @param {() => void} run
 * @returns {void}
 */
function withMainModule(filename: string | undefined, run: () => void): void {
  const originalDescriptor = Object.getOwnPropertyDescriptor(
    process,
    "mainModule",
  );

  Object.defineProperty(process, "mainModule", {
    configurable: true,
    writable: true,
    value: filename ? { filename } : undefined,
  });

  try {
    run();
  } finally {
    if (originalDescriptor) {
      Object.defineProperty(process, "mainModule", originalDescriptor);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (process as any).mainModule;
    }
  }
}

/**
 * Loads shared-base-logger module in isolation with configurable runtime state.
 *
 * @param {TLoadLoggerModuleOptions} [opts={}]
 * @returns {{ module: TSharedBaseLoggerModule; requestContextGet: jest.Mock }}
 */
function loadSharedBaseLoggerModule(opts: TLoadLoggerModuleOptions = {}) {
  mockAwsRegion = opts.awsRegion;
  mockLoggerLevel = opts.loggerLevel ?? "info";
  mockRequestContext = opts.requestContext ?? null;

  process.env.CI = opts.ci ?? "true";

  if (opts.logSilent === undefined) {
    delete process.env.LOG_SILENT;
  } else {
    process.env.LOG_SILENT = opts.logSilent;
  }

  let module!: TSharedBaseLoggerModule;

  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    module = require("../src/shared-base-logger") as TSharedBaseLoggerModule;
  });

  return { module, requestContextGet: mockRequestContextGet };
}

/**
 * Returns console transport from the created logger.
 *
 * @param {Logger} logger
 * @returns {any}
 */
function getConsoleTransport(logger: Logger) {
  return logger.transports.find(
    (transport) => transport.constructor?.name === "Console",
  );
}

/**
 * Extracts rendered message from a transformed log info object.
 *
 * @param {Record<PropertyKey, unknown>} info
 * @returns {string}
 */
function getRenderedMessage(info: Record<PropertyKey, unknown>): string {
  const rendered = info[Symbol.for("message")];
  return typeof rendered === "string" ? rendered : "";
}

/**
 * Narrows winston/logform transform result to object info payload.
 *
 * @param {boolean | Record<PropertyKey, unknown>} value
 * @returns {Record<PropertyKey, unknown>}
 */
function expectFormattedInfo(
  value: boolean | Record<PropertyKey, unknown>,
): Record<PropertyKey, unknown> {
  expect(value).not.toBe(false);
  return value as Record<PropertyKey, unknown>;
}

describe("SharedBaseLogger (unit)", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    mockAwsRegion = undefined;
    mockLoggerLevel = "info";
    mockRequestContext = null;
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    mockAwsRegion = undefined;
    mockLoggerLevel = "info";
    mockRequestContext = null;
    jest.clearAllMocks();
  });

  it("should return the same logger instance within the same module instance", () => {
    withMainModule(undefined, () => {
      const { module } = loadSharedBaseLoggerModule();

      const loggerA = module.getOrCreateBaseLogger();
      const loggerB = module.getOrCreateBaseLogger();

      expect(loggerA).toBe(loggerB);
    });
  });

  it('should resolve service name as "test.service" when process.mainModule is absent', () => {
    withMainModule(undefined, () => {
      const { module } = loadSharedBaseLoggerModule();

      const logger = module.getOrCreateBaseLogger();

      expect(logger.defaultMeta).toMatchObject({ service: "test.service" });
    });
  });

  it('should resolve service name as "typeorm-cli" for typeorm cli main module', () => {
    withMainModule("/repo/node_modules/typeorm/cli.js", () => {
      const { module } = loadSharedBaseLoggerModule();

      const logger = module.getOrCreateBaseLogger();

      expect(logger.defaultMeta).toMatchObject({ service: "typeorm-cli" });
    });
  });

  it('should resolve service name as "cli" for console entrypoint', () => {
    withMainModule("/repo/libs/console/src/main.ts", () => {
      const { module } = loadSharedBaseLoggerModule();

      const logger = module.getOrCreateBaseLogger();

      expect(logger.defaultMeta).toMatchObject({ service: "cli" });
    });
  });

  it("should resolve service name from /service-name/main.js path", () => {
    withMainModule("/repo/dist/apps/payment/main.js", () => {
      const { module } = loadSharedBaseLoggerModule();

      const logger = module.getOrCreateBaseLogger();

      expect(logger.defaultMeta).toMatchObject({ service: "payment" });
    });
  });

  it("should create only console transport in CI mode", () => {
    withMainModule("/repo/dist/apps/payment/main.js", () => {
      const { module } = loadSharedBaseLoggerModule({
        ci: "true",
        awsRegion: "eu-central-1",
      });

      const logger = module.getOrCreateBaseLogger();

      expect(logger.transports).toHaveLength(1);
      expect(logger.transports[0]?.constructor?.name).toBe("Console");
    });
  });

  it("should enrich base logger format with request context fields", () => {
    withMainModule("/repo/dist/apps/payment/main.js", () => {
      const { module, requestContextGet } = loadSharedBaseLoggerModule({
        requestContext: {
          traceId: "trace-123",
          requestId: "req-123",
          userId: "user-123",
          ip: "127.0.0.1",
        },
      });

      const logger = module.getOrCreateBaseLogger();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transformed = (logger as any).format.transform(
        {
          level: "info",
          message: "hello",
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (logger as any).format.options,
      );

      expect(requestContextGet).toHaveBeenCalled();
      expect(transformed).toMatchObject({
        traceId: "trace-123",
        requestId: "req-123",
        userId: "user-123",
        ip: "127.0.0.1",
      });
    });
  });

  it("should render HTTP REQUEST message in console formatter", () => {
    withMainModule("/repo/dist/apps/payment/main.js", () => {
      const { module } = loadSharedBaseLoggerModule();

      const logger = module.getOrCreateBaseLogger();
      const consoleTransport = getConsoleTransport(logger);

      expect(consoleTransport).toBeDefined();

      const formatted = consoleTransport.format.transform(
        {
          level: "info",
          timestamp: "2026-03-29T10:00:00.000Z",
          ctx: "HttpLogger",
          service: "payment",
          traceId: "trace-1",
          message: {
            msg: "HTTP REQUEST",
            method: "GET",
            url: "/api/v1/test",
            userId: "user-1",
            body: { foo: "bar" },
            query: { q: "1" },
          },
        },
        consoleTransport.format.options,
      );

      const rendered = getRenderedMessage(expectFormattedInfo(formatted));

      expect(rendered).toContain("[payment]");
      expect(rendered).toContain(
        "[GET] :: REQUEST :: /api/v1/test user(user-1)",
      );
      expect(rendered).toContain("body: {");
      expect(rendered).toContain('"foo": "bar"');
      expect(rendered).toContain("query: {");
      expect(rendered).toContain('"q": "1"');
    });
  });

  it("should render default object message branch with duration and serialized payload", () => {
    withMainModule("/repo/dist/apps/payment/main.js", () => {
      const { module } = loadSharedBaseLoggerModule();

      const logger = module.getOrCreateBaseLogger();
      const consoleTransport = getConsoleTransport(logger);

      expect(consoleTransport).toBeDefined();

      const formatted = consoleTransport.format.transform(
        {
          level: "warn",
          timestamp: "2026-03-29T10:00:00.000Z",
          ctx: "AnyCtx",
          service: "payment",
          traceId: "trace-2",
          durationMs: 2500,
          message: {
            msg: "Something happened",
            foo: "bar",
          },
        },
        consoleTransport.format.options,
      );

      const rendered = getRenderedMessage(expectFormattedInfo(formatted));

      expect(rendered).toContain("Something happened");
      expect(rendered).toContain("+2.500s");
      expect(rendered).toContain('"foo": "bar"');
    });
  });
});

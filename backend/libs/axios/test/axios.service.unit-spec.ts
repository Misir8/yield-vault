// libs/axios/test/axios.service.unit-spec.ts
import { InternalAxiosRequestConfig, AxiosHeaders } from "axios";
import axiosRetry from "axios-retry";
import { RequestContext } from "@libs/logger/request-context";
import { AxiosService } from "@libs/axios";

// --- Mocks ---

// Mock AppLogger (cover both possible import paths)
// Use global variable to avoid hoisting issues
declare global {
  // eslint-disable-next-line no-var
  var __axiosTestLoggerMethods: {
    debug: jest.Mock;
    error: jest.Mock;
    warn: jest.Mock;
    log: jest.Mock;
  };
}

jest.mock("@libs/logger/app.logger", () => {
  const loggerMethods = {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    log: jest.fn(),
  };
  global.__axiosTestLoggerMethods = loggerMethods;
  return {
    AppLogger: jest.fn().mockImplementation(() => loggerMethods),
  };
});

// Mock helpers: redactSensitiveData as identity
jest.mock("@libs/helpers", () => ({
  redactSensitiveData: (v: any) => v,
}));

// Mock axios-retry to capture options
jest.mock("axios-retry", () => {
  const fn: any = jest.fn((_instance: any, opts: any) => {
    (fn as any).lastOptions = opts;
  });
  fn.exponentialDelay = (retryCount: number) => Math.pow(2, retryCount) * 100;
  fn.isNetworkOrIdempotentRequestError = jest.fn().mockReturnValue(false);
  return fn;
});

// --- Helpers ---

const makeMockAdapter =
  (
    spy: (cfg: InternalAxiosRequestConfig) => void,
    status = 200,
    data: any = { ok: true },
  ) =>
  async (cfg: InternalAxiosRequestConfig) => {
    spy(cfg);
    return {
      data,
      status,
      statusText: "OK",
      headers: {},
      config: cfg,
      request: {},
    };
  };

const getHeader = (headers: any, name: string) => {
  if (headers && typeof (headers as AxiosHeaders).get === "function") {
    return (headers as AxiosHeaders).get(name);
  }
  const key = Object.keys(headers ?? {}).find(
    (k) => k.toLowerCase() === name.toLowerCase(),
  );
  return key ? headers[key] : undefined;
};

const findLog = (prefix: string) =>
  global.__axiosTestLoggerMethods.debug.mock.calls
    .map((c) => String(c[0]))
    .find((m) => m.startsWith(prefix));

// --- Tests ---

describe("AxiosService (unit)", () => {
  let service: AxiosService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AxiosService(); // defaults: retries=3, timeout=5000, maxLogBodyLength=4000
  });

  it("propagates traceId/requestId/userId/ip for internal target", async () => {
    const instance = service.createInstance({
      baseURL: "http://treasure:8080",
    });
    const cfgSpy = jest.fn();

    await RequestContext.run(
      {
        traceId: "trace-123",
        requestId: "req-456",
        userId: "user-789",
        ip: "1.2.3.4",
      },
      async () => {
        await instance.get("/ping", {
          adapter: makeMockAdapter(cfgSpy),
        } as any);
      },
    );

    const cfg = cfgSpy.mock.calls[0][0] as InternalAxiosRequestConfig;

    expect(cfg.headers instanceof AxiosHeaders).toBe(true);
    expect(getHeader(cfg.headers, "x-trace-id")).toBe("trace-123");
    expect(getHeader(cfg.headers, "x-request-id")).toBe("req-456");
    expect(getHeader(cfg.headers, "x-user-id")).toBe("user-789");
    expect(getHeader(cfg.headers, "x-forwarded-for")).toBe("1.2.3.4");
  });

  it("falls back x-request-id to traceId when requestId is missing (internal target)", async () => {
    const instance = service.createInstance({
      baseURL: "http://treasure:8080",
    });
    const cfgSpy = jest.fn();

    await RequestContext.run({ traceId: "trace-only" }, async () => {
      await instance.get("/ping", { adapter: makeMockAdapter(cfgSpy) } as any);
    });

    const cfg = cfgSpy.mock.calls[0][0] as InternalAxiosRequestConfig;
    expect(getHeader(cfg.headers, "x-trace-id")).toBe("trace-only");
    expect(getHeader(cfg.headers, "x-request-id")).toBe("trace-only"); // fallback
    expect(getHeader(cfg.headers, "x-user-id")).toBeUndefined();
  });

  it("does not overwrite pre-set x-forwarded-for header (internal target)", async () => {
    const instance = service.createInstance({
      baseURL: "http://treasure:8080",
    });
    const cfgSpy = jest.fn();

    await RequestContext.run(
      { traceId: "t", userId: "u", ip: "1.2.3.4" },
      async () => {
        await instance.get("/ping", {
          headers: { "x-forwarded-for": "9.9.9.9" },
          adapter: makeMockAdapter(cfgSpy),
        } as any);
      },
    );

    const cfg = cfgSpy.mock.calls[0][0] as InternalAxiosRequestConfig;

    expect(getHeader(cfg.headers, "x-forwarded-for")).toBe("9.9.9.9"); // preserved
    expect(getHeader(cfg.headers, "x-trace-id")).toBe("t");
    expect(getHeader(cfg.headers, "x-user-id")).toBe("u");
  });

  it("does nothing when RequestContext is absent", async () => {
    const instance = service.createInstance({ baseURL: "http://example.com" });
    const cfgSpy = jest.fn();

    await instance.get("/no-context", {
      adapter: makeMockAdapter(cfgSpy),
    } as any);

    const cfg = cfgSpy.mock.calls[0][0] as InternalAxiosRequestConfig;

    expect(getHeader(cfg.headers, "x-trace-id")).toBeUndefined();
    expect(getHeader(cfg.headers, "x-request-id")).toBeUndefined();
    expect(getHeader(cfg.headers, "x-user-id")).toBeUndefined();
  });

  it('logs joined URL without double slashes (base ends with "/" and url starts with "/")', async () => {
    const instance = service.createInstance({ baseURL: "http://example.com/" });
    await instance.get("/ping", { adapter: makeMockAdapter(() => {}) } as any);

    const reqLog = findLog("Request: GET ");
    expect(reqLog).toBeDefined();
    expect(reqLog).toContain("Request: GET http://example.com/ping"); // no double slash
  });

  it("logs joined URL when baseURL missing trailing slash and url missing leading slash", async () => {
    const instance = service.createInstance({ baseURL: "http://example.com" });
    await instance.get("ping", { adapter: makeMockAdapter(() => {}) } as any);

    const reqLog = findLog("Request: GET ");
    expect(reqLog).toContain("Request: GET http://example.com/ping");
  });

  it("logs baseURL alone when url is empty", async () => {
    const instance = service.createInstance({ baseURL: "http://example.com/" });
    // force empty url (rare, but exercise the joiner)
    await instance.request({
      method: "GET",
      url: "",
      adapter: makeMockAdapter(() => {}),
    } as any);

    const reqLog = findLog("Request: GET ");
    expect(reqLog).toContain("Request: GET http://example.com");
  });

  it('prints "[unserializable]" for circular response payloads', async () => {
    const instance = service.createInstance({ baseURL: "http://example.com" });

    const circular: any = {};
    circular.self = circular;

    await instance.get("/circular", {
      adapter: makeMockAdapter(() => {}, 200, circular),
    } as any);

    const resDataLog = findLog("Response Data: ");
    expect(resDataLog).toBeDefined();
    expect(resDataLog).toContain("Response Data: [unserializable]");
  });

  it("initializes axios-retry with expected defaults and functions", () => {
    service.createInstance(); // triggers setupRetry with default retries=3

    expect((axiosRetry as any).mock.calls.length).toBe(1);
    const [, options] = (axiosRetry as any).mock.calls[0];

    expect(options.retries).toBe(3);
    expect(typeof options.retryDelay).toBe("function");
    expect(typeof options.retryCondition).toBe("function");
    expect(typeof options.onRetry).toBe("function");
  });

  it("strips context headers on external target even if explicitly provided", async () => {
    const instance = service.createInstance({ baseURL: "http://example.com" });
    const cfgSpy = jest.fn();

    await RequestContext.run(
      { traceId: "t-ctx", requestId: "r-ctx", userId: "u-ctx", ip: "1.2.3.4" },
      async () => {
        await instance.get("/ping", {
          headers: {
            "x-trace-id": "t-manual",
            "x-request-id": "r-manual",
            "x-user-id": "u-manual",
            "x-forwarded-for": "9.9.9.9",
          },
          adapter: makeMockAdapter(cfgSpy),
        } as any);
      },
    );

    const cfg = cfgSpy.mock.calls[0][0] as InternalAxiosRequestConfig;

    expect(getHeader(cfg.headers, "x-trace-id")).toBeUndefined();
    expect(getHeader(cfg.headers, "x-request-id")).toBeUndefined();
    expect(getHeader(cfg.headers, "x-user-id")).toBeUndefined();
    expect(getHeader(cfg.headers, "x-forwarded-for")).toBeUndefined();
  });

  it("preserves unrelated custom headers on external target while stripping context headers", async () => {
    const instance = service.createInstance({ baseURL: "http://example.com" });
    const cfgSpy = jest.fn();

    await RequestContext.run(
      { traceId: "t-ctx", userId: "u-ctx", ip: "1.2.3.4" },
      async () => {
        await instance.post("/orders", { x: 1 }, {
          headers: {
            "X-BAPI-API-KEY": "abc123",
            "x-trace-id": "t-manual",
            "x-user-id": "u-manual",
          },
          adapter: makeMockAdapter(cfgSpy),
        } as any);
      },
    );

    const cfg = cfgSpy.mock.calls[0][0] as InternalAxiosRequestConfig;

    // stripped
    expect(getHeader(cfg.headers, "x-trace-id")).toBeUndefined();
    expect(getHeader(cfg.headers, "x-user-id")).toBeUndefined();

    // preserved
    expect(getHeader(cfg.headers, "X-BAPI-API-KEY")).toBe("abc123");
  });

  it('does not propagate even to internal target when contextPropagation = "never"', async () => {
    const instance = service.createInstance({
      baseURL: "http://treasure:8080",
      contextPropagation: "never",
    });
    const cfgSpy = jest.fn();

    await RequestContext.run(
      { traceId: "t-ctx", requestId: "r-ctx", userId: "u-ctx", ip: "1.2.3.4" },
      async () => {
        await instance.get("/ping", {
          headers: {
            "x-forwarded-for": "0.0.0.0", // even if user sets, our code deletes for non-propagation
          },
          adapter: makeMockAdapter(cfgSpy),
        } as any);
      },
    );

    const cfg = cfgSpy.mock.calls[0][0] as InternalAxiosRequestConfig;

    expect(getHeader(cfg.headers, "x-trace-id")).toBeUndefined();
    expect(getHeader(cfg.headers, "x-request-id")).toBeUndefined();
    expect(getHeader(cfg.headers, "x-user-id")).toBeUndefined();
    expect(getHeader(cfg.headers, "x-forwarded-for")).toBeUndefined();
  });

  it("does not propagate when baseURL is external FQDN with allowed port (defense-in-depth)", async () => {
    // Even if someone uses port 8080 on a public FQDN, we should NOT propagate.
    const instance = service.createInstance({
      baseURL: "http://public.example.com:8080",
    });
    const cfgSpy = jest.fn();

    await RequestContext.run(
      { traceId: "t-ctx", userId: "u-ctx", ip: "1.2.3.4" },
      async () => {
        await instance.get("/ping", {
          adapter: makeMockAdapter(cfgSpy),
        } as any);
      },
    );

    const cfg = cfgSpy.mock.calls[0][0] as InternalAxiosRequestConfig;

    expect(getHeader(cfg.headers, "x-trace-id")).toBeUndefined();
    expect(getHeader(cfg.headers, "x-user-id")).toBeUndefined();
    expect(getHeader(cfg.headers, "x-forwarded-for")).toBeUndefined();
  });
});

// libs/logger/test/logging.interceptor.unit-spec.ts
import { CallHandler, ExecutionContext, HttpException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import { Request, Response } from "express";
import { lastValueFrom, of, throwError } from "rxjs";

import { AppLogger } from "@libs/logger/app.logger";
import { LoggingInterceptor } from "@libs/logger/logging.interceptor";

describe("LoggingInterceptor (unit)", () => {
  let testingModule: TestingModule;
  let interceptor: LoggingInterceptor;
  let reflector: Reflector;
  let logger: AppLogger;

  beforeEach(async () => {
    testingModule = await Test.createTestingModule({
      providers: [
        LoggingInterceptor,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    interceptor = testingModule.get<LoggingInterceptor>(LoggingInterceptor);
    reflector = testingModule.get<Reflector>(Reflector);
    logger = (interceptor as unknown as { logger: AppLogger }).logger;

    jest.spyOn(logger, "debug").mockImplementation(() => {});
    jest.spyOn(logger, "error").mockImplementation(() => {});
  });

  afterEach(async () => {
    await testingModule.close();
    jest.clearAllMocks();
  });

  /**
   * Builds a minimal ExecutionContext mock for HTTP that provides both request and response.
   *
   * @param {object} [options] Mock options.
   * @returns {{ ctx: ExecutionContext; res: Response }} Mocked execution context and response.
   */
  const mockExecutionContext = (options?: {
    skipLogging?: boolean;
    user?: unknown;
    body?: unknown;
    query?: Record<string, unknown>;
    headers?: Record<string, string>;
    method?: string;
    url?: string;
    statusCode?: number;
  }): { ctx: ExecutionContext; res: Response } => {
    const {
      skipLogging = false,
      user = null,
      body = {},
      query = {},
      headers = {},
      method = "POST",
      url = "/test",
      statusCode = 200,
    } = options || {};

    const req = {
      user,
      body,
      method,
      originalUrl: url,
      query,
      headers,
      route: { path: url },
      params: {},
      ip: "127.0.0.1",
    } as unknown as Request;

    const res = {
      setHeader: jest.fn(),
      statusCode,
    } as unknown as Response;

    const ctx = {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
      getArgByIndex: (_: number) => req,
    } as unknown as ExecutionContext;

    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(skipLogging);

    return { ctx, res };
  };

  /**
   * Creates a successful CallHandler mock.
   *
   * @param {unknown} [response] Response payload.
   * @returns {CallHandler} Mocked call handler.
   */
  const mockCallHandler = (response?: unknown): CallHandler => ({
    handle: () => of(response),
  });

  /**
   * Creates a failing CallHandler mock.
   *
   * @param {Error} error Error to throw.
   * @returns {CallHandler} Mocked call handler.
   */
  const mockErrorCallHandler = (error: Error): CallHandler => ({
    handle: () => throwError(() => error),
  });

  it("should be defined", () => {
    expect(interceptor).toBeDefined();
  });

  it("should skip logging when SKIP_LOGGING_KEY is true", async () => {
    const { ctx } = mockExecutionContext({ skipLogging: true });
    const handler = mockCallHandler({ test: "value" });

    const result = await lastValueFrom(interceptor.intercept(ctx, handler));

    expect(result).toEqual({ test: "value" });
    expect(logger.debug).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("should set trace/request headers on response", async () => {
    const { ctx, res } = mockExecutionContext({
      skipLogging: false,
      user: { userId: "user123" },
      body: { test: "data" },
      method: "POST",
      url: "/test",
      statusCode: 201,
    });
    const handler = mockCallHandler({ ok: true });

    await lastValueFrom(interceptor.intercept(ctx, handler));

    const calls = (res.setHeader as jest.Mock).mock.calls;
    expect(calls).toHaveLength(2);

    const headers = calls.reduce<Record<string, string>>(
      (acc, [key, value]) => {
        acc[key] = value;
        return acc;
      },
      {},
    );

    expect(headers["x-trace-id"]).toBeTruthy();
    expect(headers["x-request-id"]).toBeTruthy();
    expect(headers["x-trace-id"]).toBe(headers["x-request-id"]);
  });

  it("should log request and response when SKIP_LOGGING_KEY is false", async () => {
    const { ctx } = mockExecutionContext({
      skipLogging: false,
      user: { userId: "user123" },
      body: { test: "data" },
      method: "POST",
      url: "/test",
      statusCode: 201,
    });
    const handler = mockCallHandler({ result: "success" });

    const result = await lastValueFrom(interceptor.intercept(ctx, handler));
    expect(result).toEqual({ result: "success" });

    expect(logger.debug).toHaveBeenCalledTimes(2);

    const [requestCall, okCall] = (logger.debug as jest.Mock).mock.calls;

    expect(requestCall[0]).toEqual(
      expect.objectContaining({
        msg: "HTTP REQUEST",
        method: "POST",
        url: "/test",
        userId: "user123",
        body: { test: "data" },
        query: {},
      }),
    );

    expect(okCall[0]).toEqual(
      expect.objectContaining({
        msg: "HTTP OK",
        method: "POST",
        url: "/test",
        userId: "user123",
        status: 201,
        ms: expect.any(Number),
      }),
    );
  });

  it("should redact password from request body", async () => {
    const { ctx } = mockExecutionContext({
      skipLogging: false,
      user: null,
      body: { password: "secret", data: "test" },
    });
    const handler = mockCallHandler({ result: "success" });

    await lastValueFrom(interceptor.intercept(ctx, handler));

    const firstDebugArg = (logger.debug as jest.Mock).mock.calls[0][0];
    expect(firstDebugArg).toEqual(
      expect.objectContaining({
        msg: "HTTP REQUEST",
        body: expect.objectContaining({ password: "***", data: "test" }),
      }),
    );
  });

  it("should handle and log errors", async () => {
    const error = new Error("Test error");
    const { ctx } = mockExecutionContext({ skipLogging: false });
    const handler = mockErrorCallHandler(error);

    await expect(
      lastValueFrom(interceptor.intercept(ctx, handler)),
    ).rejects.toThrow("Test error");

    expect(logger.debug).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);

    const [errObj, errStack] = (logger.error as jest.Mock).mock.calls[0];

    expect(errObj).toEqual(
      expect.objectContaining({
        msg: "HTTP ERROR",
        method: "POST",
        url: "/test",
        status: 500,
        ms: expect.any(Number),
        details: "Test error",
      }),
    );
    expect(typeof errStack === "string" || errStack == null).toBeTruthy();
  });

  it("should handle array body", async () => {
    const { ctx } = mockExecutionContext({
      skipLogging: false,
      body: [{ test: "data1" }, { test: "data2" }],
    });
    const handler = mockCallHandler({ result: "success" });

    await lastValueFrom(interceptor.intercept(ctx, handler));

    const firstDebugArg = (logger.debug as jest.Mock).mock.calls[0][0];
    expect(firstDebugArg).toEqual(
      expect.objectContaining({
        msg: "HTTP REQUEST",
        body: [{ test: "data1" }, { test: "data2" }],
      }),
    );
  });

  it("should echo incoming x-trace-id if provided", async () => {
    const { ctx, res } = mockExecutionContext({
      headers: { "x-trace-id": "trace-abc" },
    });
    const handler = mockCallHandler({ ok: true });

    await lastValueFrom(interceptor.intercept(ctx, handler));

    const pairs = (res.setHeader as jest.Mock).mock.calls.reduce<
      Record<string, string>
    >((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});

    expect(pairs["x-trace-id"]).toBe("trace-abc");
    expect(pairs["x-request-id"]).toBe("trace-abc");
  });

  it("should reuse x-request-id when x-trace-id is absent", async () => {
    const { ctx, res } = mockExecutionContext({
      headers: { "x-request-id": "req-123" },
    });
    const handler = mockCallHandler({ ok: true });

    await lastValueFrom(interceptor.intercept(ctx, handler));

    const pairs = (res.setHeader as jest.Mock).mock.calls.reduce<
      Record<string, string>
    >((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});

    expect(pairs["x-trace-id"]).toBe("req-123");
    expect(pairs["x-request-id"]).toBe("req-123");
  });

  it("should still set headers even when logging is skipped", async () => {
    const { ctx, res } = mockExecutionContext({ skipLogging: true });
    const handler = mockCallHandler({ ok: true });

    const result = await lastValueFrom(interceptor.intercept(ctx, handler));
    expect(result).toEqual({ ok: true });

    expect((res.setHeader as jest.Mock).mock.calls.length).toBe(2);
  });

  it("should resolve userId from x-user-id header when req.user is absent", async () => {
    const { ctx } = mockExecutionContext({
      headers: { "x-user-id": "user-from-header" },
      user: null,
    });
    const handler = mockCallHandler({ ok: true });

    await lastValueFrom(interceptor.intercept(ctx, handler));

    const [requestCall, okCall] = (logger.debug as jest.Mock).mock.calls;

    expect(requestCall[0]).toEqual(
      expect.objectContaining({
        msg: "HTTP REQUEST",
        userId: "user-from-header",
      }),
    );
    expect(okCall[0]).toEqual(
      expect.objectContaining({
        msg: "HTTP OK",
        userId: "user-from-header",
      }),
    );
  });

  it("should log HttpException status and message in ERROR object", async () => {
    const httpError = new HttpException("Not Found", 404);
    const { ctx } = mockExecutionContext({
      method: "GET",
      url: "/missing",
    });
    const handler = mockErrorCallHandler(httpError);

    await expect(
      lastValueFrom(interceptor.intercept(ctx, handler)),
    ).rejects.toThrow("Not Found");

    const [errObj] = (logger.error as jest.Mock).mock.calls[0];
    expect(errObj).toEqual(
      expect.objectContaining({
        msg: "HTTP ERROR",
        method: "GET",
        url: "/missing",
        status: 404,
        ms: expect.any(Number),
        details: "Not Found",
      }),
    );
  });

  it("should include query in HTTP REQUEST log", async () => {
    const { ctx } = mockExecutionContext({
      method: "GET",
      url: "/with-query",
      query: { kycApplicantId: "12222" },
    });
    const handler = mockCallHandler({ ok: true });

    await lastValueFrom(interceptor.intercept(ctx, handler));

    const [requestCall] = (logger.debug as jest.Mock).mock.calls;
    expect(requestCall[0]).toEqual(
      expect.objectContaining({
        msg: "HTTP REQUEST",
        method: "GET",
        url: "/with-query",
        query: { kycApplicantId: "12222" },
      }),
    );
  });

  it("should handle undefined body gracefully and log {}", async () => {
    const { ctx } = mockExecutionContext({
      body: undefined,
      method: "POST",
      url: "/no-body",
    });
    const handler = mockCallHandler({ ok: true });

    await lastValueFrom(interceptor.intercept(ctx, handler));

    const [requestCall] = (logger.debug as jest.Mock).mock.calls;
    expect(requestCall[0]).toEqual(
      expect.objectContaining({
        msg: "HTTP REQUEST",
        body: {},
      }),
    );
  });

  it("should truncate large request body in HTTP REQUEST log", async () => {
    const contacts = Array.from({ length: 500 }, (_, index) => ({
      firstName: `User-${index}`,
      phone: `+380${String(index).padStart(9, "0")}`,
      password: `secret-${index}`,
      note: "x".repeat(400),
    }));

    const { ctx } = mockExecutionContext({
      skipLogging: false,
      body: { contacts },
      method: "POST",
      url: "/api/v1/customer/contacts",
    });
    const handler = mockCallHandler({ ok: true });

    await lastValueFrom(interceptor.intercept(ctx, handler));

    const requestLog = (logger.debug as jest.Mock).mock.calls[0][0];
    expect(requestLog).toEqual(
      expect.objectContaining({
        msg: "HTTP REQUEST",
        body: expect.objectContaining({
          __logSummary: expect.objectContaining({ truncated: true }),
          preview: expect.any(Object),
        }),
      }),
    );
  });

  it("should keep sensitive fields redacted in truncated request preview", async () => {
    const contacts = Array.from({ length: 500 }, (_, index) => ({
      firstName: `User-${index}`,
      password: `secret-${index}`,
      cardNumber: "1234567890123456",
      note: "x".repeat(400),
    }));

    const { ctx } = mockExecutionContext({
      skipLogging: false,
      body: { contacts },
      method: "POST",
      url: "/api/v1/customer/contacts",
    });
    const handler = mockCallHandler({ ok: true });

    await lastValueFrom(interceptor.intercept(ctx, handler));

    const requestLog = (logger.debug as jest.Mock).mock.calls[0][0] as {
      body: {
        preview: {
          contacts: Array<Record<string, unknown>>;
        };
      };
    };

    const previewContacts = requestLog.body.preview.contacts;
    expect(previewContacts[0]).toEqual(
      expect.objectContaining({
        password: "***",
        cardNumber: "*** 3456",
      }),
    );
  });

  it("should omit multipart body from HTTP REQUEST log", async () => {
    const { ctx } = mockExecutionContext({
      skipLogging: false,
      headers: { "content-type": "multipart/form-data; boundary=----test" },
      body: { file: "x".repeat(100_000) },
      method: "POST",
      url: "/upload",
    });
    const handler = mockCallHandler({ ok: true });

    await lastValueFrom(interceptor.intercept(ctx, handler));

    const requestLog = (logger.debug as jest.Mock).mock.calls[0][0];
    expect(requestLog).toEqual(
      expect.objectContaining({
        msg: "HTTP REQUEST",
        body: expect.objectContaining({
          __logSummary: expect.objectContaining({
            omitted: true,
            reason: "unsupported-content-type",
          }),
        }),
      }),
    );
  });

  it("should truncate large query payload in HTTP REQUEST log", async () => {
    const { ctx } = mockExecutionContext({
      skipLogging: false,
      method: "GET",
      url: "/users",
      query: { search: "x".repeat(20_000) },
    });
    const handler = mockCallHandler({ ok: true });

    await lastValueFrom(interceptor.intercept(ctx, handler));

    const requestLog = (logger.debug as jest.Mock).mock.calls[0][0];
    expect(requestLog).toEqual(
      expect.objectContaining({
        msg: "HTTP REQUEST",
        query: expect.objectContaining({
          __logSummary: expect.objectContaining({ truncated: true }),
        }),
      }),
    );
  });

  it("should truncate large HTTP ERROR details", async () => {
    const error = Object.assign(new Error("Validation failed"), {
      details: [
        {
          field: "contacts",
          message: "x".repeat(50_000),
        },
      ],
    });

    const { ctx } = mockExecutionContext({
      skipLogging: false,
      method: "POST",
      url: "/api/v1/customer/contacts",
    });
    const handler = mockErrorCallHandler(error);

    await expect(
      lastValueFrom(interceptor.intercept(ctx, handler)),
    ).rejects.toThrow("Validation failed");

    const [errObj] = (logger.error as jest.Mock).mock.calls[0];
    expect(errObj).toEqual(
      expect.objectContaining({
        msg: "HTTP ERROR",
        details: expect.objectContaining({
          __logSummary: expect.objectContaining({ truncated: true }),
        }),
      }),
    );
  });
});

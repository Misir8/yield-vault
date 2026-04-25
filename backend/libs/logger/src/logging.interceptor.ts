import { randomUUID } from "node:crypto";

import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request, Response } from "express";
import { Observable, throwError } from "rxjs";
import { catchError, tap } from "rxjs/operators";

import { IAbstractError } from "@libs/exceptions/errors";
import { RequestContext } from "@libs/logger/request-context";

import { AppLogger } from "./app.logger";
import { SKIP_LOGGING_KEY } from "./skip-logging.decorator";

// Extend Express Request type to include optional user property
declare module "express" {
  interface Request {
    user?: {
      userId?: string;
      id?: string;
      sub?: string;
      username?: string;
      [key: string]: any;
    };
  }
}

type HttpLogSanitizePreset = {
  maxApproxBytes: number;
  maxDepth: number;
  maxArrayItems: number;
  maxObjectKeys: number;
  maxStringLength: number;
};

export const HDR_TRACE_ID = "x-trace-id";
export const HDR_REQUEST_ID = "x-request-id";

const HTTP_LOG_BODY_SANITIZE_PRESET: HttpLogSanitizePreset = {
  maxApproxBytes: 32 * 1024,
  maxDepth: 4,
  maxArrayItems: 20,
  maxObjectKeys: 50,
  maxStringLength: 1000,
};

const HTTP_LOG_QUERY_SANITIZE_PRESET: HttpLogSanitizePreset = {
  maxApproxBytes: 4 * 1024,
  maxDepth: 3,
  maxArrayItems: 10,
  maxObjectKeys: 20,
  maxStringLength: 500,
};

const HTTP_LOG_ERROR_DETAILS_SANITIZE_PRESET: HttpLogSanitizePreset = {
  maxApproxBytes: 8 * 1024,
  maxDepth: 4,
  maxArrayItems: 10,
  maxObjectKeys: 20,
  maxStringLength: 500,
};

/**
 * Simple sanitization function for HTTP log payloads
 */
function sanitizeHttpLogPayload(
  payload: any,
  preset: HttpLogSanitizePreset,
): any {
  if (payload === null || payload === undefined) return payload;

  const seen = new WeakSet();

  function sanitize(value: any, depth: number): any {
    if (depth > preset.maxDepth) return "[max depth reached]";

    if (value === null || value === undefined) return value;

    if (typeof value === "string") {
      return value.length > preset.maxStringLength
        ? value.substring(0, preset.maxStringLength) + "...[truncated]"
        : value;
    }

    if (typeof value === "number" || typeof value === "boolean") return value;

    if (Array.isArray(value)) {
      if (value.length > preset.maxArrayItems) {
        return [
          ...value
            .slice(0, preset.maxArrayItems)
            .map((item) => sanitize(item, depth + 1)),
          `...[${value.length - preset.maxArrayItems} more items]`,
        ];
      }
      return value.map((item) => sanitize(item, depth + 1));
    }

    if (typeof value === "object") {
      if (seen.has(value)) return "[circular reference]";
      seen.add(value);

      const keys = Object.keys(value);
      if (keys.length > preset.maxObjectKeys) {
        const result: any = {};
        keys.slice(0, preset.maxObjectKeys).forEach((key) => {
          result[key] = sanitize(value[key], depth + 1);
        });
        result["__truncated"] =
          `${keys.length - preset.maxObjectKeys} more keys`;
        return result;
      }

      const result: any = {};
      keys.forEach((key) => {
        result[key] = sanitize(value[key], depth + 1);
      });
      return result;
    }

    return String(value);
  }

  return sanitize(payload, 0);
}

/**
 * NestJS interceptor that:
 * - establishes an AsyncLocalStorage request context (traceId, requestId, userId, ip),
 * - writes structured "HTTP REQUEST/OK/ERROR" logs,
 * - mirrors request identifiers back to the client via response headers.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  /** Internal logger bound to the interceptor context. */
  private readonly logger = new AppLogger("logging.interceptor");

  /**
   * @param {Reflector} reflector - NestJS reflector to read route-level metadata (e.g., SKIP_LOGGING_KEY).
   */
  constructor(private readonly reflector: Reflector) {}

  /**
   * Returns a normalized single header value.
   *
   * @param {Request} req Express request object.
   * @param {string} headerName Header name.
   * @returns {string} Header value or empty string.
   */
  private getHeaderValue(req: Request, headerName: string): string {
    const raw = req.headers[headerName];
    if (Array.isArray(raw)) {
      return raw[0] ?? "";
    }

    return typeof raw === "string" ? raw : "";
  }

  /**
   * Detects content types that should never be logged as JSON body.
   *
   * @param {Request} req Express request object.
   * @returns {boolean} True for multipart/binary payloads.
   */
  private shouldOmitBody(req: Request): boolean {
    const contentType = this.getHeaderValue(req, "content-type").toLowerCase();

    return (
      contentType.includes("multipart/form-data") ||
      contentType.includes("application/octet-stream")
    );
  }

  /**
   * Builds a safe request body payload for HTTP logs.
   *
   * @param {Request} req Express request object.
   * @returns {unknown} Safe body log payload.
   */
  private buildSafeRequestBody(req: Request): unknown {
    if (this.shouldOmitBody(req)) {
      const contentType = this.getHeaderValue(req, "content-type") || undefined;

      return {
        __logSummary: {
          omitted: true,
          reason: "unsupported-content-type",
          contentType,
        },
      };
    }

    return sanitizeHttpLogPayload(
      req.body ?? {},
      HTTP_LOG_BODY_SANITIZE_PRESET,
    );
  }

  /**
   * Builds a safe request query payload for HTTP logs.
   *
   * @param {Request} req Express request object.
   * @returns {unknown} Safe query log payload.
   */
  private buildSafeRequestQuery(req: Request): unknown {
    return sanitizeHttpLogPayload(
      req.query ?? {},
      HTTP_LOG_QUERY_SANITIZE_PRESET,
    );
  }

  /**
   * Builds safe HTTP error details payload.
   *
   * @param {unknown} details Raw error details.
   * @returns {unknown} Safe details payload.
   */
  private buildSafeErrorDetails(details: unknown): unknown {
    return sanitizeHttpLogPayload(
      details,
      HTTP_LOG_ERROR_DETAILS_SANITIZE_PRESET,
    );
  }

  /**
   * Type guard for our abstract error shape that carries `details`.
   *
   * @param {unknown} object Error-like object.
   * @returns {object is IAbstractError} True if the object has `details` field.
   */
  private instanceOfAbstractError(object: unknown): object is IAbstractError {
    return (
      typeof object === "object" &&
      object !== null &&
      Array.isArray((object as { details?: unknown }).details)
    );
  }

  /**
   * Resolve a user identifier from request headers or JWT payload.
   * Simplified version without Cognito dependency.
   *
   * @param {Request} req Express request object.
   * @returns {string | undefined} User id if available, otherwise undefined.
   */
  private resolveUserId(req: Request): string | undefined {
    // Check x-user-id header
    if (typeof req.headers["x-user-id"] === "string") {
      return req.headers["x-user-id"];
    }

    // Check if user object exists (set by auth middleware)
    if (req.user) {
      return (
        req.user.userId || req.user.id || req.user.sub || req.user.username
      );
    }

    return undefined;
  }

  /**
   * Ensure `userId` is present in the ALS store; returns the best-known value.
   *
   * @param {Request} req Express request object.
   * @returns {string | null} User id or null if not resolvable.
   */
  private ensureUserId(req: Request): string | null {
    const current = RequestContext.get()?.userId;
    if (typeof current === "string" && current.length > 0) return current;

    const resolved = this.resolveUserId(req) ?? null;
    if (resolved) RequestContext.set({ userId: resolved });

    return resolved;
  }

  /**
   * Main interceptor hook. Establishes context, logs REQUEST/OK/ERROR, and mirrors ids in headers.
   *
   * @param {ExecutionContext} context NestJS execution context.
   * @param {CallHandler} next Next handler in the pipeline.
   * @returns {Observable<any>} Stream of the handler result.
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_LOGGING_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const incomingTrace =
      this.getHeaderValue(req, HDR_TRACE_ID) ||
      this.getHeaderValue(req, HDR_REQUEST_ID) ||
      randomUUID();

    res.setHeader(HDR_TRACE_ID, incomingTrace);
    res.setHeader(HDR_REQUEST_ID, incomingTrace);

    const xff = this.getHeaderValue(req, "x-forwarded-for");
    const forwardedIp = xff.split(",")[0]?.trim() || undefined;
    const initialUserId = this.resolveUserId(req) ?? undefined;

    RequestContext.enter({
      traceId: incomingTrace,
      requestId: incomingTrace,
      userId: initialUserId,
      ip: forwardedIp || req.ip,
      path: req.route?.path,
      method: req.method,
    });

    if (skip) {
      return next.handle();
    }

    const startedAt = Date.now();
    const url = req.originalUrl;
    const body = this.buildSafeRequestBody(req);
    const query = this.buildSafeRequestQuery(req);

    try {
      const userId = this.ensureUserId(req);

      this.logger.debug({
        msg: "HTTP REQUEST",
        method: req.method,
        url,
        userId: userId ?? null,
        body,
        query,
      });
    } catch {
      /* ignore */
    }

    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - startedAt;
        const userId = this.ensureUserId(req);

        this.logger.debug({
          msg: "HTTP OK",
          method: req.method,
          url,
          userId,
          status: res.statusCode,
          ms,
        });
      }),
      catchError((error: Error | HttpException) => {
        const ms = Date.now() - startedAt;
        const status = error instanceof HttpException ? error.getStatus() : 500;
        const rawDetails = this.instanceOfAbstractError(error)
          ? error.details
          : error.message;
        const details = this.buildSafeErrorDetails(rawDetails);
        const userId = this.ensureUserId(req);

        this.logger.error(
          {
            msg: "HTTP ERROR",
            method: req.method,
            url,
            userId,
            status,
            ms,
            details,
          },
          error?.stack,
        );

        return throwError(() => error);
      }),
    );
  }
}

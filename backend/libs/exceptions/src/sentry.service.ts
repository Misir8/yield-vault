// libs/exceptions/src/sentry.service.ts
import { randomBytes } from "node:crypto";

import { Injectable } from "@nestjs/common";
import {
  captureException,
  captureMessage,
  init,
  setTag,
  withScope,
} from "@sentry/nestjs";

import { SENTRY } from "config";

import { AppLogger } from "@libs/logger/app.logger";
import { RequestContext } from "@libs/logger/request-context";

export const SENTRY_TOKEN = "SENTRY_TOKEN";

/**
 * ALS-like context shape used for enriching Sentry events.
 */
type AlsContext = {
  traceId?: string;
  spanId?: string;
  userId?: string | number;
};

/**
 * @class SentryService
 * @description
 * Thin wrapper around Sentry SDK that:
 *  - Initializes Sentry (DSN, serverName)
 *  - Adds a per-process "process" tag
 *  - Enriches every `error()` / `message()` call with ALS-based trace/user data:
 *      * tag: x-trace-id
 *      * tag: x-user-id (when present)
 *      * context: trace { trace_id, span_id, op }
 *    This prevents Sentry from generating its own trace_id and keeps your trace coherent.
 */
@Injectable()
export class SentryService {
  private installed = false;
  private readonly logger = new AppLogger(SentryService.name);
  private readonly serverName: string = "";

  /**
   * @constructor
   * @param {string} serverName - Identifier of the running process (put into Sentry serverName/tag).
   */
  constructor(serverName: string) {
    this.serverName = serverName;

    if (!SENTRY?.ENABLED) {
      this.logger.warn("Sentry is disabled");
      return;
    }

    this.install();
  }

  /**
   * Initialize Sentry SDK once for the process.
   * @private
   * @returns {void}
   */
  private install(): void {
    // Guard: do not init without DSN
    if (!SENTRY.DSN) {
      this.logger.warn("Sentry DSN is not configured - Sentry disabled");
      return;
    }

    init({
      dsn: SENTRY.DSN,
      serverName: this.serverName,
      beforeSend: (event) => {
        // Prefix exception types with server name for easier debugging
        if (event?.exception?.values) {
          event.exception.values.forEach((v) => {
            v.type = `[${this.serverName}] ${v.type}`;
          });
        }

        // Safe merge of tags + keep process tag
        event.tags = { ...(event.tags || {}), process: this.serverName };
        return event;
      },
    });

    // historical global tag (kept to preserve existing alert formatting)
    setTag("process", this.serverName);
    this.installed = true;
    this.logger.log("Sentry installed successfully");
  }

  /**
   * Report a warning-level message to Sentry and logs.
   * @param {string} message - Text to be captured at "warning" level.
   * @returns {void}
   */
  public warning(message: string): void {
    if (!this.installed) return;

    this.withAls(() => {
      captureMessage(message, "warning");
    }, "log");
  }

  /**
   * Report an info-level message to Sentry and logs.
   * @param {string} message - Text to be captured at "info" level.
   * @returns {void}
   */
  public message(message: string): void {
    if (!this.installed) return;
    this.withAls(() => {
      // Keep Sentry v7 signature compatibility: message + level
      captureMessage(message, "info");
    }, "log");
  }

  /**
   * Report an Error to Sentry and logs. Keeps original error instance.
   * @param {T} error - Error instance to capture.
   * @param {any} [extra] - Optional extra object attached to the event.
   * @param {any} [fingerprint] - Optional fingerprint
   * @returns {Error} The same error instance (for chaining/throwing).
   */
  public error<T extends Error>(
    error: T,
    extra?: any,
    fingerprint?: string[],
  ): T {
    const errorMessage = error.stack || error.message || "Unknown error";
    this.logger.error(errorMessage);
    if (!this.installed) return error;

    this.withAls(() => {
      // captureException accepts a capture context with extra/fingerprint
      captureException(error, {
        extra,
        fingerprint: fingerprint?.length ? fingerprint : undefined,
      });
    }, "error");

    return error;
  }

  /**
   * Extract ALS context (traceId, userId, spanId) in a type-safe way.
   * Uses optional chaining to avoid TS/ESLint complaints.
   * @private
   * @returns {AlsContext} Current ALS context or empty object.
   */
  private getAls(): AlsContext {
    const ctx = (RequestContext as any)?.get?.();
    const traceId = ctx?.traceId as string | undefined;
    const spanId = ctx?.spanId as string | undefined;
    const userId = ctx?.userId as string | number | undefined;
    return { traceId, spanId, userId };
  }

  /**
   * Execute a function within a Sentry scope enriched by ALS (if available).
   * - Sets tags: x-trace-id, x-user-id
   * - Sets trace context: { trace_id, span_id, op }
   * @private
   * @param {(als: AlsContext) => void} fn - Callback that performs captureMessage/Exception under the prepared scope.
   * @param {'error' | 'log'} op - Operation name for Sentry trace context (helps distinguish error/log).
   * @returns {void}
   */
  private withAls(fn: (als: AlsContext) => void, op: "error" | "log"): void {
    withScope((scope) => {
      const als = this.getAls();

      if (als.traceId) {
        // mandatory tags for Slack alerts & filtering
        scope.setTag("x-trace-id", als.traceId);
        // spanId from ALS or generate once per scope
        const spanId = als.spanId ?? randomBytes(8).toString("hex");
        scope.setContext("trace", {
          trace_id: als.traceId,
          span_id: spanId,
          op,
        });
      }

      if (als.userId != null) {
        const uid = String(als.userId);
        scope.setUser({ id: uid });
        scope.setTag("x-user-id", uid);
      }

      fn(als);
    });
  }
}

export const sentryService = new SentryService("singleton");

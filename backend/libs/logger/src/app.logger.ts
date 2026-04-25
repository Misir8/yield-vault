// libs/logger/src/app.logger.ts
import { LoggerService } from "@nestjs/common";
import { Logger } from "winston";

import { getOrCreateBaseLogger } from "./shared-base-logger";

/**
 * Allowed log message payloads.
 */
type Loggable = string | number | object;

/**
 * Application-wide logger that:
 * - injects request context (traceId/requestId/userId/ip) into every record,
 * - prints compact, colorized console output for humans,
 * - writes structured JSON to file and CloudWatch for machines.
 *
 * Uses a shared base logger (singleton per process) to avoid memory leak:
 * previously each AppLogger created its own CloudWatch transport (AWS client + setInterval),
 * leading to 200+ clients and intervals per app.
 */
export class AppLogger implements LoggerService {
  /** Child logger with context (shares transports with base logger). */
  private readonly logger: Logger;

  /**
   * Create a new AppLogger bound to a logical context (e.g., class or module name).
   *
   * @param {string} ctx - Context label to include in every log (e.g., "UserService" or "logging.interceptor").
   */
  constructor(private readonly ctx: string) {
    const base = getOrCreateBaseLogger();
    this.logger = base.child({ ctx });
  }

  /**
   * Log at "info" level.
   *
   * @param {Loggable} message - Log message or object.
   * @returns {void}
   */
  log(message: Loggable): void {
    this.logger.info(this.formatMessage(message));
  }

  /**
   * Log at "error" level, optionally attaching a stack trace.
   *
   * @param {Loggable} message - Log message or object.
   * @param {string} [trace] - Optional stack trace string.
   * @returns {void}
   */
  error(message: Loggable, trace?: string): void {
    const base = this.formatMessage(message);

    if (typeof trace === "string" && trace.trim().length > 0) {
      this.logger.error({ ...base, trace });
      return;
    }
    this.logger.error(base);
  }

  /**
   * Log at "warn" level.
   *
   * @param {Loggable} message - Log message or object.
   * @returns {void}
   */
  warn(message: Loggable): void {
    this.logger.warn(this.formatMessage(message));
  }

  /**
   * Log at "debug" level.
   *
   * @param {Loggable} message - Log message or object.
   * @returns {void}
   */
  debug(message: Loggable): void {
    this.logger.debug(this.formatMessage(message));
  }

  /**
   * Log at "verbose" level.
   *
   * @param {Loggable} message - Log message or object.
   * @returns {void}
   */
  verbose(message: Loggable): void {
    this.logger.verbose(this.formatMessage(message));
  }

  /**
   * Normalize non-object messages into an object with a "msg" field.
   *
   * @param {Loggable} message - Input message (string/number/object).
   * @returns {object} Message guaranteed to be an object.
   */
  private formatMessage(message: Loggable): object {
    return typeof message !== "object" ? { msg: message } : message;
  }
}

// libs/exceptions/src/filters/http-exception.filter.ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
} from "@nestjs/common";
import { ThrottlerException } from "@nestjs/throttler";
import { isObject } from "class-validator";
import { Response } from "express";

import { INTERNAL_SERVER_ERROR } from "@libs/constants/errors";
import { AppLogger } from "@libs/logger";

import {
  ErrorDetail,
  IAbstractError,
  InternalServerError,
  TooManyRequestsError,
} from "../errors";
import { SENTRY_TOKEN, SentryService } from "../sentry.service";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger: AppLogger = new AppLogger(HttpExceptionFilter.name);

  constructor(
    @Inject(SENTRY_TOKEN) private readonly sentryService: SentryService,
  ) {}
  catch(exception: unknown, host: ArgumentsHost): void {
    const type = host.getType();
    const isAlreadyReported = (exception as any)._skipSentry === true;

    if (type === "http") {
      const ctx = host.switchToHttp();
      const response: Response = ctx.getResponse();

      if (exception instanceof ThrottlerException) {
        response
          .status(HttpStatus.TOO_MANY_REQUESTS)
          .json({
            status: HttpStatus.TOO_MANY_REQUESTS,
            errors: new TooManyRequestsError().details,
          });
        return;
      }

      if (exception instanceof HttpException) {
        const status = exception?.getStatus();

        if (status >= 500) {
          this.sentryService.error(exception);
        }

        if (status >= 400 && status < 502) {
          const errors: ErrorDetail[] = this.instanceOfAbstractError(exception)
            ? exception.details
            : [{ field: "", message: exception.message }];
          response.status(status).json({ status, errors });
          return;
        }
        if (status === 503) {
          response.status(status).json(exception.getResponse());
          return;
        }
      }

      const err =
        exception instanceof Error
          ? exception
          : new Error(
              isObject(exception) && "message" in exception
                ? (exception as any).message
                : String(exception),
            );
      if (!isAlreadyReported) this.sentryService.error(err);
      response
        .status(500)
        .json({
          status: 500,
          errors: [{ field: "", message: INTERNAL_SERVER_ERROR }],
        });
      return;
    }
    let error: Error | ErrorDetail;

    if (exception instanceof InternalServerError) {
      error = exception.details[0];
    } else {
      error =
        exception instanceof Error
          ? exception
          : new Error(
              isObject(exception) && "message" in exception
                ? (exception as any).message
                : String(exception),
            );
    }
    this.logger.error(error.message);
    if (!isAlreadyReported) this.sentryService.error(error as Error);
  }

  private instanceOfAbstractError(object: any): object is IAbstractError {
    return (
      typeof object === "object" &&
      object !== null &&
      Array.isArray((object as any).details)
    );
  }
}

import axios from "axios";

import { INTERNAL_SERVER_ERROR } from "@libs/constants/errors";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  NotAcceptableError,
  TooManyRequestsError,
  UnauthorizedError,
  UnprocessableEntityError,
} from "@libs/exceptions/errors";
import { AppLogger } from "@libs/logger";

export abstract class ApiErrorHandler {
  protected readonly logger = new AppLogger(this.constructor.name);

  protected async callAndCatch<T>(
    name: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      return this.handleError(name, err);
    }
  }

  protected handleError(name: string, err: unknown): never {
    if (axios.isAxiosError(err)) {
      this.logger.error(
        `${name}: , ${err.message}, ${JSON.stringify(err.response?.data?.errors || {})}`,
      );

      const status = err.response?.status || 500;
      const data = err.response?.data;

      if (data && typeof data === "object" && "errors" in data) {
        switch (status) {
          case 400:
            throw new BadRequestError(data.errors);
          case 401:
            throw new UnauthorizedError(data.errors);
          case 403:
            throw new ForbiddenError(data.errors);
          case 404:
            throw new NotFoundError(data.errors);
          case 406:
            throw new NotAcceptableError(data.errors);
          case 409:
            throw new ConflictError(data.errors);
          case 422:
            throw new UnprocessableEntityError(data.errors);
          case 429:
            throw new TooManyRequestsError(data.errors);
          default:
            throw new InternalServerError(data.errors);
        }
      }

      throw new InternalServerError([
        { field: "", message: INTERNAL_SERVER_ERROR },
      ]);
    }

    throw err;
  }
}

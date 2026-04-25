import { ConflictException } from "@nestjs/common";

import { ErrorDetail, IAbstractError } from "./abstract.error";

const defaultError = [
  {
    field: "",
    message: "Conflict Error",
  },
];

export class ConflictError extends ConflictException implements IAbstractError {
  private readonly pDetails: ErrorDetail[] = [];

  constructor(details: ErrorDetail[] = defaultError) {
    super();

    this.pDetails = details;
  }

  get details(): ErrorDetail[] {
    return this.pDetails;
  }
}

import { ForbiddenException } from "@nestjs/common";

import { ErrorDetail, IAbstractError } from "./abstract.error";

const defaultError = [
  {
    field: "",
    message: "Forbidden",
  },
];

export class ForbiddenError
  extends ForbiddenException
  implements IAbstractError
{
  private readonly pDetails: ErrorDetail[] = [];

  constructor(details: ErrorDetail[] = defaultError) {
    super();
    this.pDetails = details;
  }

  get details(): ErrorDetail[] {
    return this.pDetails;
  }
}

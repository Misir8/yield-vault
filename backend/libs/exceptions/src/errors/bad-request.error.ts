import { BadRequestException } from "@nestjs/common";

import { ErrorDetail, IAbstractError } from "./abstract.error";

const defaultError = [
  {
    field: "",
    message: "Bad Request",
  },
];

export class BadRequestError
  extends BadRequestException
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

import { UnprocessableEntityException } from "@nestjs/common";

import { ErrorDetail, IAbstractError } from "./abstract.error";

const defaultError = [
  {
    field: "",
    message: "Unprocessable Entity",
  },
];

export class DomainError
  extends UnprocessableEntityException
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

import { UnprocessableEntityException } from "@nestjs/common";

import { ErrorDetail, IAbstractError } from "./abstract.error";

const defaultError = [
  {
    field: "",
    message: "Unprocessable Entity",
  },
];

export class UnprocessableEntityError
  extends UnprocessableEntityException
  implements IAbstractError
{
  constructor(private readonly pDetails: ErrorDetail[] = defaultError) {
    super();

    this.pDetails = pDetails;
  }

  get details(): ErrorDetail[] {
    return this.pDetails;
  }
}

// libs/api-decorators/src/iban.decorator.ts
import { applyDecorators } from "@nestjs/common";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIBAN, IsOptional } from "class-validator";

import { ERRORS } from "@libs/constants";

type ApiPropertyIBANOptions = {
  isOptional?: boolean;
  description?: string;
  example?: string;
};

export function ApiPropertyIBAN({
  isOptional = false,
  description = "IBAN",
  example = "DE91100000000123456789",
}: ApiPropertyIBANOptions = {}) {
  const swaggerMeta = {
    description,
    example,
    type: String,
  };

  const decorators = [
    ...(isOptional
      ? [IsOptional(), ApiPropertyOptional(swaggerMeta)]
      : [ApiProperty(swaggerMeta)]),
    IsIBAN({ message: ERRORS.INVALID_IBAN }),
  ];

  return applyDecorators(...decorators);
}

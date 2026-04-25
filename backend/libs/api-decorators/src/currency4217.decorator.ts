import { applyDecorators } from "@nestjs/common";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsISO4217CurrencyCode, IsOptional } from "class-validator";

import { ERRORS } from "@libs/constants";

type ApiPropertyCurrencyOptions = {
  isOptional?: boolean;
  description?: string;
  example?: string;
};

export function ApiPropertyCurrency({
  isOptional = false,
  description = "Currency code (ISO 4217)",
  example = "EUR",
}: ApiPropertyCurrencyOptions = {}) {
  const swaggerMeta = {
    description,
    example,
    type: String,
  };

  const decorators = [
    ...(isOptional
      ? [IsOptional(), ApiPropertyOptional(swaggerMeta)]
      : [ApiProperty(swaggerMeta)]),
    IsISO4217CurrencyCode({ message: ERRORS.INVALID_CURRENCY_CODE }),
  ];

  return applyDecorators(...decorators);
}

import { applyDecorators } from "@nestjs/common";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ApiPropertyOptions } from "@nestjs/swagger/dist/decorators/api-property.decorator";
import {
  IsOptional,
  IsStrongPassword,
  MaxLength,
  MinLength,
} from "class-validator";

import { ERRORS } from "@libs/constants";

export function ApiPropertyPassword({
  isOptional,
  minLength = 8,
  maxLength = 200,
  minUppercase = 1,
  minLowercase = 1,
  minNumbers = 1,
  minSymbols = 0,
}: {
  isOptional?: boolean;
  minLength?: number;
  maxLength?: number;
  minUppercase?: number;
  minLowercase?: number;
  minNumbers?: number;
  minSymbols?: number;
} = {}): any {
  const propertyOptions: ApiPropertyOptions = {
    type: String,
    example: "StrongPassword123!",
    description: `Password with at least ${minLength} characters, ${minUppercase} uppercase, ${minLowercase} lowercase, ${minNumbers} numbers, and ${minSymbols} symbols`,
  };

  return applyDecorators(
    ...(isOptional
      ? [IsOptional(), ApiPropertyOptional(propertyOptions)]
      : [ApiProperty(propertyOptions)]),
    IsStrongPassword(
      {
        minLength,
        minUppercase,
        minLowercase,
        minNumbers,
        minSymbols,
      },
      { message: ERRORS.WEAK_PASSWORD },
    ),
    MinLength(minLength, { message: ERRORS.TOO_SHORT_STRING }),
    MaxLength(maxLength, { message: ERRORS.TOO_LONG_STRING }),
  );
}

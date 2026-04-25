import { applyDecorators } from "@nestjs/common";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ApiPropertyOptions } from "@nestjs/swagger/dist/decorators/api-property.decorator";
import { Transform } from "class-transformer";
import { IsEmail, IsOptional, MaxLength } from "class-validator";

import { ERRORS } from "@libs/constants";

export function ApiPropertyEmail({
  isOptional,
  isArray,
}: { isOptional?: boolean; isArray?: boolean } = {}): any {
  const propertyOptions: ApiPropertyOptions = {
    type: String,
    example: isArray
      ? ["email@gmail.com", "another@example.com"]
      : "email@gmail.com",
    description: isArray ? "Array of email addresses" : "Email",
    ...(isArray && { isArray: true }),
  };

  return applyDecorators(
    ...(isOptional
      ? [IsOptional(), ApiPropertyOptional(propertyOptions)]
      : [ApiProperty(propertyOptions)]),
    IsEmail(
      {},
      { ...(isArray && { each: true }), message: ERRORS.INVALID_EMAIL },
    ),
    MaxLength(255, {
      ...(isArray && { each: true }),
      message: ERRORS.TOO_LONG_STRING,
    }),
    Transform(({ value }) => {
      if (value == null) return;
      if (isArray)
        return Array.isArray(value)
          ? value.map((v: string) => String(v).toLowerCase())
          : [String(value).toLowerCase()];
      return String(value).toLowerCase();
    }),
  );
}

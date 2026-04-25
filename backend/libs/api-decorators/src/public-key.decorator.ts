import { applyDecorators } from "@nestjs/common";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ApiPropertyOptions } from "@nestjs/swagger/dist/decorators/api-property.decorator";
import { Transform } from "class-transformer";
import { IsOptional, MaxLength, Validate } from "class-validator";

import { ERRORS } from "@libs/constants";

import { IsPemPublicKeyConstraint } from "./validations/is-pem-public-key.validator";

export function ApiPropertyPublicKey({
  isOptional,
}: { isOptional?: boolean } = {}): any {
  const propertyOptions: ApiPropertyOptions = {
    type: String,
    example:
      "-----BEGIN PUBLIC KEY-----\nMIIBIjANB...IDAQAB\n-----END PUBLIC KEY-----",
    description: "RSA Public Key (PEM format)",
  };

  return applyDecorators(
    ...(isOptional
      ? [IsOptional(), ApiPropertyOptional(propertyOptions)]
      : [ApiProperty(propertyOptions)]),
    MaxLength(1600, { message: ERRORS.TOO_LONG_STRING }),
    Validate(IsPemPublicKeyConstraint, { message: ERRORS.INVALID_PUBLIC_KEY }),
    Transform(({ value }) =>
      value == null ? undefined : String(value).trim(),
    ),
  );
}

import { applyDecorators } from "@nestjs/common";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ApiPropertyOptions } from "@nestjs/swagger/dist/decorators/api-property.decorator";
import { Transform } from "class-transformer";
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

import { ERRORS } from "@libs/constants";

type PropertyStringParams = {
  isOptional?: boolean;
  description?: string;
  minLength?: number;
  maxLength?: number;
  example?: string;
  pattern?: string | RegExp;
  patternMessage?: string;
};

export function ApiPropertyString({
  isOptional,
  minLength,
  maxLength,
  example,
  description,
  pattern,
  patternMessage,
}: PropertyStringParams = {}): <TFunction, Y>(
  target: object | TFunction,
  propertyKey?: string | symbol,
  descriptor?: TypedPropertyDescriptor<Y>,
) => void {
  const isValidMinLength = typeof minLength === "number" && !isNaN(minLength);
  const isValidMaxLength = typeof maxLength === "number" && !isNaN(maxLength);
  const normalizedPattern =
    pattern instanceof RegExp
      ? pattern.source
      : typeof pattern === "string"
        ? pattern
        : undefined;

  const propertyOptions: ApiPropertyOptions = {
    type: String,
    example,
    description,
    ...(isValidMinLength ? { minLength } : {}),
    ...(isValidMaxLength ? { maxLength } : {}),
    ...(normalizedPattern ? { pattern: normalizedPattern } : {}),
  };

  return applyDecorators(
    Transform(({ value }) =>
      value == null ? undefined : String(value).trim(),
    ),
    ...(isOptional
      ? [IsOptional(), ApiPropertyOptional(propertyOptions)]
      : [ApiProperty(propertyOptions)]),
    ...(isOptional
      ? []
      : [IsString({ message: ERRORS.STRING_LENGTH_IS_TOO_SHORT })]),
    ...(isValidMinLength
      ? [
          MinLength(minLength, {
            message: ERRORS.STRING_LENGTH_IS_TOO_SHORT,
            context: { minLength },
          }),
        ]
      : []),
    ...(isValidMaxLength
      ? [
          MaxLength(maxLength, {
            message: ERRORS.STRING_LENGTH_IS_TOO_LONG,
            context: { maxLength },
          }),
        ]
      : []),
    ...(normalizedPattern
      ? [
          // eslint-disable-next-line security/detect-non-literal-regexp
          Matches(new RegExp(normalizedPattern), {
            message: patternMessage ?? "value does not match required pattern",
          }),
        ]
      : []),
  );
}

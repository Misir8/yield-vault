import { applyDecorators, Type } from "@nestjs/common";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ApiPropertyOptions } from "@nestjs/swagger/dist/decorators/api-property.decorator";
import { Transform } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
} from "class-validator";

import { ERRORS } from "@libs/constants";

class PropertyArrayParams {
  isOptional?: boolean;
  isNotEmpty?: boolean;
  description?: string;
  isUnique?: boolean;
  example?: unknown;
  type:
    | "string"
    | "number"
    | "boolean"
    | "object"
    | "array"
    | "integer"
    | "null"
    | Type<unknown>
    | Record<string, any>
    | [Type<unknown>];
  enumValue?: readonly any[] | Record<string, any>;
  maxSize?: number;
}

export function ApiPropertyArray({
  isOptional,
  isNotEmpty,
  isUnique,
  type,
  enumValue,
  maxSize,
  description,
  example,
}: PropertyArrayParams) {
  const propertyOptions: ApiPropertyOptions = {
    isArray: true,
    description,
    type,
    ...(example !== undefined ? { example } : {}),
    ...(enumValue && { enum: enumValue }),
  } as ApiPropertyOptions;

  return applyDecorators(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    Transform(({ value }) =>
      value == null ? undefined : Array.isArray(value) ? value : [value],
    ),
    ...(isOptional
      ? [IsOptional(), ApiPropertyOptional(propertyOptions)]
      : [ApiProperty(propertyOptions)]),
    IsArray({ message: ERRORS.FIELD_MUST_BE_AN_ARRAY }),
    ...(enumValue
      ? [IsEnum(enumValue, { each: true, message: ERRORS.INVALID_ENUM_VALUE })]
      : []),
    ...(isNotEmpty ? [ArrayNotEmpty({ message: ERRORS.ARRAY_EMPTY })] : []),
    ...(isUnique
      ? [ArrayUnique({ message: ERRORS.ARRAY_MUST_BE_UNIQUE })]
      : []),
    ...(maxSize
      ? [
          ArrayMaxSize(maxSize, {
            message: ERRORS.ARRAY_INVALID_SIZE,
            context: { maxSize },
          }),
        ]
      : []),
  );
}

import { applyDecorators } from "@nestjs/common";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ApiPropertyOptions } from "@nestjs/swagger/dist/decorators/api-property.decorator";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsOptional,
  isNumberString,
  isBooleanString,
  isBoolean,
} from "class-validator";

import { ERRORS } from "@libs/constants";

export function ApiPropertyBoolean({
  isOptional,
  description,
  preserveUndefined,
}: {
  isOptional?: boolean;
  description?: string;
  preserveUndefined?: boolean;
} = {}): <TFunction, Y>(
  target: object | TFunction,
  propertyKey?: string | symbol,
  descriptor?: TypedPropertyDescriptor<Y>,
) => void {
  const propertyOptions: ApiPropertyOptions = {
    type: Boolean,
    example: true,
    description,
  };

  return applyDecorators(
    ...(isOptional
      ? [IsOptional(), ApiPropertyOptional(propertyOptions)]
      : [ApiProperty(propertyOptions)]),
    IsBoolean({ message: ERRORS.NOT_A_BOOLEAN }),
    Transform(({ value }) => {
      if (preserveUndefined && (value === undefined || value === null)) return;
      return !isNumberString(value) &&
        (isBooleanString(value) || isBoolean(value))
        ? value === "true" || value === true
        : Boolean(value);
    }),
  );
}

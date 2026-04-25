// libs/api-decorators/src/number.decorator.ts
import { applyDecorators } from "@nestjs/common";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ApiPropertyOptions } from "@nestjs/swagger/dist/decorators/api-property.decorator";
import { Type } from "class-transformer";
import {
  IsInt,
  IsOptional,
  Max,
  Min,
  registerDecorator,
} from "class-validator";
import { ValidationOptions } from "class-validator";

import {
  INVALID_LIMIT_VALUE,
  INVALID_NUMBER,
  NOT_AN_INTEGER,
} from "@libs/constants/errors";

type NumberAmountValidatorOptions = {
  allowNegative?: boolean;
};

class ApiPropertyNumberParams {
  isOptional?: boolean;
  min?: number;
  message?: string;
  max?: number;
  each?: boolean;
  isInt?: boolean;
  description?: string;
  allowNegative?: boolean;
  example?: number | number[];
}

/**
 * Validates numeric amount values.
 *
 * @param {ValidationOptions} [validationOptions] - Class-validator options.
 * @param {NumberAmountValidatorOptions} [options] - Numeric validation options.
 * @return {(object: object, propertyName: string) => void}
 */
export function IsNumberAmount(
  validationOptions?: ValidationOptions,
  options: NumberAmountValidatorOptions = {},
): (object: object, propertyName: string) => void {
  const { allowNegative = false } = options;

  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "IsNumberAmount",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          const checkNumber = (v: any) =>
            typeof v === "number" &&
            Number.isFinite(v) &&
            (allowNegative || v >= 0);

          if (Array.isArray(value)) return value.every(checkNumber);
          return checkNumber(value);
        },
        defaultMessage() {
          return INVALID_NUMBER;
        },
      },
    });
  };
}

/**
 * Swagger + validation decorator for numeric fields.
 *
 * @param {ApiPropertyNumberParams} params - Decorator params.
 * @return {PropertyDecorator}
 */
export function ApiPropertyNumber({
  isOptional,
  min,
  max,
  each,
  isInt = true,
  allowNegative = false,
  description,
  example,
  message: passedMessage,
}: ApiPropertyNumberParams = {}): PropertyDecorator {
  const propertyOptions: ApiPropertyOptions = {
    type: Number,
    example: example ?? (each ? [1, 2, 3] : 1),
    isArray: each,
    ...(min ? { minimum: min } : {}),
    ...(max ? { maximum: max } : {}),
    description,
  };

  return applyDecorators(
    ...(isOptional
      ? [IsOptional(), ApiPropertyOptional(propertyOptions)]
      : [ApiProperty(propertyOptions)]),
    Type(() => Number),
    ...(isInt
      ? [IsInt({ message: passedMessage || NOT_AN_INTEGER, each })]
      : [
          IsNumberAmount(
            { message: passedMessage || INVALID_NUMBER },
            { allowNegative },
          ),
        ]),
    ...(!isNaN(min)
      ? [
          Min(min, {
            message: INVALID_LIMIT_VALUE,
            context: { minValue: min },
            each,
          }),
        ]
      : []),
    ...(!isNaN(max)
      ? [
          Max(max, {
            message: INVALID_LIMIT_VALUE,
            context: { maxValue: max },
            each,
          }),
        ]
      : []),
  );
}

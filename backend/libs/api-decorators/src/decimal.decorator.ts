import { applyDecorators } from "@nestjs/common";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  registerDecorator,
  ValidateIf,
  type ValidationOptions,
} from "class-validator";

import type { ApiPropertyOptions } from "@nestjs/swagger/dist/decorators/api-property.decorator";

/**
 * Transforms a value to a decimal string, optionally allowing null values.
 *
 * @param {boolean} allowNull - Indicates whether null values are allowed.
 */
function ToDecimalString(allowNull: boolean) {
  return Transform(({ value }): string | null | undefined => {
    if (value === undefined || value === "") return undefined;
    if (value === null) return allowNull ? null : null; // return null; NotNull will catch below
    return String(value).trim().replace(",", ".");
  });
}

/**
 * Decorator that ensures a property is not null.
 *
 * @param {string} [message] - Custom error message when the value is null.
 */
function NotNull(message?: string) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: "notNull",
      target: object.constructor,
      propertyName,
      options: { message: message ?? "must not be null" },
      validator: {
        validate(v: unknown): boolean {
          return v !== null;
        },
      },
    });
  };
}

/**
 * Decorator that validates a property to be a decimal with a specified number of decimal places.
 *
 * @param {number} dp - The number of decimal places allowed.
 * @param {ValidationOptions} [validationOptions] - Additional validation options.
 */
function DecimalDp(dp: number, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: "decimalDp",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(v: unknown): boolean {
          if (v === undefined || v === null || v === "") return true;
          const s = String(v);

          // without +/- signs and other symbols
          if (s.startsWith("-") || s.startsWith("+")) return false;

          const parts = s.split(".");
          if (parts.length > 2) return false;

          const intPart = parts[0];
          if (!/^\d+$/.test(intPart)) return false; // литеральный regex — ок для security rule

          if (parts.length === 1) return true;

          const frac = parts[1];
          if (frac.length === 0 || frac.length > dp) return false;
          if (!/^\d+$/.test(frac)) return false;

          return true;
        },
        defaultMessage(): string {
          return `must be a non-negative decimal with up to ${dp} dp`;
        },
      },
    });
  };
}

/**
 * Decorator that validates a property to be a decimal greater than or equal to a specified minimum.
 *
 * @param {number} min - The minimum value allowed.
 * @param {ValidationOptions} [validationOptions] - Additional validation options.
 */
function DecimalMin(min: number, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: "decimalMin",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(v: unknown): boolean {
          if (v === undefined || v === null || v === "") return true;
          const n = Number(String(v));
          return Number.isFinite(n) && n >= min;
        },
        defaultMessage(): string {
          return `must be >= ${min}`;
        },
      },
    });
  };
}

/**
 * Decorator that validates a property to be a decimal less than or equal to a specified maximum.
 *
 * @param {number} max - The maximum value allowed.
 * @param {ValidationOptions} [validationOptions] - Additional validation options.
 */
function DecimalMax(max: number, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: "decimalMax",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(v: unknown): boolean {
          if (v === undefined || v === null || v === "") return true;
          const n = Number(String(v));
          return Number.isFinite(n) && n <= max;
        },
        defaultMessage(): string {
          return `must be <= ${max}`;
        },
      },
    });
  };
}

type ApiPropertyDecimalParams = {
  dp: number;
  min?: number;
  max?: number;
  isOptional?: boolean;
  allowNull?: boolean;
  example?: string;
  description?: string;
  dpMessage?: string;
  minMessage?: string;
  maxMessage?: string;
};

/**
 * Decorator that applies multiple decorators for a decimal property with validation and Swagger documentation.
 *
 * @param {ApiPropertyDecimalParams} params - Parameters for the decorator.
 */
export function ApiPropertyDecimal({
  dp,
  min = 0,
  max,
  isOptional,
  allowNull = false,
  example,
  description,
  dpMessage,
  minMessage,
  maxMessage,
}: ApiPropertyDecimalParams) {
  const propertyOptions: ApiPropertyOptions = {
    type: String,
    example,
    description,
    ...(allowNull ? { nullable: true } : {}),
  };

  const decorators: PropertyDecorator[] = [];

  decorators.push(
    isOptional
      ? ApiPropertyOptional(propertyOptions)
      : ApiProperty(propertyOptions),
  );

  if (isOptional) {
    decorators.push(ValidateIf((_, v) => v !== undefined));
  }

  decorators.push(ToDecimalString(allowNull));
  if (!allowNull) decorators.push(NotNull());

  decorators.push(DecimalDp(dp, { message: dpMessage }));

  if (typeof min === "number")
    decorators.push(DecimalMin(min, { message: minMessage }));
  if (typeof max === "number")
    decorators.push(DecimalMax(max, { message: maxMessage }));

  return applyDecorators(...decorators);
}

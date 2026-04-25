import { applyDecorators } from "@nestjs/common";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ApiPropertyOptions } from "@nestjs/swagger/dist/decorators/api-property.decorator";
import { Transform } from "class-transformer";
import {
  IsOptional,
  isPhoneNumber,
  registerDecorator,
  ValidationOptions,
} from "class-validator";

import { INVALID_PHONE } from "@libs/constants/errors";

function IsPhone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isPhone",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (Array.isArray(value)) {
            return value.every(
              (v) => typeof v === "string" && isPhoneNumber(v),
            );
          }
          return typeof value === "string" && isPhoneNumber(value);
        },
        defaultMessage() {
          return INVALID_PHONE;
        },
      },
    });
  };
}

export function ApiPropertyPhone({
  isOptional,
  isArray,
}: { isOptional?: boolean; isArray?: boolean } = {}): any {
  const propertyOptions: ApiPropertyOptions = {
    type: String,
    example: isArray ? ["+48123456789", "+48123456780"] : "+48123456789",
    description: isArray
      ? "Array of phone numbers in international format"
      : "Phone number in international format",
    ...(isArray && { isArray: true }),
  };

  return applyDecorators(
    ...(isOptional
      ? [IsOptional(), ApiPropertyOptional(propertyOptions)]
      : [ApiProperty(propertyOptions)]),
    IsPhone({ message: INVALID_PHONE }),
    Transform(({ value }) => {
      if (value == null) return;
      if (isArray)
        return Array.isArray(value)
          ? value.map((v: string) => String(v))
          : [String(value)];
      return String(value);
    }),
  );
}

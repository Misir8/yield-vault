import { applyDecorators } from "@nestjs/common";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ApiPropertyOptions } from "@nestjs/swagger/dist/decorators/api-property.decorator";
import { Transform } from "class-transformer";
import {
  IsOptional,
  registerDecorator,
  ValidationOptions,
} from "class-validator";

import { ERRORS } from "@libs/constants";

function IsCode(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isCode",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          return typeof value === "string" && /^\d{6}$/.test(value);
        },
        defaultMessage() {
          return "The code must consist of 6 digits";
        },
      },
    });
  };
}

export function ApiPropertyCode({
  isOptional,
}: { isOptional?: boolean } = {}): any {
  const propertyOptions: ApiPropertyOptions = {
    type: String,
    example: "123456",
    description: "Code (6 digits)",
  };

  return applyDecorators(
    ...(isOptional
      ? [IsOptional(), ApiPropertyOptional(propertyOptions)]
      : [ApiProperty(propertyOptions)]),
    IsCode({ message: ERRORS.INVALID_CODE }),
    Transform(({ value }) => (value == null ? undefined : String(value))),
  );
}

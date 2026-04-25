import { applyDecorators } from "@nestjs/common";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ApiPropertyOptions } from "@nestjs/swagger/dist/decorators/api-property.decorator";
import { IsEnum, IsOptional } from "class-validator";

import { ERRORS } from "@libs/constants";

type ApiEnumOpts<TValues extends object> = {
  enum: TValues;
  isOptional?: boolean;
} & Omit<ApiPropertyOptions, "enum" | "required" | "isArray" | "type">;

export function ApiPropertyEnum<TValues extends object>(
  opts: ApiEnumOpts<TValues>,
): MethodDecorator & PropertyDecorator;
export function ApiPropertyEnum<TValues extends object>(
  values: TValues,
  params?: { isOptional?: boolean; description?: string; example?: unknown },
): MethodDecorator & PropertyDecorator;

export function ApiPropertyEnum<TValues extends object>(arg1: any, arg2?: any) {
  const isCombined = typeof arg1 === "object" && arg1 && "enum" in arg1;
  const values: TValues = isCombined ? arg1.enum : arg1;

  const isOptional: boolean | undefined = isCombined
    ? arg1.isOptional
    : arg2?.isOptional;

  const apiOpts: ApiPropertyOptions = {
    enum: values,
    ...(isCombined ? arg1 : arg2),
  };

  delete (apiOpts as any).isOptional;
  delete (apiOpts as any).required;
  delete (apiOpts as any).isArray;
  delete (apiOpts as any).type;

  return applyDecorators(
    ...(isOptional
      ? [IsOptional(), ApiPropertyOptional(apiOpts)]
      : [ApiProperty(apiOpts)]),
    IsEnum(values, { message: ERRORS.INVALID_ENUM_VALUE, context: values }),
  );
}

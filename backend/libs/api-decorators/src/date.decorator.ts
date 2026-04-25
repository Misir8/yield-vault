import { applyDecorators } from "@nestjs/common";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ApiPropertyOptions } from "@nestjs/swagger/dist/decorators/api-property.decorator";
import { Type } from "class-transformer";
import { IsDate, IsISO8601, IsOptional } from "class-validator";

type ApiPropertyDateParams = {
  isOptional?: boolean;
  description?: string;
  example?: string;
  format?: "date" | "date-time" | "iso8601";
  strictFormat?: boolean;
};

export function ApiPropertyDate({
  isOptional,
  description,
  example,
  format = "date-time",
  strictFormat = false,
}: ApiPropertyDateParams = {}) {
  const propertyOptions: ApiPropertyOptions = {
    type: String,
    format,
    description,
    example,
  };

  const decorators = [
    ...(isOptional
      ? [IsOptional(), ApiPropertyOptional(propertyOptions)]
      : [ApiProperty(propertyOptions)]),

    ...(strictFormat
      ? [
          IsISO8601(
            { strict: true },
            { message: "Invalid ISO 8601 date format" },
          ),
        ]
      : [Type(() => Date), IsDate({ message: "Invalid date format" })]),
  ];

  return applyDecorators(...decorators);
}

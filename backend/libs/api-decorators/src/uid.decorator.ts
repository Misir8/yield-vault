import { applyDecorators } from "@nestjs/common";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ApiPropertyOptions } from "@nestjs/swagger/dist/decorators/api-property.decorator";
import { Transform } from "class-transformer";
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  IsOptional,
} from "class-validator";

import { NOT_AN_UUID } from "@libs/constants/errors";

type UuidVer = "3" | "4" | "5" | "7" | "all";

/**
 * Custom decorator to validate UUIDs with extended version support.
 *
 * @param {UuidVer} [version='all'] - The UUID version to validate against. Defaults to 'all'.
 * @param {ValidationOptions} [validationOptions] - Additional validation options.
 * @returns A function to register the custom validator.
 */
function IsUUIDExtended(
  version: UuidVer = "all",
  validationOptions?: ValidationOptions,
) {
  const genericUUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  return (object: object, propertyName: string) => {
    registerDecorator({
      name: "isUuidExtended",
      target: object.constructor,
      propertyName,
      constraints: [version],
      options: { message: NOT_AN_UUID, ...validationOptions },
      validator: {
        validate(value: any, _args: ValidationArguments) {
          if (typeof value !== "string") return false;
          if (!genericUUID.test(value)) return false;
          const verChar = value.split("-")[2][0]!;
          if (version === "all") {
            return true;
          }
          return verChar === version;
        },
      },
    });
  };
}

/**
 * Custom decorator for API properties that are UUIDs, with optional validation and transformation.
 *
 * @param {Object} [opts={}] - Options for the API property.
 * @param {boolean} [opts.isOptional] - Whether the property is optional.
 * @param {UuidVer} [opts.version='all'] - The UUID version to validate against. Defaults to 'all'.
 * @param {string} [opts.description] - Description of the API property.
 * @returns A function that applies the necessary decorators.
 */
export function ApiPropertyUUID(
  opts: {
    isOptional?: boolean;
    version?: UuidVer;
    description?: string;
    nullable?: boolean;
  } = {},
) {
  const { isOptional, version = "all", description, nullable } = opts;

  // Swagger examples
  const examples: Record<UuidVer | "any", string> = {
    "3": "f47ac10b-58cc-3372-a567-0e02b2c3d479",
    "4": "3137f701-d2f2-4b8a-ab00-985aa8b44b8f",
    "5": "9879e1c7-7c62-5c1f-9fa8-06e552dea8bd",
    "7": "2364e882-7051-709a-ee1f-aa02293bd566",
    all: "2364e882-7051-709a-ee1f-aa02293bd566",
    any: "2364e882-7051-709a-ee1f-aa02293bd566",
  };

  const propOpts: ApiPropertyOptions = {
    type: String,
    format: "uuid",
    description,
    example: examples[version] ?? examples.any,
    ...(nullable && { nullable: true }),
  };

  const decorators = isOptional
    ? [IsOptional(), ApiPropertyOptional(propOpts)]
    : [ApiProperty(propOpts)];

  return applyDecorators(
    ...decorators,
    Transform(({ value }) =>
      value == null ? (nullable ? null : undefined) : String(value).trim(),
    ),
    IsUUIDExtended(version),
  );
}

// libs/exceptions/src/pipes/validation.pipe.ts
import {
  ArgumentMetadata,
  Injectable,
  ValidationPipe,
  ValidationPipeOptions,
} from "@nestjs/common";
import { ClassConstructor } from "class-transformer";
import { ValidationError } from "class-validator";

import { BadRequestError, ErrorDetail } from "../errors";

type PrimitiveMetatype =
  | StringConstructor
  | BooleanConstructor
  | NumberConstructor
  | ArrayConstructor
  | ObjectConstructor;

const DEFAULT_VALIDATION_PIPE_OPTIONS: ValidationPipeOptions = {
  transform: true,
  enableDebugMessages: true,
  skipUndefinedProperties: false,
  skipNullProperties: false,
  skipMissingProperties: false,
  whitelist: true,
  forbidNonWhitelisted: true,
  forbidUnknownValues: true,
  disableErrorMessages: false,
};

/**
 * Global DTO validation pipe based on Nest ValidationPipe.
 *
 * It preserves a project-specific BadRequestError format
 * and normalizes empty body payloads for optional DTO bodies.
 */
@Injectable()
export class ClassValidationPipe extends ValidationPipe {
  /**
   * Creates validation pipe instance.
   *
   * @param {ValidationPipeOptions} [options]
   */
  constructor(options: ValidationPipeOptions = {}) {
    super({
      ...DEFAULT_VALIDATION_PIPE_OPTIONS,
      ...options,
      exceptionFactory: (errors: ValidationError[]) =>
        new BadRequestError(ClassValidationPipe.flattenErrors(errors)),
    });
  }

  /**
   * Normalizes empty HTTP body payloads before standard Nest validation.
   *
   * @param {unknown} value Raw incoming value
   * @param {ArgumentMetadata} metadata Nest argument metadata
   * @returns {Promise<unknown>} Validated/transformed value
   */
  async transform(
    value: unknown,
    metadata: ArgumentMetadata,
  ): Promise<unknown> {
    const normalizedValue = this.normalizeEmptyBody(value, metadata);
    return await super.transform(normalizedValue, metadata);
  }

  /**
   * Public wrapper used by unit tests.
   *
   * @param {ValidationError[]} errors Validation error tree
   * @returns {ErrorDetail[]} Flattened error details
   */
  expandError(errors: ValidationError[]): ErrorDetail[] {
    return ClassValidationPipe.flattenErrors(errors);
  }

  /**
   * Flattens nested validation errors into API-friendly structure.
   *
   * @param {ValidationError[]} errors Validation error tree
   * @returns {ErrorDetail[]} Flattened error details
   */
  private static flattenErrors(errors: ValidationError[]): ErrorDetail[] {
    const details: ErrorDetail[] = [];

    errors.forEach(({ property, children, constraints }) => {
      if (children?.length) {
        details.push(...ClassValidationPipe.flattenErrors(children));
      }

      if (constraints) {
        Object.values(constraints).forEach((message) => {
          details.push({
            field: property,
            message: ClassValidationPipe.normalizeMessage(property, message),
          });
        });
      }
    });

    return details;
  }

  /**
   * Converts validator message into project-friendly message format.
   *
   * @param {string} property Field name
   * @param {string} message Raw validator message
   * @returns {string} Normalized message
   */
  private static normalizeMessage(property: string, message: string): string {
    const directPrefix = `${property} `;
    if (message.startsWith(directPrefix)) {
      return message.slice(directPrefix.length).trim();
    }

    const propertyPhrase = `property ${property} `;
    if (message.startsWith(propertyPhrase)) {
      return message.slice("property ".length).trim();
    }

    return message.trim();
  }

  /**
   * Converts undefined/null HTTP body into an empty DTO object.
   *
   * This keeps optional body DTOs valid and required body DTOs
   * failing with validation errors instead of runtime TypeError.
   *
   * @param {unknown} value Raw incoming value
   * @param {ArgumentMetadata} metadata Nest argument metadata
   * @returns {unknown} Normalized value
   */
  private normalizeEmptyBody(
    value: unknown,
    metadata: ArgumentMetadata,
  ): unknown {
    if (metadata.type !== "body") {
      return value;
    }

    if (value !== undefined && value !== null) {
      return value;
    }

    if (!metadata.metatype || !this.shouldValidate(metadata.metatype)) {
      return value;
    }

    return {};
  }

  /**
   * Returns whether metatype should be treated as DTO class.
   *
   * @param {Function} metatype Reflected metatype
   * @returns {boolean} True when metatype is a DTO class
   */

  private shouldValidate(
    metatype: ArgumentMetadata["metatype"],
  ): metatype is ClassConstructor<object> {
    const primitiveMetatypes: PrimitiveMetatype[] = [
      String,
      Boolean,
      Number,
      Array,
      Object,
    ];

    return (
      Boolean(metatype) &&
      !primitiveMetatypes.includes(metatype as PrimitiveMetatype)
    );
  }
}

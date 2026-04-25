// libs/api-decorators/src/validations/is-different-from.validator.ts
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";

function normAsset(v: unknown): string {
  return String(v ?? "")
    .trim()
    .toUpperCase();
}

/**
 * Validates that a property value is different from another property
 * on the same object.
 *
 * @Use-case: prevent "same asset" requests like `fromAsset === toAsset` for swap DTOs.
 */
@ValidatorConstraint({ name: "IsDifferentFrom", async: false })
export class IsDifferentFromConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const [relatedProp] = args.constraints as [string];
    const relatedValue = (args.object as any)?.[relatedProp];

    if (value == null || relatedValue == null) return true;

    return normAsset(value) !== normAsset(relatedValue);
  }

  defaultMessage(args: ValidationArguments): string {
    const [relatedProp] = args.constraints as [string];
    return `${args.property} must be different from ${relatedProp}`;
  }
}

export function IsDifferentFrom(property: string, options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: "IsDifferentFrom",
      target: object.constructor,
      propertyName,
      constraints: [property],
      options,
      validator: IsDifferentFromConstraint,
    });
  };
}

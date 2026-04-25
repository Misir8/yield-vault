import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";

@ValidatorConstraint({ async: false })
export class RelatedFieldsValidator implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments): boolean {
    const object = args.object as any;
    const relatedField = args.constraints[0];
    const relatedValue = object[relatedField];

    if ((value && !relatedValue) || (!value && relatedValue)) {
      return false;
    }
    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    const relatedField = args.constraints[0];
    return `${args.property} must be provided if ${relatedField} is specified.`;
  }
}

export function AreFieldsRelated(
  relatedField: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "AreFieldsRelated",
      target: object.constructor,
      propertyName: propertyName,
      constraints: [relatedField],
      options: validationOptions,
      validator: RelatedFieldsValidator,
    });
  };
}

import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import {
  AUTH_LIMITS,
  PASSWORD_REGEX,
  VALIDATION_MESSAGES,
} from '@dark-horse-safety/types/validation';

@ValidatorConstraint({ name: 'IsStrongPassword', async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(value: unknown) {
    return typeof value === 'string' && PASSWORD_REGEX.test(value);
  }

  defaultMessage() {
    return VALIDATION_MESSAGES.passwordWeak;
  }
}

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}

export { AUTH_LIMITS, PASSWORD_REGEX, VALIDATION_MESSAGES };

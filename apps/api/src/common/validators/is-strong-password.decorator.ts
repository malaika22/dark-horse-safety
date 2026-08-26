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
  private lastMessage: string = VALIDATION_MESSAGES.passwordWeak;

  validate(value: unknown) {
    if (typeof value !== 'string' || !value) {
      this.lastMessage = VALIDATION_MESSAGES.required;
      return false;
    }
    if (value.length < AUTH_LIMITS.passwordMinLength) {
      this.lastMessage = VALIDATION_MESSAGES.passwordTooShort;
      return false;
    }
    if (value.length > AUTH_LIMITS.passwordMaxLength) {
      this.lastMessage = VALIDATION_MESSAGES.passwordTooLong;
      return false;
    }
    if (!/[A-Za-z]/.test(value)) {
      this.lastMessage = VALIDATION_MESSAGES.passwordNeedsLetter;
      return false;
    }
    if (!/\d/.test(value)) {
      this.lastMessage = VALIDATION_MESSAGES.passwordNeedsNumber;
      return false;
    }
    if (!PASSWORD_REGEX.test(value)) {
      this.lastMessage = VALIDATION_MESSAGES.passwordWeak;
      return false;
    }
    return true;
  }

  defaultMessage() {
    return this.lastMessage;
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

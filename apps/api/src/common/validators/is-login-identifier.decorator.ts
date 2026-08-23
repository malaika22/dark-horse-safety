import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { AUTH_LIMITS, EMAIL_REGEX } from '@dark-horse-safety/types/validation';
import { isValidPhone } from '../utils/phone.util';

@ValidatorConstraint({ name: 'isLoginIdentifier', async: false })
export class IsLoginIdentifierConstraint implements ValidatorConstraintInterface {
  validate(value: unknown) {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > AUTH_LIMITS.emailMaxLength) return false;

    if (EMAIL_REGEX.test(trimmed.toLowerCase())) {
      return true;
    }

    return isValidPhone(trimmed);
  }

  defaultMessage() {
    return 'Enter a valid email address or mobile number.';
  }
}

export function IsLoginIdentifier(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      constraints: [],
      validator: IsLoginIdentifierConstraint,
    });
  };
}

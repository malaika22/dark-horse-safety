import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

type EmailOrPhoneCarrier = {
  email?: string;
  phone?: string;
};

@ValidatorConstraint({ name: 'requireEmailOrPhone', async: false })
export class RequireEmailOrPhoneConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments) {
    const obj = args.object as EmailOrPhoneCarrier;
    const hasEmail =
      typeof obj.email === 'string' && obj.email.trim().length > 0;
    const hasPhone =
      typeof obj.phone === 'string' && obj.phone.trim().length > 0;
    return hasEmail || hasPhone;
  }

  defaultMessage() {
    return 'Either email or phone is required.';
  }
}

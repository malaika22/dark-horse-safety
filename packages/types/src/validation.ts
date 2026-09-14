export const AUTH_LIMITS = {
  emailMaxLength: 254,
  passwordMinLength: 7,
  passwordMaxLength: 128,
  tokenMinLength: 32,
  tokenMaxLength: 128,
} as const;

/** Standard email shape: local@domain.tld */
export const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/** At least one letter + one number; 7–128 chars (alphanumeric required; specials allowed) */
export const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{7,128}$/;

export const TOKEN_REGEX = /^[a-f0-9]{32,128}$/i;

export const VALIDATION_MESSAGES = {
  required: "This field can't be empty.",
  emailInvalid: "Enter a valid email address.",
  emailTooLong: "Email must be at most 254 characters.",
  passwordTooShort: "Password must be at least 7 characters.",
  passwordTooLong: "Password must be at most 128 characters.",
  passwordNeedsLetter: "Password must include letters.",
  passwordNeedsNumber: "Password must include a number.",
  passwordWeak:
    "Password must be at least 7 characters and include letters and numbers.",
  passwordMismatch: "Passwords do not match.",
  tokenMissing: "Link is missing or invalid.",
  tokenInvalid: "Link is missing or invalid.",
} as const;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateEmail(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return VALIDATION_MESSAGES.required;
  if (trimmed.length > AUTH_LIMITS.emailMaxLength) {
    return VALIDATION_MESSAGES.emailTooLong;
  }
  if (!EMAIL_REGEX.test(normalizeEmail(trimmed))) {
    return VALIDATION_MESSAGES.emailInvalid;
  }
  return null;
}

export function validateLoginPassword(value: string): string | null {
  return validatePassword(value);
}

export function validatePassword(value: string): string | null {
  if (!value) return VALIDATION_MESSAGES.required;
  if (value.length < AUTH_LIMITS.passwordMinLength) {
    return VALIDATION_MESSAGES.passwordTooShort;
  }
  if (value.length > AUTH_LIMITS.passwordMaxLength) {
    return VALIDATION_MESSAGES.passwordTooLong;
  }
  if (!/[A-Za-z]/.test(value)) {
    return VALIDATION_MESSAGES.passwordNeedsLetter;
  }
  if (!/\d/.test(value)) {
    return VALIDATION_MESSAGES.passwordNeedsNumber;
  }
  if (!PASSWORD_REGEX.test(value)) {
    return VALIDATION_MESSAGES.passwordWeak;
  }
  return null;
}

export function validatePasswordConfirm(
  password: string,
  confirm: string,
): string | null {
  if (!confirm) return VALIDATION_MESSAGES.required;
  if (password !== confirm) return VALIDATION_MESSAGES.passwordMismatch;
  return null;
}

export function validateToken(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return VALIDATION_MESSAGES.tokenMissing;
  if (
    trimmed.length < AUTH_LIMITS.tokenMinLength ||
    trimmed.length > AUTH_LIMITS.tokenMaxLength ||
    !TOKEN_REGEX.test(trimmed)
  ) {
    return VALIDATION_MESSAGES.tokenInvalid;
  }
  return null;
}

export function firstFieldError(
  errors: Record<string, string | null | undefined>,
): string | null {
  for (const message of Object.values(errors)) {
    if (message) return message;
  }
  return null;
}

export function firstApiValidationError(
  details?: Record<string, string[]>,
): string | undefined {
  if (!details) return undefined;
  for (const messages of Object.values(details)) {
    if (messages[0]) return messages[0];
  }
  return undefined;
}

export function getApiFieldError(
  details: Record<string, string[]> | undefined,
  field: string,
): string | undefined {
  return details?.[field]?.[0];
}

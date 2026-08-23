export {
  AUTH_LIMITS,
  EMAIL_REGEX,
  PASSWORD_REGEX,
  TOKEN_REGEX,
  VALIDATION_MESSAGES,
  normalizeEmail,
  validateEmail,
  validateLoginPassword,
  validatePassword,
  validatePasswordConfirm,
  validateToken,
  firstFieldError,
  firstApiValidationError,
  getApiFieldError,
} from "@dark-horse-safety/types/validation";

import { ApiError } from "@dark-horse-safety/api-client";
import { firstApiValidationError } from "@dark-horse-safety/types/validation";

export function mapApiValidationError(err: unknown): {
  message: string;
  details?: Record<string, string[]>;
} {
  if (err instanceof ApiError) {
    return {
      message:
        firstApiValidationError(err.details) ??
        err.message ??
        "Something went wrong. Try again.",
      details: err.details,
    };
  }

  return { message: "Something went wrong. Try again." };
}

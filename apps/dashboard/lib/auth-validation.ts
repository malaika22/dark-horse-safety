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
    const hasFieldDetails =
      !!err.details && Object.keys(err.details).length > 0;
    const isValidation =
      err.code === "VALIDATION_ERROR" ||
      hasFieldDetails ||
      (err.status === 400 && /validat|required|missing/i.test(err.message));

    if (isValidation) {
      return {
        message: "Some fields are missing. Please check and fill them.",
        details: err.details,
      };
    }

    return {
      message:
        firstApiValidationError(err.details) ??
        err.message ??
        "Something went wrong. Try again.",
      details: err.details,
    };
  }

  if (err instanceof Error && err.message.trim()) {
    return { message: err.message.trim() };
  }

  return { message: "Something went wrong. Try again." };
}

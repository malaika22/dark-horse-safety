import type { ValidationError } from 'class-validator';

export function formatValidationErrors(
  errors: ValidationError[],
): Record<string, string[]> {
  const details: Record<string, string[]> = {};

  const walk = (items: ValidationError[], prefix = '') => {
    for (const item of items) {
      const key = prefix ? `${prefix}.${item.property}` : item.property;

      if (item.constraints) {
        details[key] = Object.values(item.constraints);
      }

      if (item.children?.length) {
        walk(item.children, key);
      }
    }
  };

  walk(errors);
  return details;
}

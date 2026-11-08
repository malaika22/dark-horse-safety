import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

const errorExample = {
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Validation failed',
    details: { fieldName: 'Human readable message' },
  },
};

/** Swagger summary plus the `{ data }` success body and the error envelope. */
export function MobileOp(summary: string, data: unknown) {
  return applyDecorators(
    ApiOperation({ summary }),
    ApiOkResponse({
      description: 'Success. Body is always `{ data }`.',
      schema: { example: { data } },
    }),
    ApiBadRequestResponse({
      description: 'Validation or business-rule error. `details` is omitted when there is no field error.',
      schema: { example: errorExample },
    }),
    ApiUnauthorizedResponse({
      description: 'Missing or expired bearer token.',
      schema: {
        example: { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
      },
    }),
  );
}

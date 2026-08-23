import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import {
  validateToken,
  VALIDATION_MESSAGES,
} from '@dark-horse-safety/types/validation';

@Injectable()
export class InviteTokenPipe implements PipeTransform<string, string> {
  transform(value: string) {
    const error = validateToken(value);
    if (error) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: error,
        details: { token: [error] },
      });
    }
    return value.trim();
  }
}

export { VALIDATION_MESSAGES };

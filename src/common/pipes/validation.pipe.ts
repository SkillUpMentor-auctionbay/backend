import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { LoggingService, LogContext } from '../services/logging.service';

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  constructor(private loggingService: LoggingService) {}

  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToClass(metatype, value, {
      enableImplicitConversion: true,
    });

    const errors = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      const validationErrors = this.formatErrors(errors);

      this.loggingService.logWarning('Validation failed', {
        message: 'Input validation failed',
        validationErrors,
        input: this.sanitizeInput(value),
      } as LogContext);

      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Validation failed',
        error: 'Bad Request',
        details: {
          validationErrors,
          errorCount: validationErrors.length,
        },
      });
    }

    return object;
  }

  private toValidate(metatype: new (...args: any[]) => any): boolean {
    const types: (new (...args: any[]) => any)[] = [
      String,
      Boolean,
      Number,
      Array,
      Object,
    ];
    return !types.includes(metatype);
  }

  private formatErrors(errors: ValidationError[]): any[] {
    return errors.map((error) => {
      const constraints = error.constraints || {};
      const messages = Object.values(constraints);

      return {
        field: error.property,
        message: messages.length > 0 ? messages[0] : 'Invalid input',
        value: error.value,
        allMessages: messages.length > 1 ? messages : undefined,
      };
    });
  }

  private sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      return input.substring(0, 100);
    }

    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {};
      for (const key in input) {
        if (Object.prototype.hasOwnProperty.call(input, key)) {
          sanitized[key] = this.sanitizeInput(input[key]);
        }
      }
      return sanitized;
    }

    return input;
  }
}
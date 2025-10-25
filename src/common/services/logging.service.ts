import { Injectable, Logger } from '@nestjs/common';

export interface LogContext {
  userId?: string;
  username?: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  // File upload context
  fileName?: string;
  originalFilename?: string;
  sanitizedFilename?: string;
  fileSize?: number;
  mimeType?: string;
  fileMimeType?: string;
  allowedMimeTypes?: string[];
  maxSize?: number;
  fileExtension?: string;
  allowedExtensions?: string[];
  filePath?: string;
  directory?: string;
  error?: string;
  message?: string;
  // Auction context
  auctionId?: string;
  sellerId?: string;
  bidderId?: string;
  title?: string;
  startingPrice?: number;
  endTime?: Date;
  amount?: number;
  currentPrice?: number;
  bidId?: string;
  page?: number;
  limit?: number;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  sortOrder?: string;
  includeEnded?: boolean;
  updates?: Record<string, any>;
}

export interface SecurityLogContext extends LogContext {
  reason?: string;
  attemptCount?: number;
}

@Injectable()
export class LoggingService {
  private readonly logger = new Logger(LoggingService.name);

  logInfo(message: string, context?: LogContext) {
    const logEntry = {
      level: 'info',
      message: message || 'Info message',
      timestamp: new Date().toISOString(),
      context: context || {},
    };

    this.logger.log(JSON.stringify(logEntry));
  }

  logError(message: string, error?: Error, context?: LogContext) {
    const logEntry = {
      level: 'error',
      message: message || 'Error occurred',
      timestamp: new Date().toISOString(),
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
      context: context || {},
    };

    this.logger.error(JSON.stringify(logEntry));
  }

  logWarning(message: string, context?: LogContext) {
    const logEntry = {
      level: 'warn',
      message: message || 'Warning occurred',
      timestamp: new Date().toISOString(),
      context: context || {},
    };

    this.logger.warn(JSON.stringify(logEntry));
  }

  logDebug(message: string, context?: LogContext) {
    const logEntry = {
      level: 'debug',
      message: message || 'Debug message',
      timestamp: new Date().toISOString(),
      context: context || {},
    };

    this.logger.debug(JSON.stringify(logEntry));
  }

  logSecurityEvent(
    event: string,
    success: boolean,
    context?: SecurityLogContext,
  ) {
    const securityContext = {
      event: event || 'UNKNOWN_EVENT',
      success,
      ...context,
    };

    const logEntry = {
      level: success ? 'info' : 'warn',
      message: `Security Event: ${event || 'UNKNOWN_EVENT'} - ${success ? 'SUCCESS' : 'FAILURE'}`,
      timestamp: new Date().toISOString(),
      security: securityContext,
    };

    if (success) {
      this.logger.log(JSON.stringify(logEntry));
    } else {
      this.logger.warn(JSON.stringify(logEntry));
    }
  }

  logLoginAttempt(username: string, success: boolean, context?: LogContext) {
    this.logSecurityEvent('LOGIN_ATTEMPT', success, {
      username,
      ...context,
    });
  }

  logUserRegistration(username: string, userId: string, context?: LogContext) {
    this.logSecurityEvent('USER_REGISTRATION', true, {
      username,
      userId,
      ...context,
    });
  }

  logTokenGeneration(username: string, userId: string, context?: LogContext) {
    this.logSecurityEvent('TOKEN_GENERATION', true, {
      username,
      userId,
      ...context,
    });
  }

  logUnauthorizedAccess(message: string, context?: LogContext) {
    this.logSecurityEvent('UNAUTHORIZED_ACCESS', false, {
      reason: message,
      ...context,
    });
  }

  logRequest(context: LogContext) {
    this.logInfo('HTTP Request', context);
  }

  logResponse(context: LogContext) {
    this.logInfo('HTTP Response', context);
  }

  logDatabaseOperation(
    operation: string,
    table: string,
    success: boolean,
    context?: LogContext,
  ) {
    const message = `Database ${operation || 'UNKNOWN_OPERATION'} on ${table || 'UNKNOWN_TABLE'} - ${success ? 'SUCCESS' : 'FAILURE'}`;

    if (success) {
      this.logInfo(message, context);
    } else {
      this.logError(message, undefined, context);
    }
  }
}

import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LoggingService } from '../../common/services/logging.service';

@Injectable()
export class SseAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly loggingService: LoggingService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const token = request.query.token as string;

    this.loggingService.logInfo('SSE authentication attempt', {
      hasToken: !!request.headers.authorization || !!token,
      userAgent: request.headers['user-agent'],
      origin: request.headers.origin,
    });

    if (!request.headers.authorization && token) {
      request.headers.authorization = `Bearer ${token}`;

      this.loggingService.logInfo('Token moved from query to Authorization header', {
        message: `Token length: ${token.length}`
      });
    } else if (!request.headers.authorization && !token) {
      this.loggingService.logWarning('SSE connection attempted without authentication token');
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err) {
      this.loggingService.logError('SSE authentication error', err, {
        error: err.message,
      });
    }

    if (info) {
      this.loggingService.logWarning('SSE authentication info', {
        message: `${info.name}: ${info.message}`,
      });
    }

    return super.handleRequest(err, user, info, context);
  }
}

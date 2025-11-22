import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class SseAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const token = request.query.token as string;

    // If no Authorization header but token is in query params (for SSE)
    if (!request.headers.authorization && token) {
      // Add Authorization header from query parameter for JWT strategy to use
      request.headers.authorization = `Bearer ${token}`;
    }

    // Let the standard JWT strategy handle authentication
    return super.canActivate(context);
  }
}

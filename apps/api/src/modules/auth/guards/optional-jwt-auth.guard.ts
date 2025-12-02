import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    // Don't throw error if no token or invalid token
    // Just return undefined user
    return user || undefined;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Try to authenticate, but don't fail if it doesn't work
    try {
      await super.canActivate(context);
    } catch {
      // Ignore authentication errors - user will be undefined
    }
    return true;
  }
}

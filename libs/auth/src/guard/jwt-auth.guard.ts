import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { ExtractJwt } from 'passport-jwt';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);

    this.logger.log(`Authorization header: ${request.headers.authorization}`);
    this.logger.log(
      `Extracted token: ${token ? 'Token found' : 'No token found'}`,
    );

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any) {
    this.logger.log(
      `JWT validation result - err: ${err}, user: ${user ? 'User found' : 'No user'}`,
    );

    if (err || !user) {
      throw err || new UnauthorizedException('غير مصرح — يرجى تسجيل الدخول');
    }
    return user;
  }
}

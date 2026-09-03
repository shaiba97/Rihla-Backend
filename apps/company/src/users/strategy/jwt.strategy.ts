import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { UsersService } from '../service/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is not defined. Please set it in your .env file or environment.');
    }
    if (secret.trim() === '') {
      throw new Error('JWT_SECRET environment variable is empty. Please set a valid secret key.');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
      algorithms: ['HS256'],
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (token && this.usersService.isTokenBlacklisted(token)) {
      throw new UnauthorizedException(
        'انتهت جلسة تسجيل الدخول — يرجى تسجيل الدخول مجدداً',
      );
    }
    return payload;
  }
}
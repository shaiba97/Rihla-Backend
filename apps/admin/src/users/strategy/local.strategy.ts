import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { UsersService } from '../service/users.service';
import { Request } from 'express';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    super({ usernameField: 'email', passwordField: 'password', passReqToCallback: true });
  }

  async validate(req: Request, email: string, password: string): Promise<any> {
    const identifier = email || (req.body as any)?.phone;
    const result = await this.usersService.validateUser(identifier, password);
    if ('reason' in result) {
      const usedEmail = !!email;
      if (result.reason === 'identifier-not-found') {
        throw new UnauthorizedException(
          usedEmail
            ? 'البريد الإلكتروني غير مسجل في النظام'
            : 'رقم الهاتف غير مسجل في النظام',
        );
      }
      throw new UnauthorizedException('كلمة المرور غير صحيحة');
    }
    const user = result.user;
    if (user.role !== 'ADMIN') {
      throw new UnauthorizedException('هذا الحساب غير مصرح له بلوحة تحكم المشرف');
    }
    return user;
  }
}

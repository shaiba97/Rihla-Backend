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
    const user = await this.usersService.validateUser(identifier, password);
    if (!user) {
      throw new UnauthorizedException('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }
    if (user.role !== 'COMPANY') {
      throw new UnauthorizedException('هذا الحساب غير مصرح له بتطبيق الشركة');
    }
    return user;
  }
}

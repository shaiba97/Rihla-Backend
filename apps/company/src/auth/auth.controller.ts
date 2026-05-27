import { Controller, Post, UseGuards, Req, Get } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags } from '@nestjs/swagger';
import type { UserWithoutPassword } from '../users/entity/user.entity';
import { UsersService } from '../users/service/users.service';

@ApiTags('api/auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly usersService: UsersService) {}

  @Post('post-login')
  @UseGuards(AuthGuard('local'))
  // eslint-disable-next-line @typescript-eslint/require-await
  async login(@Req() req: any) {
    const user = req.user as UserWithoutPassword;

    if (!user) {
      return {
        success: false,
        message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
      };
    }

    return {
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  @Post('logout')
  // eslint-disable-next-line @typescript-eslint/require-await
  async logout() {
    return { message: 'تم تسجيل الخروج بنجاح', success: true };
  }

  @Get('me')
  me(@Req() req: any) {
    return {
      id: req.user?.id,
      email: req.user?.email,
      name: req.user?.name,
      role: req.user?.role,
    };
  }
}

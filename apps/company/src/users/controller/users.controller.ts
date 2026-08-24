import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Put,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { UsersService } from '../service/users.service';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from '../dto/user.dto';
import { UserEntity } from '../entity/user.entity';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('post-login')
  @UseGuards(AuthGuard('local'))
  login(@Req() req: any) {
    return this.usersService.login(req.user);
  }

  @Post('logout')
  logout(@Req() req: any) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      this.usersService.logout(token);
    }
    return { message: 'تم تسجيل الخروج بنجاح' };
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getMe(@Req() req: any) {
    const user = await this.usersService.getUserById(req.user.id);
    return { data: user };
  }

  /**
   * Public company-signup endpoint. Role is always forced to COMPANY
   * server-side (see UsersService.create) — privileged accounts cannot be
   * self-assigned.
   */
  @Post('post-user')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a company account (role is always COMPANY)',
  })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: UserResponseDto,
  })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  /** Returns only the authenticated user's own record. */
  @Get('get-users')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get own user record' })
  async getUsers(@Req() req: Request) {
    return this.usersService.getUsers((req as any).user.id);
  }

  @Get('get-users/property/:property/value/:value')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Look up own record by id/email/phone only' })
  async getUsersByProperty(
    @Param('property') property: string,
    @Param('value') value: string,
    @Req() req: Request,
  ) {
    this.assertAllowedProperty(property);
    return this.usersService.getUsersByProperty(
      property,
      value,
      (req as any).user.id,
    );
  }

  @Get('get-user/property/:property/value/:value')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Look up own record by id/email/phone only' })
  async getUser(
    @Param('property') property: string,
    @Param('value') value: string,
    @Req() req: Request,
  ): Promise<UserEntity> {
    this.assertAllowedProperty(property);
    return this.usersService.getUser(property, value, (req as any).user.id);
  }

  @Put('update-user/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update own user record' })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: Request,
  ) {
    if (id !== (req as any).user.id) {
      throw new ForbiddenException('لا يمكنك تعديل حساب مستخدم آخر');
    }
    return this.usersService.update(id, updateUserDto);
  }

  @Delete('delete-user/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Delete own user account' })
  async remove(@Param('id') id: string, @Req() req: Request) {
    if (id !== (req as any).user.id) {
      throw new ForbiddenException('لا يمكنك حذف حساب مستخدم آخر');
    }
    return this.usersService.remove(id);
  }

  private assertAllowedProperty(property: string): void {
    const allowed = ['id', 'email', 'phone'];
    if (!allowed.includes(property)) {
      throw new ForbiddenException('خاصية البحث غير مسموح بها');
    }
  }
}

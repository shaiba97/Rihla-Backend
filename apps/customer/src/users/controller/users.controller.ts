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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
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

  @Post('post-user')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: UserResponseDto,
  })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get('get-users')
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    type: [UserResponseDto],
  })
  async getUsers() {
    return this.usersService.getUsers();
  }

  @Get('get-users/property/:property/value/:value')
  @ApiOperation({ summary: 'Get all users by property and value' })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    type: [UserResponseDto],
  })
  async getUsersByProperty(
    @Param('property') property: string,
    @Param('value') value: string,
  ) {
    return this.usersService.getUsersByProperty(property, value);
  }

  @Get('get-user/property/:property/value/:value')
  @ApiOperation({ summary: 'Get user by property and value' })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
    type: UserResponseDto,
  })
  async getUser(
    @Param('property') property: string,
    @Param('value') value: string,
  ): Promise<UserEntity> {
    return this.usersService.getUser(property, value);
  }

  @Put('update-user/:id')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: UserResponseDto,
  })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete('delete-user/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}

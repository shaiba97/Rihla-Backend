import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto, UpdateUserDto } from '../dto/user.dto';
import { UserEntity, UserWithoutPassword } from '../entity/user.entity';
import { users } from '@app/prisma';
import { PrismaService } from '@app/prisma';
import * as bcrypt from 'bcrypt';

const tokenBlacklist = new Set<string>();

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(
    identifier: string,
    password: string,
  ): Promise<UserWithoutPassword | null> {
    const normalized = identifier.toLowerCase().trim();

    const user =
      (await this.prisma.users.findUnique({
        where: { phone: normalized },
      })) ||
      (await this.prisma.users.findUnique({
        where: { email: normalized },
      }));

    if (!user) {
      return null;
    }

    if (!user.password) return null;

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...result } = user;
    return result;
  }

  login(user: UserWithoutPassword) {
    const payload = {
      id: user.id,
      email: user.email,
      phone: (user as any).phone,
      role: user.role,
      name: user.name,
    };

    const token = this.jwtService.sign(payload);

    return {
      message: 'تم تسجيل الدخول بنجاح',
      token,
      user: payload,
    };
  }

  logout(token: string): void {
    tokenBlacklist.add(token);
  }

  isTokenBlacklisted(token: string): boolean {
    return tokenBlacklist.has(token);
  }

  async create(createUserDto: CreateUserDto): Promise<{
    success: boolean;
    message: string;
    data?: UserWithoutPassword;
  }> {
    if (!createUserDto || (!createUserDto.email && !createUserDto.phone)) {
      return {
        success: false,
        message: 'بيانات المستخدم غير صالحة - البريد الإلكتروني أو الهاتف مطلوب',
      };
    }

    const normalizedEmail = createUserDto.email?.toLowerCase().trim();
    const normalizedPhone = createUserDto.phone?.toLowerCase().trim();

    const existingUser =
      (normalizedEmail
        ? await this.prisma.users.findUnique({ where: { email: normalizedEmail } })
        : null) ||
      (normalizedPhone
        ? await this.prisma.users.findUnique({ where: { phone: normalizedPhone } })
        : null);

    if (existingUser) {
      return {
        success: false,
        message: 'البريد الإلكتروني أو الهاتف مستخدم بالفعل',
      };
    }

    try {
      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

      const user = await this.prisma.users.create({
        data: {
          name: createUserDto.name,
          email: normalizedEmail,
          phone: normalizedPhone,
          password: hashedPassword,
          role: (createUserDto.role as any) ?? 'USER',
          updatedAt: new Date(),
        },
      });

      const userEntity = UserEntity.fromPrisma(user);

      return {
        success: true,
        message: 'تم إنشاء المستخدم بنجاح',
        data: userEntity.toJSON(),
      };
    } catch (error: any) {
      this.logger.error('Error creating user:', error.message);
      if (error.code === 'P2002') {
        return {
          success: false,
          message: 'البريد الإلكتروني أو الهاتف مستخدم بالفعل',
        };
      }
      return {
        success: false,
        message: 'فشل في إنشاء المستخدم',
      };
    }
  }

  async getUsers(): Promise<UserEntity[]> {
    const users = await this.prisma.users.findMany();
    return UserEntity.fromPrismaArray(users);
  }

  async getUsersByProperty(
    property: string,
    value: string,
  ): Promise<UserEntity[]> {
    const users = await this.prisma.users.findMany({
      where: { [property]: value },
    });
    return UserEntity.fromPrismaArray(users);
  }

  async getUser(property: string, value: string): Promise<UserEntity> {
    const user: users | null = await this.prisma.users.findFirst({
      where: { [property]: value },
    });
    return UserEntity.fromPrisma(user as users);
  }

  // async search(query: string): Promise<UserEntity[]> {
  //   const users = await this.prisma.users.findMany({
  //     where: {
  //       OR: [
  //         { name: { contains: query, mode: 'insensitive' } },
  //         { email: { contains: query, mode: 'insensitive' } },
  //       ],
  //     },
  //   });
  //   return UserEntity.fromPrismaArray(users as users[]);
  // }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<{
    success: boolean;
    message: string;
    data?: UserWithoutPassword;
  }> {
    try {
      const user: users | null = await this.prisma.users.findUnique({
        where: { id },
      });

      if (!user) {
        return {
          success: false,
          message: 'المستخدم غير موجود',
        };
      }

      if (updateUserDto.email && updateUserDto.email !== user.email) {
        const normalizedEmail = updateUserDto.email.toLowerCase().trim();
        const existingUser: users | null = await this.prisma.users.findUnique({
          where: { email: normalizedEmail },
        });

        if (existingUser) {
          return {
            success: false,
            message: 'البريد الإلكتروني مستخدم بالفعل',
          };
        }
      }

      const updateData: {
        name?: string;
        email?: string;
        phone?: string;
        password?: string;
        role?: string;
        updatedAt?: Date;
      } = {};

      if (updateUserDto.name !== undefined)
        updateData.name = updateUserDto.name;
      if (updateUserDto.email !== undefined)
        updateData.email = updateUserDto.email.toLowerCase().trim();
      if (updateUserDto.phone !== undefined)
        updateData.phone = updateUserDto.phone.toLowerCase().trim();
      if (updateUserDto.password !== undefined) {
        updateData.password = await bcrypt.hash(updateUserDto.password, 10);
      }
      if (updateUserDto.role !== undefined) {
        updateData.role = updateUserDto.role;
      }
      updateData.updatedAt = new Date();

      const updatedUser = await this.prisma.users.update({
        where: { id },
        data: updateData as any,
      });

      const userEntity = UserEntity.fromPrisma(updatedUser);

      return {
        success: true,
        message: 'تم تحديث المستخدم بنجاح',
        data: userEntity.toJSON(),
      };
    } catch (error: any) {
      this.logger.error('Error updating user:', error.message);
      if (error.code === 'P2002') {
        return {
          success: false,
          message: 'البريد الإلكتروني مستخدم بالفعل',
        };
      }
      if (error.code === 'P2025') {
        return {
          success: false,
          message: 'المستخدم غير موجود',
        };
      }
      return {
        success: false,
        message: 'فشل في تحديث المستخدم',
      };
    }
  }

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const user: users | null = await this.prisma.users.findUnique({
        where: { id },
      });

      if (!user) {
        return {
          success: false,
          message: 'المستخدم غير موجود',
        };
      }

      await this.prisma.users.delete({ where: { id } });

      return {
        success: true,
        message: 'تم حذف المستخدم بنجاح',
      };
    } catch (error: any) {
      this.logger.error('Error deleting user:', error.message);
      return {
        success: false,
        message: 'فشل في حذف المستخدم',
      };
    }
  }

  async getUserById(id: string) {
    try {
      const user = await this.prisma.users.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return {
          success: false,
          message: 'المستخدم غير موجود',
        };
      }

      return { success: true, data: user };
    } catch (error: any) {
      this.logger.error('Error fetching user:', error.message);
      return {
        success: false,
        message: 'فشل في جلب بيانات المستخدم',
      };
    }
  }
}

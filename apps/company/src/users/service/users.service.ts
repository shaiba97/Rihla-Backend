import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto, UpdateUserDto } from '../dto/user.dto';
import { UserEntity, UserWithoutPassword } from '../entity/user.entity';
import { users } from '@app/prisma';
import { PrismaService } from '@app/prisma';
import * as bcrypt from 'bcrypt';

const tokenBlacklist = new Set<string>();

const SALT_ROUNDS = 12;

/** Fields safe to expose — never password/refreshToken. */
const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  googleId: true,
  facebookId: true,
  avatar: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

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
  ): Promise<
    | { user: UserWithoutPassword }
    | { reason: 'identifier-not-found' | 'password-wrong' }
  > {
    const normalized = identifier.toLowerCase().trim();

    const user =
      (await this.prisma.users.findUnique({
        where: { phone: normalized },
      })) ||
      (await this.prisma.users.findUnique({
        where: { email: normalized },
      }));

    if (!user) {
      return { reason: 'identifier-not-found' };
    }

    if (!user.password) return { reason: 'password-wrong' };

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return { reason: 'password-wrong' };
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...result } = user;
    return { user: result };
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
        message:
          'بيانات المستخدم غير صالحة - البريد الإلكتروني أو الهاتف مطلوب',
      };
    }

    const normalizedEmail = createUserDto.email?.toLowerCase().trim();
    const normalizedPhone = createUserDto.phone?.toLowerCase().trim();

    const existingUser =
      (normalizedEmail
        ? await this.prisma.users.findUnique({
            where: { email: normalizedEmail },
          })
        : null) ||
      (normalizedPhone
        ? await this.prisma.users.findUnique({
            where: { phone: normalizedPhone },
          })
        : null);

    if (existingUser) {
      return {
        success: false,
        message: 'البريد الإلكتروني أو الهاتف مستخدم بالفعل',
      };
    }

    try {
      const hashedPassword = await bcrypt.hash(
        createUserDto.password,
        SALT_ROUNDS,
      );

      const user = await this.prisma.users.create({
        data: {
          name: createUserDto.name,
          email: normalizedEmail,
          phone: normalizedPhone,
          password: hashedPassword,
          // This is the public company-signup path — accounts created here are
          // always company accounts. Privileged roles can never be
          // self-assigned.
          role: 'COMPANY' as any,
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

  /** Returns only the requester's own record — never other users. */
  async getUsers(requesterId: string): Promise<UserEntity[]> {
    const users = await this.prisma.users.findMany({
      where: { id: requesterId },
      select: PUBLIC_USER_SELECT,
    });
    return users.map((u) => new UserEntity(u));
  }

  /**
   * Lookup restricted to the requester's own record. The controller only
   * allows property in {id, email, phone}; the value must match the
   * authenticated user's own value.
   */
  async getUsersByProperty(
    property: string,
    value: string,
    requesterId: string,
  ): Promise<UserEntity[]> {
    const own = await this.prisma.users.findUnique({
      where: { id: requesterId },
      select: PUBLIC_USER_SELECT,
    });
    if (!own) return [];
    const matches =
      (property === 'id' && value === own.id) ||
      (property === 'email' &&
        !!own.email &&
        value.toLowerCase().trim() === own.email) ||
      (property === 'phone' &&
        !!own.phone &&
        value.toLowerCase().trim() === own.phone);
    return matches ? [new UserEntity(own)] : [];
  }

  /** Lookup restricted to the requester's own record. */
  async getUser(
    property: string,
    value: string,
    requesterId: string,
  ): Promise<UserEntity> {
    const results = await this.getUsersByProperty(property, value, requesterId);
    const user = results[0];
    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }
    return user;
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
        updatedAt?: Date;
      } = {};

      if (updateUserDto.name !== undefined)
        updateData.name = updateUserDto.name;
      if (updateUserDto.email !== undefined)
        updateData.email = updateUserDto.email.toLowerCase().trim();
      if (updateUserDto.phone !== undefined)
        updateData.phone = updateUserDto.phone.toLowerCase().trim();
      if (updateUserDto.password !== undefined) {
        updateData.password = await bcrypt.hash(
          updateUserDto.password,
          SALT_ROUNDS,
        );
      }
      // NOTE: `role` is intentionally not updatable through this endpoint.
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

  /**
   * Look up a customer (USER role) by email or phone.
   * Used by the company app to resolve a walk-in customer's account
   * before registering an office booking.
   */
  async lookupCustomer(
    email?: string,
    phone?: string,
  ): Promise<{ id: string; name: string; phone: string | null } | null> {
    if (!email && !phone) return null;
    const where: any = { role: 'USER' as any };
    if (email) where.email = email.toLowerCase().trim();
    if (phone) where.phone = phone.toLowerCase().trim();
    const user = await this.prisma.users.findFirst({
      where,
      select: { id: true, name: true, phone: true },
    });
    return user;
  }

  /**
   * Ensures a placeholder USER account exists for office (walk-in) bookings.
   * Idempotent — returns the same account on every call.
   * Used by createBooking when the booking is a counter sale.
   */
  async ensureOfficeCustomer(): Promise<{ id: string; name: string }> {
    const phone = 'OFFICE_COUNTER';
    const existing = await this.prisma.users.findUnique({
      where: { phone },
      select: { id: true },
    });
    if (existing) return { id: existing.id, name: 'حجز مكتب' };

    const created = await this.prisma.users.create({
      data: {
        name: 'حجز مكتب',
        phone,
        role: 'USER' as any,
      },
      select: { id: true },
    });
    return { id: created.id, name: 'حجز مكتب' };
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

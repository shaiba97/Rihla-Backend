import { Role } from '@app/prisma';

export interface User {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  password: string | null;
  role: Role;
  googleId: string | null;
  facebookId: string | null;
  avatar: string | null;
  isActive: boolean;
  refreshToken: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class UserEntity implements User {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  password: string | null;
  role: Role;
  googleId: string | null;
  facebookId: string | null;
  avatar: string | null;
  isActive: boolean;
  refreshToken: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }

  static fromPrisma(user: User): UserEntity {
    return new UserEntity({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      password: user.password,
      role: user.role,
      googleId: user.googleId,
      facebookId: user.facebookId,
      avatar: user.avatar,
      isActive: user.isActive,
      refreshToken: user.refreshToken,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }

  static fromPrismaArray(users: User[]): UserEntity[] {
    return users.map((user) => UserEntity.fromPrisma(user));
  }

  toJSON(): Omit<User, 'password' | 'refreshToken'> {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      phone: this.phone,
      role: this.role,
      googleId: this.googleId,
      facebookId: this.facebookId,
      avatar: this.avatar,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export type UserWithoutPassword = Omit<User, 'password' | 'refreshToken'>;

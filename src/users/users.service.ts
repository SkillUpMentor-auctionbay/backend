import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        surname: true,
        email: true,
        profile_picture_url: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) return null;

    return {
      ...user,
      profilePictureUrl: user.profile_picture_url,
      profile_picture_url: undefined,
    };
  }

  async findByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        surname: true,
        email: true,
        profile_picture_url: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) return null;

    return {
      ...user,
      profilePictureUrl: user.profile_picture_url,
      profile_picture_url: undefined,
    };
  }

  async findByEmailWithPassword(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async createUser(
    name: string,
    surname: string,
    email: string,
    password: string,
    profilePictureUrl?: string,
  ) {
    const user = await this.prisma.user.create({
      data: {
        name,
        surname,
        email,
        password,
        profile_picture_url: profilePictureUrl,
      },
      select: {
        id: true,
        name: true,
        surname: true,
        email: true,
        profile_picture_url: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      ...user,
      profilePictureUrl: user.profile_picture_url,
      profile_picture_url: undefined,
    };
  }

  async updateUser(
    id: string,
    data: Partial<{
      name: string;
      surname: string;
      email: string;
      profilePictureUrl: string;
    }>,
  ) {
    const dbData = {
      ...data,
      profile_picture_url: data.profilePictureUrl,
      profilePictureUrl: undefined,
    };

    const user = await this.prisma.user.update({
      where: { id },
      data: dbData,
      select: {
        id: true,
        name: true,
        surname: true,
        email: true,
        profile_picture_url: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      ...user,
      profilePictureUrl: user.profile_picture_url,
      profile_picture_url: undefined,
    };
  }

  async updatePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id },
      data: { password: hashedNewPassword },
    });

    return { message: 'Password updated successfully' };
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.delete({
      where: { id },
      select: {
        id: true,
        name: true,
        surname: true,
        email: true,
        profile_picture_url: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      ...user,
      profilePictureUrl: user.profile_picture_url,
      profile_picture_url: undefined,
    };
  }
}

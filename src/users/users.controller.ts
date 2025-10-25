import {
  Controller,
  Get,
  Patch,
  UseGuards,
  Request,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UserDto } from './dto/user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('users')
@ApiBearerAuth('JWT')
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: UserDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token is missing or invalid',
  })
  async getMe(@Request() req): Promise<UserDto> {
    return req.user;
  }

  @Patch('me/update-password')
  @UseGuards(JwtAuthGuard)
  @ApiBody({ type: UpdatePasswordDto, description: 'Password update data' })
  @ApiResponse({
    status: 200,
    description: 'Password updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Password updated successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Validation error or same password',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Current password is incorrect',
  })
  async updatePassword(
    @Request() req,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ) {
    return this.usersService.updatePassword(
      req.user.id,
      updatePasswordDto.currentPassword,
      updatePasswordDto.newPassword,
    );
  }
}

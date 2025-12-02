import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req: ExpressRequest) {
    return this.usersService.getMeWithContractorInfo((req as any).user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMe(@Request() req: ExpressRequest, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update((req as any).user.id, updateUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('switch-type')
  async switchUserType(
    @Request() req: ExpressRequest,
    @Body() body: { targetType: 'customer' | 'contractor' },
  ) {
    return this.usersService.switchUserType((req as any).user.id, body.targetType);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me')
  async deleteAccount(@Request() req: ExpressRequest) {
    await this.usersService.deleteAccount((req as any).user.id);
    return { message: '회원 탈퇴가 완료되었습니다' };
  }
}

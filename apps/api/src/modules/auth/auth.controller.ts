import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response, Request as ExpressRequest } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UpdateUserTypeDto } from './dto/update-user-type.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  // Mobile app will send Google ID token
  @Post('google')
  async googleAuth(@Body() googleAuthDto: GoogleAuthDto) {
    // In production, verify the ID token with Google
    // For now, we trust the token and extract user info
    const user = await this.authService.validateGoogleUser({
      id: googleAuthDto.googleId,
      email: googleAuthDto.email,
      displayName: googleAuthDto.name,
      picture: googleAuthDto.profileImage,
    });

    return this.authService.login(user);
  }

  // Web OAuth flow (optional)
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Request() req: ExpressRequest, @Res() res: Response) {
    const result = await this.authService.login((req as any).user);
    // Redirect to mobile app with tokens
    const redirectUrl = `interior-app://auth?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}`;
    res.redirect(redirectUrl);
  }

  @Post('refresh')
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshAccessToken(refreshTokenDto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Request() req: ExpressRequest, @Body() body: { refreshToken?: string }) {
    await this.authService.logout((req as any).user.id, body.refreshToken);
    return { message: '로그아웃 되었습니다' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('user-type')
  async updateUserType(
    @Request() req: ExpressRequest,
    @Body() updateUserTypeDto: UpdateUserTypeDto,
  ) {
    return this.authService.updateUserType((req as any).user.id, updateUserTypeDto.userType);
  }
}

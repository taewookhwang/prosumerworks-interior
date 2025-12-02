import { Injectable, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { RefreshToken } from './entities/refresh-token.entity';
import { UsersService } from '../users/users.service';
import { User, UserType } from '../users/entities/user.entity';
import { ContractorsService } from '../contractors/contractors.service';

export interface GoogleProfile {
  id: string;
  email: string;
  displayName: string;
  picture?: string;
}

export interface TokenPayload {
  sub: string;
  email: string;
  userType: UserType;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => ContractorsService))
    private readonly contractorsService: ContractorsService,
  ) {}

  async validateGoogleUser(profile: GoogleProfile): Promise<User> {
    let user = await this.usersService.findByGoogleId(profile.id);

    if (!user) {
      // Check if user exists with same email
      user = await this.usersService.findByEmail(profile.email);

      if (user) {
        // Link Google account to existing user
        await this.usersService.update(user.id, { googleId: profile.id });
      } else {
        // Create new user
        user = await this.usersService.create({
          email: profile.email,
          name: profile.displayName,
          googleId: profile.id,
          profileImage: profile.picture,
          userType: UserType.CUSTOMER,
        });
      }
    }

    return user;
  }

  async login(user: User) {
    // Check if user has contractor profile - if so, default to contractor mode
    const contractor = await this.contractorsService.findByUserId(user.id);
    let effectiveUserType = user.userType;

    if (contractor) {
      // User has contractor profile, default to contractor mode on login
      effectiveUserType = UserType.CONTRACTOR;
      // Update userType in database if different
      if (user.userType !== UserType.CONTRACTOR) {
        await this.usersService.updateUserType(user.id, UserType.CONTRACTOR);
      }
    }

    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      userType: effectiveUserType,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.createRefreshToken(user.id);

    return {
      accessToken,
      refreshToken: refreshToken.token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        profileImage: user.profileImage,
        userType: effectiveUserType,
        hasContractor: !!contractor,
        contractor: contractor
          ? {
              id: contractor.id,
              companyName: contractor.companyName,
              status: contractor.status,
            }
          : null,
      },
    };
  }

  async createRefreshToken(
    userId: string,
    deviceInfo?: string,
  ): Promise<RefreshToken> {
    const token = uuidv4();
    const expiresIn = this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d');
    const expiresAt = new Date();

    // Parse expires in (e.g., '7d' -> 7 days)
    const match = expiresIn.match(/^(\d+)([dhms])$/);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2];
      switch (unit) {
        case 'd':
          expiresAt.setDate(expiresAt.getDate() + value);
          break;
        case 'h':
          expiresAt.setHours(expiresAt.getHours() + value);
          break;
        case 'm':
          expiresAt.setMinutes(expiresAt.getMinutes() + value);
          break;
        case 's':
          expiresAt.setSeconds(expiresAt.getSeconds() + value);
          break;
      }
    }

    const refreshToken = this.refreshTokenRepository.create({
      userId,
      token,
      deviceInfo,
      expiresAt,
    });

    return this.refreshTokenRepository.save(refreshToken);
  }

  async refreshAccessToken(refreshTokenString: string) {
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { token: refreshTokenString },
      relations: ['user'],
    });

    if (!refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (refreshToken.expiresAt < new Date()) {
      await this.refreshTokenRepository.delete(refreshToken.id);
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = refreshToken.user;
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      userType: user.userType,
    };

    // Delete old refresh token and create new one (rotation)
    await this.refreshTokenRepository.delete(refreshToken.id);
    const newRefreshToken = await this.createRefreshToken(
      user.id,
      refreshToken.deviceInfo,
    );

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: newRefreshToken.token,
    };
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.refreshTokenRepository.delete({ token: refreshToken });
    } else {
      // Delete all refresh tokens for user
      await this.refreshTokenRepository.delete({ userId });
    }
  }

  async updateUserType(userId: string, userType: UserType) {
    return this.usersService.updateUserType(userId, userType);
  }
}

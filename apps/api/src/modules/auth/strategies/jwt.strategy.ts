import { Injectable, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { ContractorsService } from '../../contractors/contractors.service';
import { TokenPayload } from '../auth.service';
import { UserType } from '../../users/entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => ContractorsService))
    private readonly contractorsService: ContractorsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'default-secret',
    });
  }

  async validate(payload: TokenPayload) {
    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }

    // If user is a contractor, include contractorId
    let contractorId: string | undefined;
    if (user.userType === UserType.CONTRACTOR) {
      const contractor = await this.contractorsService.findByUserId(user.id);
      contractorId = contractor?.id;
    }

    return {
      id: user.id,
      email: user.email,
      userType: user.userType,
      contractorId,
    };
  }
}

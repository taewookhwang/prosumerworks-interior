import { IsEnum } from 'class-validator';
import { UserType } from '../../users/entities/user.entity';

export class UpdateUserTypeDto {
  @IsEnum(UserType)
  userType: UserType;
}

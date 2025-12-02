import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { ContractorsModule } from '../contractors/contractors.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    forwardRef(() => ContractorsModule),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contractor } from './entities/contractor.entity';
import { ContractorsService } from './contractors.service';
import { ContractorsController } from './contractors.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Contractor]),
    forwardRef(() => UsersModule),
  ],
  controllers: [ContractorsController],
  providers: [ContractorsService],
  exports: [ContractorsService],
})
export class ContractorsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Apartment } from './entities/apartment.entity';
import { ApartmentFloorPlan } from './entities/apartment-floor-plan.entity';
import { ApartmentsController } from './apartments.controller';
import { ApartmentsService } from './apartments.service';
import { ApsModule } from '../aps/aps.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Apartment, ApartmentFloorPlan]),
    ApsModule, // APS 서비스 사용
  ],
  controllers: [ApartmentsController],
  providers: [ApartmentsService],
  exports: [ApartmentsService],
})
export class ApartmentsModule {}

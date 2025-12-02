import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Portfolio,
  PortfolioImage,
  PortfolioLike,
  PortfolioSave,
  PortfolioView,
} from './entities/portfolio.entity';
import { PortfoliosService } from './portfolios.service';
import { PortfoliosController } from './portfolios.controller';
import { ContractorsModule } from '../contractors/contractors.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Portfolio,
      PortfolioImage,
      PortfolioLike,
      PortfolioSave,
      PortfolioView,
    ]),
    ContractorsModule,
  ],
  controllers: [PortfoliosController],
  providers: [PortfoliosService],
  exports: [PortfoliosService],
})
export class PortfoliosModule {}

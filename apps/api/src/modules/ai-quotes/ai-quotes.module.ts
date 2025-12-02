import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AIQuotesService } from './ai-quotes.service';
import { AIQuotesController } from './ai-quotes.controller';
import { AIQuote } from './entities/ai-quote.entity';
import { AIQuoteOffer } from './entities/ai-quote-offer.entity';
import { Contractor } from '../contractors/entities/contractor.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AIQuote, AIQuoteOffer, Contractor]),
  ],
  controllers: [AIQuotesController],
  providers: [AIQuotesService],
  exports: [AIQuotesService],
})
export class AIQuotesModule {}

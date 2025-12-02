import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { AIQuoteOfferStatus } from '../entities/ai-quote-offer.entity';

export class RespondAIQuoteOfferDto {
  @IsBoolean()
  accepted: boolean;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsNumber()
  proposedCost?: number;

  @IsOptional()
  @IsString()
  proposedSchedule?: string;

  // Helper to get status from accepted boolean
  getStatus(): AIQuoteOfferStatus {
    return this.accepted ? AIQuoteOfferStatus.ACCEPTED : AIQuoteOfferStatus.REJECTED;
  }
}

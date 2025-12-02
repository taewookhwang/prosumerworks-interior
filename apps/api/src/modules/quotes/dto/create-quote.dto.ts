import { IsString, IsOptional, IsNumber, IsUUID } from 'class-validator';

export class CreateQuoteDto {
  @IsUUID()
  contractorId: string;

  @IsUUID()
  @IsOptional()
  portfolioId?: string;

  @IsString()
  category: string;

  @IsString()
  locationCity: string;

  @IsString()
  @IsOptional()
  locationDistrict?: string;

  @IsNumber()
  @IsOptional()
  areaSize?: number;

  @IsString()
  description: string;

  @IsString()
  @IsOptional()
  preferredSchedule?: string;

  @IsNumber()
  @IsOptional()
  budgetMin?: number;

  @IsNumber()
  @IsOptional()
  budgetMax?: number;

  @IsString()
  contactPhone: string;
}

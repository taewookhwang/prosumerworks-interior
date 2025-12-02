import { IsString, IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CostBreakdownItemDto {
  @IsString()
  category: string;

  @IsNumber()
  dm: number;

  @IsNumber()
  dl: number;

  @IsNumber()
  oh: number;

  @IsNumber()
  total: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateAIQuoteDto {
  @IsString()
  title: string;

  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  locationCity?: string;

  @IsOptional()
  @IsString()
  locationDistrict?: string;

  @IsOptional()
  @IsNumber()
  areaSize?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  totalCost: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CostBreakdownItemDto)
  costBreakdown: CostBreakdownItemDto[];

  @IsOptional()
  @IsString()
  aiNotes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetSpecialties?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetAreas?: string[];
}

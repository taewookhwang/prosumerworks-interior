import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class FeedQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  subCategory?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  costMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  costMax?: number;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}

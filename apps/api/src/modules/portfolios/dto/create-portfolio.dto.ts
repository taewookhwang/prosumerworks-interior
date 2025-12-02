import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PortfolioImageDto {
  @IsString()
  imageUrl: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsString()
  imageType?: string;

  @IsOptional()
  @IsNumber()
  displayOrder?: number;
}

export class CreatePortfolioDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  subCategory?: string;

  @IsOptional()
  @IsString()
  apartmentName?: string;

  @IsOptional()
  @IsNumber()
  areaSize?: number;

  @IsOptional()
  @IsString()
  locationCity?: string;

  @IsOptional()
  @IsString()
  locationDistrict?: string;

  @IsOptional()
  @IsNumber()
  durationDays?: number;

  @IsOptional()
  @IsNumber()
  costMin?: number;

  @IsOptional()
  @IsNumber()
  costMax?: number;

  @IsOptional()
  @IsDateString()
  completedAt?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PortfolioImageDto)
  images: PortfolioImageDto[];
}

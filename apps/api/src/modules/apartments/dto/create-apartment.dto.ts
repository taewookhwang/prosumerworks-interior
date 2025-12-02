import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class CreateApartmentDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsNumber()
  @IsOptional()
  totalBuildings?: number;

  @IsNumber()
  @IsOptional()
  totalUnits?: number;

  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CreateApartmentFloorPlanDto {
  @IsString()
  apartmentId: string;

  @IsString()
  @IsOptional()
  buildingNumber?: string;

  @IsString()
  @IsOptional()
  unitNumber?: string;

  @IsString()
  @IsOptional()
  floorType?: string;

  @IsNumber()
  @IsOptional()
  areaPyeong?: number;

  @IsNumber()
  @IsOptional()
  areaSqm?: number;

  @IsNumber()
  @IsOptional()
  roomCount?: number;

  @IsNumber()
  @IsOptional()
  bathroomCount?: number;
}

export class UploadDwgDto {
  @IsString()
  apartmentId: string;

  @IsString()
  @IsOptional()
  buildingNumber?: string;

  @IsString()
  @IsOptional()
  unitNumber?: string;

  @IsString()
  @IsOptional()
  floorType?: string;

  @IsNumber()
  @IsOptional()
  areaPyeong?: number;
}

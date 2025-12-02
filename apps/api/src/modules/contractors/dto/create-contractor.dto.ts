import { IsString, IsArray, IsOptional, IsEmail } from 'class-validator';

export class CreateContractorDto {
  @IsString()
  companyName: string;

  @IsString()
  businessNumber: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  profileImage?: string;

  @IsOptional()
  @IsString()
  career?: string;

  @IsArray()
  @IsString({ each: true })
  specialties: string[];

  @IsArray()
  @IsString({ each: true })
  serviceAreas: string[];

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;
}

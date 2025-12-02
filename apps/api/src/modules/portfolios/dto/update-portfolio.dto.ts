import { PartialType } from '@nestjs/mapped-types';
import { CreatePortfolioDto, PortfolioImageDto } from './create-portfolio.dto';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePortfolioDto extends PartialType(CreatePortfolioDto) {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PortfolioImageDto)
  images?: PortfolioImageDto[];
}

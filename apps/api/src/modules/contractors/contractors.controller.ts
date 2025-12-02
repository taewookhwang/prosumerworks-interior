import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { ContractorsService } from './contractors.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateContractorDto } from './dto/create-contractor.dto';
import { UpdateContractorDto } from './dto/update-contractor.dto';

@Controller('contractors')
export class ContractorsController {
  constructor(private readonly contractorsService: ContractorsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('apply')
  async apply(@Request() req: ExpressRequest, @Body() createContractorDto: CreateContractorDto) {
    return this.contractorsService.apply((req as any).user.id, createContractorDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMyContractor(@Request() req: ExpressRequest) {
    return this.contractorsService.findByUserId((req as any).user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMyContractor(
    @Request() req: ExpressRequest,
    @Body() updateContractorDto: UpdateContractorDto,
  ) {
    const contractor = await this.contractorsService.findByUserId((req as any).user.id);
    if (!contractor) {
      throw new Error('Contractor not found');
    }
    return this.contractorsService.update(contractor.id, updateContractorDto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.contractorsService.findById(id);
  }
}

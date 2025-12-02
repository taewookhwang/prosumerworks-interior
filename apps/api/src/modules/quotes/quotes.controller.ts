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
import { QuotesService } from './quotes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { ContractorsService } from '../contractors/contractors.service';

@Controller('quotes')
@UseGuards(JwtAuthGuard)
export class QuotesController {
  constructor(
    private readonly quotesService: QuotesService,
    private readonly contractorsService: ContractorsService,
  ) {}

  @Post()
  async create(@Request() req: ExpressRequest, @Body() dto: CreateQuoteDto) {
    return this.quotesService.create((req as any).user.id, dto);
  }

  @Get('my')
  async getMyQuotes(@Request() req: ExpressRequest) {
    return this.quotesService.findByCustomer((req as any).user.id);
  }

  @Get('received')
  async getReceivedQuotes(@Request() req: ExpressRequest) {
    const contractor = await this.contractorsService.findByUserId(
      (req as any).user.id,
    );
    if (!contractor) {
      return [];
    }
    return this.quotesService.findByContractor(contractor.id);
  }

  @Get(':id')
  async getQuote(@Param('id') id: string) {
    return this.quotesService.findById(id);
  }

  @Patch(':id/view')
  async markAsViewed(@Request() req: ExpressRequest, @Param('id') id: string) {
    const contractor = await this.contractorsService.findByUserId(
      (req as any).user.id,
    );
    if (!contractor) {
      throw new Error('Contractor not found');
    }
    return this.quotesService.markAsViewed(id, contractor.id);
  }

  @Patch(':id/respond')
  async respond(
    @Request() req: ExpressRequest,
    @Param('id') id: string,
    @Body('response') response: string,
  ) {
    const contractor = await this.contractorsService.findByUserId(
      (req as any).user.id,
    );
    if (!contractor) {
      throw new Error('Contractor not found');
    }
    return this.quotesService.respond(id, contractor.id, response);
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AIQuotesService } from './ai-quotes.service';
import { CreateAIQuoteDto } from './dto/create-ai-quote.dto';
import { RespondAIQuoteOfferDto } from './dto/respond-ai-quote-offer.dto';

@Controller('ai-quotes')
@UseGuards(JwtAuthGuard)
export class AIQuotesController {
  constructor(private readonly aiQuotesService: AIQuotesService) {}

  // Customer endpoints
  @Post()
  async create(@Request() req, @Body() dto: CreateAIQuoteDto) {
    return this.aiQuotesService.create(req.user.id, dto);
  }

  @Get('my-quotes')
  async findMyQuotes(@Request() req) {
    return this.aiQuotesService.findByCustomer(req.user.id);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.aiQuotesService.findById(id);
  }

  @Post(':id/send')
  async sendToContractors(@Request() req, @Param('id') id: string) {
    return this.aiQuotesService.sendToContractors(id, req.user.id);
  }

  @Get(':id/offers')
  async findOffersForQuote(@Request() req, @Param('id') id: string) {
    return this.aiQuotesService.findOffersForQuote(id, req.user.id);
  }

  @Post('offers/:offerId/accept')
  async acceptOffer(
    @Request() req,
    @Param('offerId') offerId: string,
    @Body('chatRoomId') chatRoomId: string,
  ) {
    return this.aiQuotesService.acceptOffer(offerId, req.user.id, chatRoomId);
  }

  // Contractor endpoints
  @Get('contractor/offers')
  async findMyOffers(@Request() req) {
    return this.aiQuotesService.findOffersForContractor(req.user.contractorId);
  }

  @Get('contractor/pending-offers')
  async findPendingOffers(@Request() req) {
    return this.aiQuotesService.findPendingOffersForContractor(req.user.contractorId);
  }

  @Post('contractor/offers/:offerId/respond')
  async respondToOffer(
    @Request() req,
    @Param('offerId') offerId: string,
    @Body() dto: RespondAIQuoteOfferDto,
  ) {
    return this.aiQuotesService.respondToOffer(offerId, req.user.contractorId, dto);
  }
}

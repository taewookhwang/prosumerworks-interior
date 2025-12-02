import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quote, QuoteStatus } from './entities/quote.entity';
import { CreateQuoteDto } from './dto/create-quote.dto';

@Injectable()
export class QuotesService {
  constructor(
    @InjectRepository(Quote)
    private readonly quoteRepository: Repository<Quote>,
  ) {}

  async create(customerId: string, dto: CreateQuoteDto): Promise<Quote> {
    const quote = this.quoteRepository.create({
      customerId,
      ...dto,
    });
    return this.quoteRepository.save(quote);
  }

  async findByCustomer(customerId: string): Promise<Quote[]> {
    return this.quoteRepository.find({
      where: { customerId },
      relations: ['contractor', 'contractor.user', 'portfolio'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByContractor(contractorId: string): Promise<Quote[]> {
    return this.quoteRepository.find({
      where: { contractorId },
      relations: ['customer', 'portfolio'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Quote> {
    const quote = await this.quoteRepository.findOne({
      where: { id },
      relations: ['customer', 'contractor', 'contractor.user', 'portfolio'],
    });
    if (!quote) {
      throw new NotFoundException('Quote not found');
    }
    return quote;
  }

  async markAsViewed(id: string, contractorId: string): Promise<Quote> {
    const quote = await this.findById(id);
    if (quote.contractorId !== contractorId) {
      throw new NotFoundException('Quote not found');
    }
    if (quote.status === QuoteStatus.PENDING) {
      await this.quoteRepository.update(id, { status: QuoteStatus.VIEWED });
    }
    return this.findById(id);
  }

  async respond(
    id: string,
    contractorId: string,
    response: string,
  ): Promise<Quote> {
    const quote = await this.findById(id);
    if (quote.contractorId !== contractorId) {
      throw new NotFoundException('Quote not found');
    }
    await this.quoteRepository.update(id, {
      status: QuoteStatus.RESPONDED,
      contractorResponse: response,
      respondedAt: new Date(),
    });
    return this.findById(id);
  }
}

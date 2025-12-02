import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { AIQuote, AIQuoteStatus } from './entities/ai-quote.entity';
import { AIQuoteOffer, AIQuoteOfferStatus } from './entities/ai-quote-offer.entity';
import { CreateAIQuoteDto } from './dto/create-ai-quote.dto';
import { RespondAIQuoteOfferDto } from './dto/respond-ai-quote-offer.dto';
import { Contractor, ContractorStatus } from '../contractors/entities/contractor.entity';

@Injectable()
export class AIQuotesService {
  constructor(
    @InjectRepository(AIQuote)
    private readonly aiQuoteRepository: Repository<AIQuote>,
    @InjectRepository(AIQuoteOffer)
    private readonly aiQuoteOfferRepository: Repository<AIQuoteOffer>,
    @InjectRepository(Contractor)
    private readonly contractorRepository: Repository<Contractor>,
  ) {}

  async create(customerId: string, dto: CreateAIQuoteDto): Promise<AIQuote> {
    const aiQuote = this.aiQuoteRepository.create({
      customerId,
      ...dto,
    });
    return this.aiQuoteRepository.save(aiQuote);
  }

  async findByCustomer(customerId: string): Promise<AIQuote[]> {
    return this.aiQuoteRepository.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<AIQuote> {
    const aiQuote = await this.aiQuoteRepository.findOne({
      where: { id },
      relations: ['customer'],
    });
    if (!aiQuote) {
      throw new NotFoundException('AI Quote not found');
    }
    return aiQuote;
  }

  async sendToContractors(id: string, customerId: string): Promise<AIQuote> {
    const aiQuote = await this.findById(id);

    if (aiQuote.customerId !== customerId) {
      throw new NotFoundException('AI Quote not found');
    }

    if (aiQuote.status !== AIQuoteStatus.DRAFT) {
      throw new BadRequestException('Quote already sent');
    }

    // Find matching contractors based on specialties and service areas
    const contractors = await this.findMatchingContractors(
      aiQuote.targetSpecialties,
      aiQuote.targetAreas,
      aiQuote.category,
    );

    if (contractors.length === 0) {
      throw new BadRequestException('No matching contractors found');
    }

    // Create offers for each matching contractor
    const offers = contractors.map((contractor) =>
      this.aiQuoteOfferRepository.create({
        aiQuoteId: id,
        contractorId: contractor.id,
        notifiedAt: new Date(),
      }),
    );

    await this.aiQuoteOfferRepository.save(offers);

    // Update quote status
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    await this.aiQuoteRepository.update(id, {
      status: AIQuoteStatus.SENT,
      sentAt: new Date(),
      expiresAt,
    });

    return this.findById(id);
  }

  private async findMatchingContractors(
    specialties: string[],
    areas: string[],
    category: string,
  ): Promise<Contractor[]> {
    const query = this.contractorRepository.createQueryBuilder('contractor')
      .where('contractor.status = :status', { status: ContractorStatus.APPROVED });

    // If category is provided, match against specialties
    if (category) {
      query.andWhere(':category = ANY(contractor.specialties)', { category });
    }

    // If specific areas are provided, match against service areas
    if (areas && areas.length > 0) {
      query.andWhere('contractor.serviceAreas && :areas', { areas });
    }

    return query.getMany();
  }

  // Contractor-side methods
  async findOffersForContractor(contractorId: string): Promise<AIQuoteOffer[]> {
    return this.aiQuoteOfferRepository.find({
      where: { contractorId },
      relations: ['aiQuote', 'aiQuote.customer'],
      order: { createdAt: 'DESC' },
    });
  }

  async findPendingOffersForContractor(contractorId: string): Promise<AIQuoteOffer[]> {
    return this.aiQuoteOfferRepository.find({
      where: {
        contractorId,
        status: AIQuoteOfferStatus.PENDING,
      },
      relations: ['aiQuote', 'aiQuote.customer'],
      order: { createdAt: 'DESC' },
    });
  }

  async respondToOffer(
    offerId: string,
    contractorId: string,
    dto: RespondAIQuoteOfferDto,
  ): Promise<AIQuoteOffer> {
    const offer = await this.aiQuoteOfferRepository.findOne({
      where: { id: offerId },
      relations: ['aiQuote'],
    });

    if (!offer || offer.contractorId !== contractorId) {
      throw new NotFoundException('Offer not found');
    }

    if (offer.status !== AIQuoteOfferStatus.PENDING) {
      throw new BadRequestException('Offer already responded');
    }

    // Convert boolean accepted to status enum
    const status = dto.accepted ? AIQuoteOfferStatus.ACCEPTED : AIQuoteOfferStatus.REJECTED;

    await this.aiQuoteOfferRepository.update(offerId, {
      status,
      contractorMessage: dto.message,
      proposedCost: dto.proposedCost,
      proposedSchedule: dto.proposedSchedule,
      respondedAt: new Date(),
    });

    // If accepted, update AI Quote status
    if (dto.accepted) {
      await this.aiQuoteRepository.update(offer.aiQuoteId, {
        status: AIQuoteStatus.HAS_OFFERS,
      });
    }

    return this.aiQuoteOfferRepository.findOne({
      where: { id: offerId },
      relations: ['aiQuote', 'aiQuote.customer', 'contractor', 'contractor.user'],
    });
  }

  // Get offers for a customer's quote
  async findOffersForQuote(quoteId: string, customerId: string): Promise<AIQuoteOffer[]> {
    const aiQuote = await this.findById(quoteId);

    if (aiQuote.customerId !== customerId) {
      throw new NotFoundException('AI Quote not found');
    }

    return this.aiQuoteOfferRepository.find({
      where: { aiQuoteId: quoteId },
      relations: ['contractor', 'contractor.user'],
      order: { respondedAt: 'DESC' },
    });
  }

  // Accept an offer and create chat room connection
  async acceptOffer(
    offerId: string,
    customerId: string,
    chatRoomId: string,
  ): Promise<AIQuoteOffer> {
    const offer = await this.aiQuoteOfferRepository.findOne({
      where: { id: offerId },
      relations: ['aiQuote'],
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (offer.aiQuote.customerId !== customerId) {
      throw new NotFoundException('Offer not found');
    }

    if (offer.status !== AIQuoteOfferStatus.ACCEPTED) {
      throw new BadRequestException('Offer not accepted by contractor');
    }

    // Link the chat room
    await this.aiQuoteOfferRepository.update(offerId, {
      chatRoomId,
    });

    // Update quote status to accepted
    await this.aiQuoteRepository.update(offer.aiQuoteId, {
      status: AIQuoteStatus.ACCEPTED,
    });

    return this.aiQuoteOfferRepository.findOne({
      where: { id: offerId },
      relations: ['aiQuote', 'contractor', 'contractor.user'],
    });
  }
}

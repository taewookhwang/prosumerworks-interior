import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AIQuote } from './ai-quote.entity';
import { Contractor } from '../../contractors/entities/contractor.entity';

export enum AIQuoteOfferStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

@Entity('ai_quote_offers')
export class AIQuoteOffer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ai_quote_id' })
  aiQuoteId: string;

  @ManyToOne(() => AIQuote)
  @JoinColumn({ name: 'ai_quote_id' })
  aiQuote: AIQuote;

  @Column({ name: 'contractor_id' })
  contractorId: string;

  @ManyToOne(() => Contractor)
  @JoinColumn({ name: 'contractor_id' })
  contractor: Contractor;

  @Column({
    type: 'enum',
    enum: AIQuoteOfferStatus,
    default: AIQuoteOfferStatus.PENDING,
  })
  status: AIQuoteOfferStatus;

  @Column({ name: 'contractor_message', type: 'text', nullable: true })
  contractorMessage: string;

  @Column({ name: 'proposed_cost', type: 'int', nullable: true })
  proposedCost: number;

  @Column({ name: 'proposed_schedule', type: 'text', nullable: true })
  proposedSchedule: string;

  @Column({ name: 'notified_at', nullable: true })
  notifiedAt: Date;

  @Column({ name: 'responded_at', nullable: true })
  respondedAt: Date;

  @Column({ name: 'chat_room_id', nullable: true })
  chatRoomId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

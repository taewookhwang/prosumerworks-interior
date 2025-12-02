import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Contractor } from '../../contractors/entities/contractor.entity';
import { Portfolio } from '../../portfolios/entities/portfolio.entity';

export enum QuoteStatus {
  PENDING = 'pending',
  VIEWED = 'viewed',
  RESPONDED = 'responded',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('quotes')
export class Quote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'customer_id' })
  customerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  @Column({ name: 'contractor_id' })
  contractorId: string;

  @ManyToOne(() => Contractor)
  @JoinColumn({ name: 'contractor_id' })
  contractor: Contractor;

  @Column({ name: 'portfolio_id', nullable: true })
  portfolioId: string;

  @ManyToOne(() => Portfolio)
  @JoinColumn({ name: 'portfolio_id' })
  portfolio: Portfolio;

  @Column()
  category: string;

  @Column({ name: 'location_city' })
  locationCity: string;

  @Column({ name: 'location_district', nullable: true })
  locationDistrict: string;

  @Column({ name: 'area_size', nullable: true })
  areaSize: number;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'preferred_schedule', nullable: true })
  preferredSchedule: string;

  @Column({ name: 'budget_min', nullable: true })
  budgetMin: number;

  @Column({ name: 'budget_max', nullable: true })
  budgetMax: number;

  @Column({ name: 'contact_phone' })
  contactPhone: string;

  @Column({
    type: 'enum',
    enum: QuoteStatus,
    default: QuoteStatus.PENDING,
  })
  status: QuoteStatus;

  @Column({ name: 'contractor_response', type: 'text', nullable: true })
  contractorResponse: string;

  @Column({ name: 'responded_at', nullable: true })
  respondedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum AIQuoteStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  HAS_OFFERS = 'has_offers',
  ACCEPTED = 'accepted',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export interface CostBreakdownItem {
  category: string;
  dm: number; // Direct Material - 재료비 (만원)
  dl: number; // Direct Labor - 노무비 (만원)
  oh: number; // Overhead - 경비 (만원)
  total: number;
  note?: string;
}

@Entity('ai_quotes')
export class AIQuote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'customer_id' })
  customerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  @Column()
  title: string;

  @Column()
  category: string;

  @Column({ name: 'location_city', nullable: true })
  locationCity: string;

  @Column({ name: 'location_district', nullable: true })
  locationDistrict: string;

  @Column({ name: 'area_size', type: 'float', nullable: true })
  areaSize: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'total_cost', type: 'int' })
  totalCost: number;

  @Column({ name: 'cost_breakdown', type: 'jsonb' })
  costBreakdown: CostBreakdownItem[];

  @Column({ name: 'ai_notes', type: 'text', nullable: true })
  aiNotes: string;

  @Column({
    type: 'enum',
    enum: AIQuoteStatus,
    default: AIQuoteStatus.DRAFT,
  })
  status: AIQuoteStatus;

  @Column({ name: 'sent_at', nullable: true })
  sentAt: Date;

  @Column({ name: 'expires_at', nullable: true })
  expiresAt: Date;

  @Column('varchar', { name: 'target_specialties', array: true, default: '{}' })
  targetSpecialties: string[];

  @Column('varchar', { name: 'target_areas', array: true, default: '{}' })
  targetAreas: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

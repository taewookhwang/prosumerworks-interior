import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Portfolio } from '../../portfolios/entities/portfolio.entity';

export enum ContractorStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended',
}

@Entity('contractors')
export class Contractor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'company_name' })
  companyName: string;

  @Column({ name: 'business_number' })
  businessNumber: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'profile_image', nullable: true })
  profileImage: string;

  @Column({ type: 'text', nullable: true })
  career: string;

  @Column('varchar', { array: true, default: '{}' })
  specialties: string[];

  @Column('varchar', { name: 'service_areas', array: true, default: '{}' })
  serviceAreas: string[];

  @Column({ name: 'contact_phone', nullable: true })
  contactPhone: string;

  @Column({ name: 'contact_email', nullable: true })
  contactEmail: string;

  @Column({
    type: 'enum',
    enum: ContractorStatus,
    default: ContractorStatus.PENDING,
  })
  status: ContractorStatus;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ name: 'approved_at', nullable: true })
  approvedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Portfolio, (portfolio) => portfolio.contractor)
  portfolios: Portfolio[];
}

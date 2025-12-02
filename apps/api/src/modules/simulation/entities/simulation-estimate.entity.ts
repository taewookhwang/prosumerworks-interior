import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SimulationProject } from './simulation-project.entity';
import { AIQuote } from '../../ai-quotes/entities/ai-quote.entity';

export interface CostBreakdownItem {
  category: string;
  dm: number;  // Direct Material - 재료비
  dl: number;  // Direct Labor - 노무비
  oh: number;  // Overhead - 경비
  total: number;
  note?: string;
}

export interface SchedulePhase {
  day: number;
  phase: string;
  task: string;
  durationDays: number;
  workers?: number;
  isNoiseWork?: boolean;
  note?: string;
}

@Entity('simulation_estimates')
export class SimulationEstimate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @ManyToOne(() => SimulationProject, (project) => project.estimates)
  @JoinColumn({ name: 'project_id' })
  project: SimulationProject;

  @Column({ name: 'demolition_cost', type: 'jsonb', nullable: true })
  demolitionCost: CostBreakdownItem[];

  @Column({ name: 'material_cost', type: 'jsonb', nullable: true })
  materialCost: CostBreakdownItem[];

  @Column({ name: 'labor_cost', type: 'jsonb', nullable: true })
  laborCost: CostBreakdownItem[];

  @Column({ name: 'overhead_cost', type: 'jsonb', nullable: true })
  overheadCost: CostBreakdownItem[];

  @Column({ nullable: true })
  subtotal: number;

  @Column({ name: 'contingency_rate', type: 'float', default: 0.1 })
  contingencyRate: number;

  @Column({ name: 'total_cost', nullable: true })
  totalCost: number;

  @Column({ type: 'jsonb', nullable: true })
  schedule: SchedulePhase[];

  @Column({ name: 'estimated_days', nullable: true })
  estimatedDays: number;

  @Column({ name: 'ai_quote_id', nullable: true })
  aiQuoteId: string;

  @ManyToOne(() => AIQuote)
  @JoinColumn({ name: 'ai_quote_id' })
  aiQuote: AIQuote;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SimulationProject } from './simulation-project.entity';
import { Material } from '../../materials/entities/material.entity';

@Entity('simulation_carts')
export class SimulationCart {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @ManyToOne(() => SimulationProject, (project) => project.cartItems)
  @JoinColumn({ name: 'project_id' })
  project: SimulationProject;

  @Column({ name: 'material_id' })
  materialId: string;

  @ManyToOne(() => Material)
  @JoinColumn({ name: 'material_id' })
  material: Material;

  @Column({ type: 'float' })
  quantity: number;

  @Column({ name: 'unit_price_snapshot', nullable: true })
  unitPriceSnapshot: number;

  @Column({ name: 'room_location', nullable: true })
  roomLocation: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

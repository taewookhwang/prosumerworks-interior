import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { FloorPlan } from './floor-plan.entity';

export enum ElementType {
  WALL = 'wall',
  PIPE = 'pipe',
  ELECTRICAL = 'electrical',
  WINDOW = 'window',
  DOOR = 'door',
}

export enum WallSubType {
  LOAD_BEARING = 'load_bearing',
  PARTITION = 'partition',
}

export interface Coordinate {
  x: number;
  y: number;
}

@Entity('structural_elements')
export class StructuralElement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'floor_plan_id' })
  floorPlanId: string;

  @ManyToOne(() => FloorPlan, (floorPlan) => floorPlan.structuralElements)
  @JoinColumn({ name: 'floor_plan_id' })
  floorPlan: FloorPlan;

  @Column({ name: 'element_type' })
  elementType: ElementType;

  @Column({ name: 'sub_type', nullable: true })
  subType: string;

  @Column({ type: 'jsonb' })
  coordinates: Coordinate[];

  @Column({ name: 'is_demolishable', default: true })
  isDemolishable: boolean;

  @Column({ name: 'is_selected_for_demolition', default: false })
  isSelectedForDemolition: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

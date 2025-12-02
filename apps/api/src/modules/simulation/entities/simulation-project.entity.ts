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
import { FloorPlan } from './floor-plan.entity';
import { DesignSimulation } from './design-simulation.entity';
import { SimulationEstimate } from './simulation-estimate.entity';
import { SimulationCart } from './simulation-cart.entity';

export enum SimulationProjectStatus {
  DRAFT = 'draft',
  ANALYZING = 'analyzing',
  PLANNING = 'planning',
  DESIGNING = 'designing',
  ESTIMATING = 'estimating',
  COMPLETED = 'completed',
}

export enum PropertyType {
  APARTMENT = 'apartment',
  HOUSE = 'house',
  OFFICE = 'office',
  COMMERCIAL = 'commercial',
}

@Entity('simulation_projects')
export class SimulationProject {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'customer_id' })
  customerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  @Column()
  title: string;

  @Column({ default: SimulationProjectStatus.DRAFT })
  status: SimulationProjectStatus;

  @Column({ name: 'property_type', nullable: true })
  propertyType: PropertyType;

  @Column({ name: 'area_size', type: 'float', nullable: true })
  areaSize: number;

  @Column({ name: 'location_city', nullable: true })
  locationCity: string;

  @Column({ name: 'location_district', nullable: true })
  locationDistrict: string;

  @OneToMany(() => FloorPlan, (floorPlan) => floorPlan.project)
  floorPlans: FloorPlan[];

  @OneToMany(() => DesignSimulation, (design) => design.project)
  designSimulations: DesignSimulation[];

  @OneToMany(() => SimulationCart, (cart) => cart.project)
  cartItems: SimulationCart[];

  @OneToMany(() => SimulationEstimate, (estimate) => estimate.project)
  estimates: SimulationEstimate[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

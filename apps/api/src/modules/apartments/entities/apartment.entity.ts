import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ApartmentFloorPlan } from './apartment-floor-plan.entity';

@Entity('apartments')
export class Apartment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'name' })
  name: string; // 예: "화성시 동탄 레이크파크"

  @Column({ name: 'address', type: 'text', nullable: true })
  address: string;

  @Column({ name: 'total_buildings', nullable: true })
  totalBuildings: number; // 총 동수

  @Column({ name: 'total_units', nullable: true })
  totalUnits: number; // 총 세대수

  @Column({ name: 'thumbnail_url', type: 'text', nullable: true })
  thumbnailUrl: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => ApartmentFloorPlan, (plan) => plan.apartment)
  floorPlans: ApartmentFloorPlan[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

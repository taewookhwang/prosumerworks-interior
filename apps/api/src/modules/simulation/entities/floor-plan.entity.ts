import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { SimulationProject } from './simulation-project.entity';
import { StructuralElement } from './structural-element.entity';

@Entity('floor_plans')
export class FloorPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @ManyToOne(() => SimulationProject, (project) => project.floorPlans)
  @JoinColumn({ name: 'project_id' })
  project: SimulationProject;

  @Column({ name: 'original_image_url', type: 'text' })
  originalImageUrl: string;

  @Column({ name: 'analyzed_image_url', type: 'text', nullable: true })
  analyzedImageUrl: string;

  @Column({ name: 'clean_slate_image_url', type: 'text', nullable: true })
  cleanSlateImageUrl: string;

  @OneToMany(() => StructuralElement, (element) => element.floorPlan)
  structuralElements: StructuralElement[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

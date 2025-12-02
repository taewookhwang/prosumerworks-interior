import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SimulationProject } from './simulation-project.entity';

@Entity('design_simulations')
export class DesignSimulation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @ManyToOne(() => SimulationProject, (project) => project.designSimulations)
  @JoinColumn({ name: 'project_id' })
  project: SimulationProject;

  @Column({ name: 'style_prompt', type: 'text', nullable: true })
  stylePrompt: string;

  @Column({ name: 'reference_image_urls', type: 'text', array: true, nullable: true })
  referenceImageUrls: string[];

  @Column({ name: 'generated_image_url', type: 'text', nullable: true })
  generatedImageUrl: string;

  @Column({ name: 'generated_prompt', type: 'text', nullable: true })
  generatedPrompt: string;

  @Column({ name: 'is_feasible', nullable: true })
  isFeasible: boolean;

  @Column({ name: 'feasibility_notes', type: 'text', nullable: true })
  feasibilityNotes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

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
import { Contractor } from '../../contractors/entities/contractor.entity';

@Entity('portfolios')
export class Portfolio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contractor_id' })
  contractorId: string;

  @ManyToOne(() => Contractor)
  @JoinColumn({ name: 'contractor_id' })
  contractor: Contractor;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column()
  category: string;

  @Column({ name: 'sub_category', nullable: true })
  subCategory: string;

  @Column({ name: 'apartment_name', nullable: true })
  apartmentName: string;

  @Column({ name: 'area_size', nullable: true })
  areaSize: number;

  @Column({ name: 'location_city', nullable: true })
  locationCity: string;

  @Column({ name: 'location_district', nullable: true })
  locationDistrict: string;

  @Column({ name: 'duration_days', nullable: true })
  durationDays: number;

  @Column({ name: 'cost_min', nullable: true })
  costMin: number;

  @Column({ name: 'cost_max', nullable: true })
  costMax: number;

  @Column({ name: 'like_count', default: 0 })
  likeCount: number;

  @Column({ name: 'save_count', default: 0 })
  saveCount: number;

  @Column({ name: 'view_count', default: 0 })
  viewCount: number;

  @Column({ name: 'is_published', default: true })
  isPublished: boolean;

  @Column({ name: 'completed_at', type: 'date', nullable: true })
  completedAt: Date;

  @OneToMany(() => PortfolioImage, (image) => image.portfolio)
  images: PortfolioImage[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('portfolio_images')
export class PortfolioImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'portfolio_id' })
  portfolioId: string;

  @ManyToOne(() => Portfolio, (portfolio) => portfolio.images, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'portfolio_id' })
  portfolio: Portfolio;

  @Column({ name: 'image_url' })
  imageUrl: string;

  @Column({ name: 'thumbnail_url', nullable: true })
  thumbnailUrl: string;

  @Column({ name: 'image_type', default: 'after' })
  imageType: string; // before, after, progress

  @Column({ name: 'display_order', default: 0 })
  displayOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity('portfolio_likes')
export class PortfolioLike {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'portfolio_id' })
  portfolioId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity('portfolio_saves')
export class PortfolioSave {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'portfolio_id' })
  portfolioId: string;

  @ManyToOne(() => Portfolio)
  @JoinColumn({ name: 'portfolio_id' })
  portfolio: Portfolio;

  @Column({ name: 'user_id' })
  userId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity('portfolio_views')
export class PortfolioView {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'portfolio_id' })
  portfolioId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

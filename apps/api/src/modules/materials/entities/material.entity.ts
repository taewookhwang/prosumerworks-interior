import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum MaterialCategory {
  FLOORING = 'flooring',      // 바닥재
  WALL = 'wall',              // 벽지/페인트
  TILE = 'tile',              // 타일
  LIGHTING = 'lighting',      // 조명
  FURNITURE = 'furniture',    // 가구
  KITCHEN = 'kitchen',        // 주방
  BATHROOM = 'bathroom',      // 욕실
  DOOR = 'door',              // 문
  WINDOW = 'window',          // 창문
  ELECTRICAL = 'electrical',  // 전기/콘센트
  PLUMBING = 'plumbing',      // 배관
}

export enum InstallationType {
  TILE = 'tile',
  WOOD = 'wood',
  PAINT = 'paint',
  WALLPAPER = 'wallpaper',
  INSTALL = 'install',
  PLUMBING = 'plumbing',
  ELECTRICAL = 'electrical',
}

export interface MaterialSpecifications {
  width?: number;
  height?: number;
  thickness?: number;
  color?: string;
  material?: string;
  warranty?: string;
  [key: string]: any;
}

@Entity('materials')
export class Material {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  category: MaterialCategory;

  @Column({ name: 'sub_category', nullable: true })
  subCategory: string;

  @Column({ nullable: true })
  brand: string;

  @Column({ name: 'model_number', nullable: true })
  modelNumber: string;

  @Column({ name: 'unit_price' })
  unitPrice: number;

  @Column()
  unit: string;  // sqm, piece, set, meter 등

  @Column({ type: 'jsonb', nullable: true })
  specifications: MaterialSpecifications;

  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl: string;

  @Column({ name: 'installation_type', nullable: true })
  installationType: InstallationType;

  @Column({ name: 'labor_cost_per_unit', nullable: true })
  laborCostPerUnit: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

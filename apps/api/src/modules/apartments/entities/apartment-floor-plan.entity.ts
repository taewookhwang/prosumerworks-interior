import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Apartment } from './apartment.entity';

/**
 * DWG 파싱 결과에서 추출된 요소 정보
 */
export interface DwgElementData {
  id: string;
  type: 'wall' | 'door' | 'window' | 'column' | 'room' | 'bathroom' | 'kitchen' | 'fixture' | 'furniture' | 'other';
  name: string;
  layer: string;
  coordinates: {
    x: number;
    y: number;
    width?: number;
    height?: number;
  };
  properties: Record<string, any>;
}

/**
 * 아파트 도면 (DWG 파싱 결과 저장)
 */
@Entity('apartment_floor_plans')
export class ApartmentFloorPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'apartment_id' })
  apartmentId: string;

  @ManyToOne(() => Apartment, (apartment) => apartment.floorPlans)
  @JoinColumn({ name: 'apartment_id' })
  apartment: Apartment;

  @Column({ name: 'building_number', nullable: true })
  buildingNumber: string; // 동 번호 (예: "101동")

  @Column({ name: 'unit_number', nullable: true })
  unitNumber: string; // 호수 (예: "1501호")

  @Column({ name: 'floor_type', nullable: true })
  floorType: string; // 평형 타입 (예: "84A", "59B")

  @Column({ name: 'area_pyeong', type: 'decimal', precision: 10, scale: 2, nullable: true })
  areaPyeong: number; // 평수

  @Column({ name: 'area_sqm', type: 'decimal', precision: 10, scale: 2, nullable: true })
  areaSqm: number; // 제곱미터

  @Column({ name: 'room_count', nullable: true })
  roomCount: number;

  @Column({ name: 'bathroom_count', nullable: true })
  bathroomCount: number;

  // DWG 관련 정보
  @Column({ name: 'dwg_file_name', nullable: true })
  dwgFileName: string;

  @Column({ name: 'dwg_urn', type: 'text', nullable: true })
  dwgUrn: string; // Autodesk URN

  // 파싱된 요소 데이터 (JSON)
  @Column({ name: 'elements', type: 'jsonb', nullable: true })
  elements: DwgElementData[];

  @Column({ name: 'walls', type: 'jsonb', nullable: true })
  walls: DwgElementData[];

  @Column({ name: 'doors', type: 'jsonb', nullable: true })
  doors: DwgElementData[];

  @Column({ name: 'windows', type: 'jsonb', nullable: true })
  windows: DwgElementData[];

  @Column({ name: 'bathroom_elements', type: 'jsonb', nullable: true })
  bathroomElements: DwgElementData[];

  @Column({ name: 'kitchen_elements', type: 'jsonb', nullable: true })
  kitchenElements: DwgElementData[];

  @Column({ name: 'fixtures', type: 'jsonb', nullable: true })
  fixtures: DwgElementData[];

  @Column({ name: 'furniture', type: 'jsonb', nullable: true })
  furniture: DwgElementData[];

  @Column({ name: 'rooms', type: 'jsonb', nullable: true })
  rooms: {
    name: string;
    area: number;
    coordinates: { x: number; y: number; width: number; height: number };
  }[];

  // AI 분석용 원본 데이터
  @Column({ name: 'raw_object_tree', type: 'jsonb', nullable: true })
  rawObjectTree: any;

  @Column({ name: 'raw_properties', type: 'jsonb', nullable: true })
  rawProperties: any;

  // 메타데이터
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: {
    units: string;
    totalArea?: number;
    scale?: number;
    totalElements: number;
    classifiedElements: number;
  };

  @Column({ name: 'thumbnail_url', type: 'text', nullable: true })
  thumbnailUrl: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

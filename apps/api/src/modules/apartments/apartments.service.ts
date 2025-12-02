import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Apartment } from './entities/apartment.entity';
import { ApartmentFloorPlan, DwgElementData } from './entities/apartment-floor-plan.entity';
import { CreateApartmentDto, CreateApartmentFloorPlanDto, UploadDwgDto } from './dto/create-apartment.dto';
import { ApsService, DwgParseResult } from '../aps/aps.service';

/**
 * FloorPlanAnalysis 형식 (프론트엔드 시뮬레이터용)
 */
export interface FloorPlanAnalysis {
  floorPlanId: string;
  imageDimensions: { width: number; height: number };
  estimatedArea: number; // in pyeong
  roomCount: number;
  bathroomCount: number;
  elements: StructuralElement[];
  analysisSummary: string;
  warnings: string[];
}

export interface StructuralElement {
  elementType: 'load_bearing_wall' | 'non_load_bearing_wall' | 'pillar' | 'beam' | 'window' | 'door' | 'plumbing' | 'electrical' | 'hvac';
  label: string;
  position: { x: number; y: number; width: number; height: number };
  isDemolishable: boolean;
  demolitionRisk: 'none' | 'low' | 'medium' | 'high';
  demolitionNote?: string;
  confidence: number;
}

@Injectable()
export class ApartmentsService {
  private readonly logger = new Logger(ApartmentsService.name);

  constructor(
    @InjectRepository(Apartment)
    private apartmentRepository: Repository<Apartment>,
    @InjectRepository(ApartmentFloorPlan)
    private floorPlanRepository: Repository<ApartmentFloorPlan>,
    private apsService: ApsService,
  ) {}

  // ================== 아파트 관리 ==================

  async createApartment(dto: CreateApartmentDto): Promise<Apartment> {
    const apartment = this.apartmentRepository.create(dto);
    return this.apartmentRepository.save(apartment);
  }

  async findAllApartments(): Promise<Apartment[]> {
    return this.apartmentRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findApartmentById(id: string): Promise<Apartment> {
    const apartment = await this.apartmentRepository.findOne({
      where: { id },
      relations: ['floorPlans'],
    });
    if (!apartment) {
      throw new NotFoundException(`Apartment not found: ${id}`);
    }
    return apartment;
  }

  // ================== 도면 관리 ==================

  async findFloorPlansByApartment(apartmentId: string): Promise<ApartmentFloorPlan[]> {
    return this.floorPlanRepository.find({
      where: { apartmentId, isActive: true },
      order: { buildingNumber: 'ASC', unitNumber: 'ASC' },
    });
  }

  async findFloorPlanById(id: string): Promise<ApartmentFloorPlan> {
    const plan = await this.floorPlanRepository.findOne({
      where: { id },
      relations: ['apartment'],
    });
    if (!plan) {
      throw new NotFoundException(`Floor plan not found: ${id}`);
    }
    return plan;
  }

  async findFloorPlanByUnit(
    apartmentId: string,
    buildingNumber: string,
    unitNumber: string,
  ): Promise<ApartmentFloorPlan | null> {
    return this.floorPlanRepository.findOne({
      where: { apartmentId, buildingNumber, unitNumber, isActive: true },
    });
  }

  async findFloorPlansByFloorType(
    apartmentId: string,
    floorType: string,
  ): Promise<ApartmentFloorPlan[]> {
    return this.floorPlanRepository.find({
      where: { apartmentId, floorType, isActive: true },
    });
  }

  // ================== DWG 업로드 및 파싱 ==================

  async uploadAndParseDwg(
    fileBuffer: Buffer,
    fileName: string,
    dto: UploadDwgDto,
  ): Promise<ApartmentFloorPlan> {
    this.logger.log(`Uploading DWG for apartment: ${dto.apartmentId}`);

    // 1. APS로 DWG 파싱
    const parseResult = await this.apsService.parseDwgFile(fileBuffer, fileName);

    // 2. 도면 엔티티 생성 및 저장
    const floorPlan = this.floorPlanRepository.create({
      apartmentId: dto.apartmentId,
      buildingNumber: dto.buildingNumber,
      unitNumber: dto.unitNumber,
      floorType: dto.floorType,
      areaPyeong: dto.areaPyeong,
      areaSqm: dto.areaPyeong ? dto.areaPyeong * 3.3058 : undefined,
      roomCount: parseResult.rooms.length || undefined,
      bathroomCount: parseResult.bathroom.length || undefined,
      dwgFileName: fileName,
      dwgUrn: parseResult.urn,
      elements: parseResult.elements as DwgElementData[],
      walls: parseResult.walls as DwgElementData[],
      doors: parseResult.doors as DwgElementData[],
      windows: parseResult.windows as DwgElementData[],
      bathroomElements: parseResult.bathroom as DwgElementData[],
      kitchenElements: parseResult.kitchen as DwgElementData[],
      fixtures: parseResult.fixtures as DwgElementData[],
      furniture: parseResult.furniture as DwgElementData[],
      rooms: parseResult.rooms,
      rawObjectTree: parseResult.rawObjectTree,
      rawProperties: parseResult.rawProperties,
      metadata: parseResult.metadata,
    });

    const savedPlan = await this.floorPlanRepository.save(floorPlan);
    this.logger.log(`Floor plan saved: ${savedPlan.id}`);

    return savedPlan;
  }

  // ================== 시뮬레이터용 데이터 변환 ==================

  /**
   * DWG 파싱 결과를 프론트엔드 시뮬레이터의 FloorPlanAnalysis 형식으로 변환
   */
  convertToFloorPlanAnalysis(floorPlan: ApartmentFloorPlan): FloorPlanAnalysis {
    const elements: StructuralElement[] = [];

    // 벽 변환
    if (floorPlan.walls) {
      for (const wall of floorPlan.walls) {
        elements.push({
          elementType: wall.layer?.toLowerCase().includes('load') ? 'load_bearing_wall' : 'non_load_bearing_wall',
          label: wall.name || '벽',
          position: {
            x: wall.coordinates?.x || 0,
            y: wall.coordinates?.y || 0,
            width: wall.coordinates?.width || 10,
            height: wall.coordinates?.height || 2,
          },
          isDemolishable: !wall.layer?.toLowerCase().includes('load'),
          demolitionRisk: wall.layer?.toLowerCase().includes('load') ? 'high' : 'low',
          confidence: 0.85,
        });
      }
    }

    // 문 변환
    if (floorPlan.doors) {
      for (const door of floorPlan.doors) {
        elements.push({
          elementType: 'door',
          label: door.name || '문',
          position: {
            x: door.coordinates?.x || 0,
            y: door.coordinates?.y || 0,
            width: door.coordinates?.width || 3,
            height: door.coordinates?.height || 1,
          },
          isDemolishable: true,
          demolitionRisk: 'none',
          confidence: 0.9,
        });
      }
    }

    // 창문 변환
    if (floorPlan.windows) {
      for (const window of floorPlan.windows) {
        elements.push({
          elementType: 'window',
          label: window.name || '창문',
          position: {
            x: window.coordinates?.x || 0,
            y: window.coordinates?.y || 0,
            width: window.coordinates?.width || 4,
            height: window.coordinates?.height || 1,
          },
          isDemolishable: false,
          demolitionRisk: 'high',
          demolitionNote: '외벽 창문은 철거 불가',
          confidence: 0.9,
        });
      }
    }

    // 욕실 설비 변환
    if (floorPlan.bathroomElements) {
      for (const item of floorPlan.bathroomElements) {
        elements.push({
          elementType: 'plumbing',
          label: item.name || '욕실 설비',
          position: {
            x: item.coordinates?.x || 0,
            y: item.coordinates?.y || 0,
            width: item.coordinates?.width || 2,
            height: item.coordinates?.height || 2,
          },
          isDemolishable: true,
          demolitionRisk: 'medium',
          demolitionNote: '배관 이설 필요',
          confidence: 0.8,
        });
      }
    }

    // 주방 설비 변환
    if (floorPlan.kitchenElements) {
      for (const item of floorPlan.kitchenElements) {
        elements.push({
          elementType: 'plumbing',
          label: item.name || '주방 설비',
          position: {
            x: item.coordinates?.x || 0,
            y: item.coordinates?.y || 0,
            width: item.coordinates?.width || 2,
            height: item.coordinates?.height || 2,
          },
          isDemolishable: true,
          demolitionRisk: 'medium',
          demolitionNote: '가스/배관 이설 필요',
          confidence: 0.8,
        });
      }
    }

    // 전기 설비 변환
    if (floorPlan.fixtures) {
      for (const item of floorPlan.fixtures) {
        elements.push({
          elementType: 'electrical',
          label: item.name || '전기 설비',
          position: {
            x: item.coordinates?.x || 0,
            y: item.coordinates?.y || 0,
            width: item.coordinates?.width || 1,
            height: item.coordinates?.height || 1,
          },
          isDemolishable: true,
          demolitionRisk: 'low',
          confidence: 0.75,
        });
      }
    }

    // 분석 요약 생성
    const summary = this.generateAnalysisSummary(floorPlan, elements);
    const warnings = this.generateWarnings(elements);

    return {
      floorPlanId: floorPlan.id,
      imageDimensions: { width: 1000, height: 800 }, // DWG 기본 크기
      estimatedArea: floorPlan.areaPyeong || 0,
      roomCount: floorPlan.roomCount || floorPlan.rooms?.length || 0,
      bathroomCount: floorPlan.bathroomCount || (floorPlan.bathroomElements?.length > 0 ? 1 : 0),
      elements,
      analysisSummary: summary,
      warnings,
    };
  }

  private generateAnalysisSummary(floorPlan: ApartmentFloorPlan, elements: StructuralElement[]): string {
    const wallCount = elements.filter(e => e.elementType.includes('wall')).length;
    const loadBearingCount = elements.filter(e => e.elementType === 'load_bearing_wall').length;
    const plumbingCount = elements.filter(e => e.elementType === 'plumbing').length;

    return `${floorPlan.floorType || '해당'} 평형 도면 분석 완료. ` +
      `총 ${elements.length}개 요소 감지 (벽체 ${wallCount}개, 내력벽 ${loadBearingCount}개 추정, 배관 ${plumbingCount}개). ` +
      `DWG 파일 기반 정밀 분석 결과입니다.`;
  }

  private generateWarnings(elements: StructuralElement[]): string[] {
    const warnings: string[] = [];

    const loadBearing = elements.filter(e => e.elementType === 'load_bearing_wall');
    if (loadBearing.length > 0) {
      warnings.push(`내력벽 ${loadBearing.length}개가 감지되었습니다. 철거 시 구조 안전 검토가 필요합니다.`);
    }

    const plumbing = elements.filter(e => e.elementType === 'plumbing');
    if (plumbing.length > 0) {
      warnings.push(`배관 설비 ${plumbing.length}개가 감지되었습니다. 이설 비용이 발생할 수 있습니다.`);
    }

    const highRisk = elements.filter(e => e.demolitionRisk === 'high');
    if (highRisk.length > 0) {
      warnings.push(`고위험 요소 ${highRisk.length}개가 있습니다. 전문가 상담을 권장합니다.`);
    }

    return warnings;
  }

  // ================== 통계 ==================

  async getApartmentStats(apartmentId: string): Promise<{
    totalPlans: number;
    floorTypes: string[];
    buildings: string[];
  }> {
    const plans = await this.floorPlanRepository.find({
      where: { apartmentId, isActive: true },
      select: ['floorType', 'buildingNumber'],
    });

    const floorTypes = [...new Set(plans.map(p => p.floorType).filter(Boolean))];
    const buildings = [...new Set(plans.map(p => p.buildingNumber).filter(Boolean))];

    return {
      totalPlans: plans.length,
      floorTypes,
      buildings,
    };
  }
}

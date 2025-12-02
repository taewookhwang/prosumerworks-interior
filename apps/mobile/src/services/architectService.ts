import axios from 'axios';
import { AI_SERVICE_URL } from '../constants/config';

// ============== 구조물 분석 타입 ==============

export type StructuralElementType =
  | 'load_bearing_wall'
  | 'non_load_bearing_wall'
  | 'pillar'
  | 'beam'
  | 'window'
  | 'door'
  | 'plumbing'
  | 'electrical'
  | 'hvac';

export interface Position {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StructuralElement {
  elementType: StructuralElementType;
  label: string;
  position: Position;
  isDemolishable: boolean;
  demolitionRisk: 'none' | 'low' | 'medium' | 'high';
  demolitionNote?: string;
  confidence: number;
}

export interface FloorPlanAnalysis {
  floorPlanId?: string;
  imageDimensions: { width: number; height: number };
  estimatedArea?: number;
  roomCount: number;
  bathroomCount: number;
  elements: StructuralElement[];
  analysisSummary: string;
  warnings: string[];
}

export interface DemolitionValidation {
  isSafe: boolean;
  selectedElements: string[];
  riskLevel: 'low' | 'medium' | 'high';
  structuralImpact: string;
  recommendations: string[];
  warnings: string[];
  estimatedDemolitionCost?: number;
}

export interface DesignFeasibility {
  isFeasible: boolean;
  feasibilityScore: number;
  structuralConflicts: string[];
  plumbingConflicts: string[];
  electricalConflicts: string[];
  modificationsNeeded: string[];
  estimatedAdditionalCost?: number;
}

export interface CleanSlateVisualization {
  originalElementsCount: number;
  remainingElementsCount: number;
  demolishedElementsCount: number;
  remainingElements: Array<{
    label: string;
    elementType: string;
    position: Position;
    status: 'remaining';
  }>;
  demolishedElements: Array<{
    label: string;
    elementType: string;
    position: Position;
    status: 'demolished';
  }>;
  visualizationNotes: string[];
  isSafe: boolean;
  riskLevel: string;
}

// ============== API 요청 타입 ==============

export interface FloorPlanAnalysisRequest {
  floorPlanId?: string;
  imageUrl?: string;
  imageBase64?: string;
  propertyType?: string;
}

export interface DemolitionValidationRequest {
  floorPlanAnalysis: FloorPlanAnalysis;
  selectedElementIds: string[];
}

export interface DesignFeasibilityRequest {
  floorPlanAnalysis: FloorPlanAnalysis;
  demolitionPlan: DemolitionValidation;
  designImageUrl?: string;
  designImageBase64?: string;
  designDescription?: string;
}

// ============== API 클라이언트 ==============

const architectClient = axios.create({
  baseURL: AI_SERVICE_URL,
  timeout: 60000, // Vision API 처리에 더 긴 타임아웃
  headers: {
    'Content-Type': 'application/json',
  },
});

// snake_case → camelCase 변환
const transformElement = (elem: any): StructuralElement => ({
  elementType: elem.element_type,
  label: elem.label,
  position: elem.position,
  isDemolishable: elem.is_demolishable,
  demolitionRisk: elem.demolition_risk,
  demolitionNote: elem.demolition_note,
  confidence: elem.confidence,
});

const transformFloorPlanAnalysis = (data: any): FloorPlanAnalysis => ({
  floorPlanId: data.floor_plan_id,
  imageDimensions: data.image_dimensions,
  estimatedArea: data.estimated_area,
  roomCount: data.room_count,
  bathroomCount: data.bathroom_count,
  elements: (data.elements || []).map(transformElement),
  analysisSummary: data.analysis_summary,
  warnings: data.warnings || [],
});

const transformDemolitionValidation = (data: any): DemolitionValidation => ({
  isSafe: data.is_safe,
  selectedElements: data.selected_elements,
  riskLevel: data.risk_level,
  structuralImpact: data.structural_impact,
  recommendations: data.recommendations || [],
  warnings: data.warnings || [],
  estimatedDemolitionCost: data.estimated_demolition_cost,
});

const transformDesignFeasibility = (data: any): DesignFeasibility => ({
  isFeasible: data.is_feasible,
  feasibilityScore: data.feasibility_score,
  structuralConflicts: data.structural_conflicts || [],
  plumbingConflicts: data.plumbing_conflicts || [],
  electricalConflicts: data.electrical_conflicts || [],
  modificationsNeeded: data.modifications_needed || [],
  estimatedAdditionalCost: data.estimated_additional_cost,
});

// camelCase → snake_case 변환 (요청용) - export해서 다른 서비스에서도 사용
export const floorPlanToSnakeCase = (analysis: FloorPlanAnalysis): any => {
  if (!analysis) {
    console.error('[toSnakeCase] analysis is null or undefined');
    throw new Error('FloorPlanAnalysis is required');
  }

  return {
    floor_plan_id: analysis.floorPlanId || null,
    image_dimensions: analysis.imageDimensions || { width: 0, height: 0 },
    estimated_area: analysis.estimatedArea || null,
    room_count: analysis.roomCount || 0,
    bathroom_count: analysis.bathroomCount || 0,
    elements: (analysis.elements || []).map((elem) => ({
      element_type: elem.elementType || 'non_load_bearing_wall',
      label: elem.label || 'Unknown',
      position: elem.position || { x: 0, y: 0, width: 0, height: 0 },
      is_demolishable: elem.isDemolishable ?? true,
      demolition_risk: elem.demolitionRisk || 'none',
      demolition_note: elem.demolitionNote || null,
      confidence: elem.confidence ?? 0.5,
    })),
    analysis_summary: analysis.analysisSummary || '',
    warnings: analysis.warnings || [],
  };
};

const demolitionToSnakeCase = (validation: DemolitionValidation): any => ({
  is_safe: validation.isSafe,
  selected_elements: validation.selectedElements,
  risk_level: validation.riskLevel,
  structural_impact: validation.structuralImpact,
  recommendations: validation.recommendations,
  warnings: validation.warnings,
  estimated_demolition_cost: validation.estimatedDemolitionCost,
});

// ============== AI 건축사 API ==============

export const architectService = {
  /**
   * 도면 분석
   * 도면 이미지를 분석하여 구조물 요소를 감지합니다.
   */
  analyzeFloorPlan: async (request: FloorPlanAnalysisRequest): Promise<FloorPlanAnalysis> => {
    // 디버그 로그
    console.log('[Architect] analyzeFloorPlan request:', {
      hasFloorPlanId: !!request.floorPlanId,
      hasImageUrl: !!request.imageUrl,
      hasImageBase64: !!request.imageBase64,
      imageBase64Length: request.imageBase64?.length || 0,
      imageBase64Preview: request.imageBase64?.substring(0, 50) || 'null',
      propertyType: request.propertyType,
    });

    if (!request.imageBase64 && !request.imageUrl) {
      throw new Error('이미지가 필요합니다 (imageBase64 또는 imageUrl)');
    }

    const { data } = await architectClient.post('/architect/analyze-floor-plan', {
      floor_plan_id: request.floorPlanId,
      image_url: request.imageUrl,
      image_base64: request.imageBase64,
      property_type: request.propertyType,
    });
    return transformFloorPlanAnalysis(data);
  },

  /**
   * 철거 계획 검증
   * 선택된 구조물들의 철거 안전성을 검증합니다.
   */
  validateDemolition: async (
    floorPlanAnalysis: FloorPlanAnalysis,
    selectedElementLabels: string[]
  ): Promise<DemolitionValidation> => {
    const requestBody = {
      floor_plan_analysis: floorPlanToSnakeCase(floorPlanAnalysis),
      selected_element_ids: selectedElementLabels,
    };

    // 디버깅용 로그
    console.log('[Demolition] Request body:', JSON.stringify(requestBody, null, 2));

    try {
      const { data } = await architectClient.post('/architect/validate-demolition', requestBody);
      console.log('[Demolition] Response:', JSON.stringify(data, null, 2));
      return transformDemolitionValidation(data);
    } catch (error: any) {
      console.error('[Demolition] Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        requestBody: requestBody,
      });
      throw error;
    }
  },

  /**
   * 디자인 시공 가능성 검증
   * 제안된 디자인이 구조적으로 시공 가능한지 검증합니다.
   */
  checkDesignFeasibility: async (
    floorPlanAnalysis: FloorPlanAnalysis,
    demolitionPlan: DemolitionValidation,
    options?: {
      designImageUrl?: string;
      designImageBase64?: string;
      designDescription?: string;
    }
  ): Promise<DesignFeasibility> => {
    const { data } = await architectClient.post('/architect/check-design-feasibility', {
      floor_plan_analysis: floorPlanToSnakeCase(floorPlanAnalysis),
      demolition_plan: demolitionToSnakeCase(demolitionPlan),
      design_image_url: options?.designImageUrl,
      design_image_base64: options?.designImageBase64,
      design_description: options?.designDescription,
    });
    return transformDesignFeasibility(data);
  },

  /**
   * Clean Slate 시각화 데이터 생성
   * 철거 후 상태를 시각화하기 위한 데이터를 생성합니다.
   */
  generateCleanSlate: async (
    floorPlanAnalysis: FloorPlanAnalysis,
    demolitionPlan: DemolitionValidation
  ): Promise<CleanSlateVisualization> => {
    const { data } = await architectClient.post('/architect/clean-slate', {
      floor_plan_analysis: floorPlanToSnakeCase(floorPlanAnalysis),
      demolition_plan: demolitionToSnakeCase(demolitionPlan),
    });
    return {
      originalElementsCount: data.original_elements_count,
      remainingElementsCount: data.remaining_elements_count,
      demolishedElementsCount: data.demolished_elements_count,
      remainingElements: data.remaining_elements,
      demolishedElements: data.demolished_elements,
      visualizationNotes: data.visualization_notes,
      isSafe: data.is_safe,
      riskLevel: data.risk_level,
    };
  },
};

export default architectService;

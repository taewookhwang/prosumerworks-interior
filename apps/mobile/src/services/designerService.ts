import axios from 'axios';
import { AI_SERVICE_URL } from '../constants/config';
import { FloorPlanAnalysis, floorPlanToSnakeCase } from './architectService';

// ============== 타입 정의 ==============

export type InteriorStyle =
  | 'modern'
  | 'minimalist'
  | 'scandinavian'
  | 'industrial'
  | 'natural'
  | 'classic'
  | 'luxurious'
  | 'korean_modern';

export type RoomType =
  | 'living_room'
  | 'bedroom'
  | 'kitchen'
  | 'bathroom'
  | 'office';

export interface StyleSuggestion {
  id: InteriorStyle;
  name: string;
  nameEn: string;
  description: string;
  keywords: string[];
}

export interface EnhancePromptRequest {
  userInput: string;
  style?: InteriorStyle;
  roomType?: RoomType;
}

export interface EnhancePromptResponse {
  enhancedPrompt: string;
  originalInput: string;
  style: string;
  roomType: string;
}

export interface GenerateDesignRequest {
  baseImageUrl?: string;
  baseImageBase64?: string;
  stylePrompt?: string;
  style?: InteriorStyle;
  roomType?: RoomType;
  userRequest?: string;
  referenceImageUrls?: string[];  // 레퍼런스 이미지 URL 목록
  floorPlanAnalysis?: FloorPlanAnalysis;  // 건축사 도면 분석 결과
}

export interface GenerateDesignResponse {
  success: boolean;
  imageUrl?: string;
  promptUsed: string;
  style?: string;
  roomType?: string;
  model?: string;
  error?: string;
  note?: string;
}

// ============== API 클라이언트 ==============

const designerClient = axios.create({
  baseURL: AI_SERVICE_URL,
  timeout: 120000, // 이미지 생성에 더 긴 타임아웃 (2분)
  headers: {
    'Content-Type': 'application/json',
  },
});

// snake_case → camelCase 변환
const transformStyleSuggestion = (data: any): StyleSuggestion => ({
  id: data.id,
  name: data.name,
  nameEn: data.name_en,
  description: data.description,
  keywords: data.keywords || [],
});

const transformEnhancePromptResponse = (data: any): EnhancePromptResponse => ({
  enhancedPrompt: data.enhanced_prompt,
  originalInput: data.original_input,
  style: data.style,
  roomType: data.room_type,
});

const transformGenerateDesignResponse = (data: any): GenerateDesignResponse => ({
  success: data.success,
  imageUrl: data.image_url,
  promptUsed: data.prompt_used,
  style: data.style,
  roomType: data.room_type,
  model: data.model,
  error: data.error,
  note: data.note,
});

// ============== AI 디자이너 API ==============

export const designerService = {
  /**
   * 인테리어 스타일 추천 목록 조회
   */
  getStyles: async (): Promise<StyleSuggestion[]> => {
    const { data } = await designerClient.get('/designer/styles');
    return data.map(transformStyleSuggestion);
  },

  /**
   * 프롬프트 강화
   * 사용자의 간단한 요청을 AI 이미지 생성에 최적화된 프롬프트로 변환
   */
  enhancePrompt: async (request: EnhancePromptRequest): Promise<EnhancePromptResponse> => {
    const { data } = await designerClient.post('/designer/enhance-prompt', {
      user_input: request.userInput,
      style: request.style || 'modern',
      room_type: request.roomType || 'living_room',
    });
    return transformEnhancePromptResponse(data);
  },

  /**
   * 인테리어 디자인 이미지 생성
   * 베이스 이미지에 선택한 스타일을 적용
   */
  generateDesign: async (request: GenerateDesignRequest): Promise<GenerateDesignResponse> => {
    console.log('[Designer] Generating design with:', {
      style: request.style,
      roomType: request.roomType,
      hasBaseImage: !!request.baseImageUrl || !!request.baseImageBase64,
      referenceCount: request.referenceImageUrls?.length || 0,
      hasFloorPlanAnalysis: !!request.floorPlanAnalysis,
    });

    try {
      const { data } = await designerClient.post('/designer/generate', {
        base_image_url: request.baseImageUrl,
        base_image_base64: request.baseImageBase64,
        style_prompt: request.stylePrompt,
        style: request.style || 'modern',
        room_type: request.roomType || 'living_room',
        user_request: request.userRequest,
        reference_image_urls: request.referenceImageUrls,
        floor_plan_analysis: request.floorPlanAnalysis
          ? floorPlanToSnakeCase(request.floorPlanAnalysis)
          : undefined,  // 건축사 분석 결과 (snake_case로 변환)
      });

      console.log('[Designer] Generation result:', data.success ? 'success' : 'failed');
      return transformGenerateDesignResponse(data);
    } catch (error: any) {
      console.error('[Designer] Generation error:', error.message);
      throw error;
    }
  },
};

// 스타일 한글 이름 매핑
export const STYLE_NAMES: Record<InteriorStyle, string> = {
  modern: '모던',
  minimalist: '미니멀',
  scandinavian: '북유럽',
  industrial: '인더스트리얼',
  natural: '내추럴',
  classic: '클래식',
  luxurious: '럭셔리',
  korean_modern: '한국 모던',
};

// 공간 한글 이름 매핑
export const ROOM_NAMES: Record<RoomType, string> = {
  living_room: '거실',
  bedroom: '침실',
  kitchen: '주방',
  bathroom: '욕실',
  office: '서재',
};

export default designerService;

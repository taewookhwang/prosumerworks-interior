import api from './api';
import { FloorPlanAnalysis, StructuralElement } from './architectService';

// ============== 타입 정의 ==============

export interface Apartment {
  id: string;
  name: string;
  address?: string;
  totalBuildings?: number;
  totalUnits?: number;
  thumbnailUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApartmentFloorPlan {
  id: string;
  apartmentId: string;
  buildingNumber?: string;
  unitNumber?: string;
  floorType?: string;
  areaPyeong?: number;
  areaSqm?: number;
  roomCount?: number;
  bathroomCount?: number;
  dwgFileName?: string;
  dwgUrn?: string;
  elements?: DwgElement[];
  metadata?: {
    units: string;
    totalArea?: number;
    scale?: number;
    totalElements: number;
    classifiedElements: number;
  };
  thumbnailUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DwgElement {
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

export interface ApartmentStats {
  totalPlans: number;
  floorTypes: string[];
  buildings: string[];
}

// ============== API 클라이언트 ==============

export const apartmentsService = {
  /**
   * 아파트 목록 조회
   */
  getApartments: async (): Promise<Apartment[]> => {
    const { data } = await api.get('/apartments');
    return data;
  },

  /**
   * 아파트 상세 조회
   */
  getApartmentById: async (id: string): Promise<Apartment> => {
    const { data } = await api.get(`/apartments/${id}`);
    return data;
  },

  /**
   * 아파트 통계 조회
   */
  getApartmentStats: async (apartmentId: string): Promise<ApartmentStats> => {
    const { data } = await api.get(`/apartments/${apartmentId}/stats`);
    return data;
  },

  /**
   * 아파트의 도면 목록 조회
   */
  getFloorPlansByApartment: async (apartmentId: string): Promise<ApartmentFloorPlan[]> => {
    const { data } = await api.get(`/apartments/${apartmentId}/floor-plans`);
    return data;
  },

  /**
   * 특정 평형 타입의 도면 조회
   */
  getFloorPlansByType: async (apartmentId: string, floorType: string): Promise<ApartmentFloorPlan[]> => {
    const { data } = await api.get(`/apartments/${apartmentId}/floor-plans/by-type`, {
      params: { type: floorType },
    });
    return data;
  },

  /**
   * 특정 동/호수의 도면 조회
   */
  getFloorPlanByUnit: async (
    apartmentId: string,
    buildingNumber: string,
    unitNumber: string
  ): Promise<ApartmentFloorPlan | null> => {
    try {
      const { data } = await api.get(`/apartments/${apartmentId}/floor-plans/by-unit`, {
        params: { building: buildingNumber, unit: unitNumber },
      });
      return data;
    } catch (error: any) {
      if (error.response?.status === 400) {
        return null;
      }
      throw error;
    }
  },

  /**
   * 도면 상세 조회
   */
  getFloorPlanById: async (id: string): Promise<ApartmentFloorPlan> => {
    const { data } = await api.get(`/apartments/floor-plans/${id}`);
    return data;
  },

  /**
   * 시뮬레이터용 FloorPlanAnalysis 형식으로 변환된 데이터 조회
   */
  getFloorPlanAnalysis: async (floorPlanId: string): Promise<FloorPlanAnalysis> => {
    const { data } = await api.get(`/apartments/floor-plans/${floorPlanId}/analysis`);
    return data;
  },
};

export default apartmentsService;

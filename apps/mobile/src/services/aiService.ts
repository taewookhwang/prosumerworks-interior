import axios from 'axios';
import { AI_SERVICE_URL, API_URL } from '../constants/config';
import { useAuthStore } from '../store/auth';

// AI Service Types
export interface CostBreakdown {
  category: string;
  dm: number; // Direct Material - 재료비 (만원)
  dl: number; // Direct Labor - 노무비 (만원)
  oh: number; // Overhead - 경비 (만원)
  total: number;
  note?: string;
}

export interface CostEstimate {
  totalCost: number;
  breakdown: CostBreakdown[];
  notes?: string;
}

export interface ScheduleItem {
  phase: string;
  startDate: string;
  endDate: string;
  duration: number;
  notes?: string;
}

export interface ProjectSchedule {
  projectName: string;
  totalDuration: number;
  startDate: string;
  endDate: string;
  phases: ScheduleItem[];
}

// Quote data for sending to contractors
export interface QuoteData {
  title: string;
  category: string;
  locationCity?: string;
  locationDistrict?: string;
  areaSize?: number;
  description?: string;
  totalCost: number;
  breakdown: CostBreakdown[];
  targetSpecialties: string[];
  targetAreas: string[];
}

// AI Quote entity from NestJS API
export interface AIQuote {
  id: string;
  customerId: string;
  title: string;
  category: string;
  locationCity?: string;
  locationDistrict?: string;
  areaSize?: number;
  description?: string;
  totalCost: number;
  costBreakdown: CostBreakdown[];
  status: 'draft' | 'sent' | 'has_offers' | 'accepted' | 'expired' | 'cancelled';
  targetSpecialties: string[];
  targetAreas: string[];
  createdAt: string;
  sentAt?: string;
}

// AI Quote Offer from contractor
export interface AIQuoteOffer {
  id: string;
  aiQuoteId: string;
  contractorId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  proposedCost?: number;
  message?: string;
  createdAt?: string;
  respondedAt?: string;
  chatRoomId?: string;
  contractor?: {
    id: string;
    companyName: string;
    representative: string;
  };
}

export type AgentIntent =
  | 'cost'
  | 'schedule'
  | 'technical'
  | 'chat'
  | 'quote_ready'
  | 'quote_send';

export interface AgentResponse {
  answer: string;
  data?: CostEstimate | ProjectSchedule | QuoteData | Record<string, unknown>;
  intent: AgentIntent;
  followUpQuestions: string[];
}

export interface ChatRequest {
  query: string;
  context?: Record<string, unknown>;
}

// AI Service Client
const aiClient = axios.create({
  baseURL: AI_SERVICE_URL,
  timeout: 30000, // AI responses may take longer
  headers: {
    'Content-Type': 'application/json',
  },
});

// NestJS API Client for AI Quotes
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth interceptor
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Helper to convert snake_case to camelCase for data
const transformQuoteData = (data: any): any => {
  if (!data) return data;
  return {
    ...data,
    locationCity: data.location_city,
    locationDistrict: data.location_district,
    areaSize: data.area_size,
    totalCost: data.total_cost,
    targetSpecialties: data.target_specialties,
    targetAreas: data.target_areas,
  };
};

// AI Service API
export const aiService = {
  // Chat with 김 반장
  chat: async (query: string, context?: Record<string, unknown>): Promise<AgentResponse> => {
    const { data } = await aiClient.post<any>('/chat', {
      query,
      context,
    });
    // Transform snake_case to camelCase
    const response: AgentResponse = {
      answer: data.answer,
      data: data.intent === 'quote_send' ? transformQuoteData(data.data) : data.data,
      intent: data.intent,
      followUpQuestions: data.follow_up_questions || data.followUpQuestions || [],
    };
    return response;
  },

  // Health check
  health: async (): Promise<{ status: string; agent: string }> => {
    const { data } = await aiClient.get('/health');
    return data;
  },
};

// AI Quotes API
export const aiQuotesApi = {
  // Create a new AI quote
  create: async (quoteData: QuoteData): Promise<AIQuote> => {
    const { data } = await apiClient.post<AIQuote>('/ai-quotes', {
      title: quoteData.title,
      category: quoteData.category,
      locationCity: quoteData.locationCity,
      locationDistrict: quoteData.locationDistrict,
      areaSize: quoteData.areaSize,
      description: quoteData.description,
      totalCost: quoteData.totalCost,
      costBreakdown: quoteData.breakdown,
      targetSpecialties: quoteData.targetSpecialties,
      targetAreas: quoteData.targetAreas,
    });
    return data;
  },

  // Send quote to contractors
  sendToContractors: async (quoteId: string): Promise<{ sent_count: number; offers: AIQuoteOffer[] }> => {
    const { data } = await apiClient.post(`/ai-quotes/${quoteId}/send`);
    return data;
  },

  // Get my quotes (customer)
  getMyQuotes: async (): Promise<AIQuote[]> => {
    const { data } = await apiClient.get<AIQuote[]>('/ai-quotes/my-quotes');
    return data;
  },

  // Get quote by ID
  getById: async (quoteId: string): Promise<AIQuote> => {
    const { data } = await apiClient.get<AIQuote>(`/ai-quotes/${quoteId}`);
    return data;
  },

  // Get offers for a quote
  getOffers: async (quoteId: string): Promise<AIQuoteOffer[]> => {
    const { data } = await apiClient.get<AIQuoteOffer[]>(`/ai-quotes/${quoteId}/offers`);
    return data;
  },

  // Accept an offer
  acceptOffer: async (offerId: string, chatRoomId?: string): Promise<AIQuoteOffer> => {
    const { data } = await apiClient.post(`/ai-quotes/offers/${offerId}/accept`, { chatRoomId });
    return data;
  },

  // Contractor: Get pending offers
  getPendingOffers: async (): Promise<AIQuoteOffer[]> => {
    const { data } = await apiClient.get<AIQuoteOffer[]>('/ai-quotes/contractor/pending-offers');
    return data;
  },

  // Contractor: Respond to offer
  respondToOffer: async (offerId: string, accepted: boolean, message?: string, proposedCost?: number): Promise<AIQuoteOffer> => {
    const { data } = await apiClient.post(`/ai-quotes/contractor/offers/${offerId}/respond`, {
      accepted,
      message,
      proposedCost,
    });
    return data;
  },
};

export default aiService;

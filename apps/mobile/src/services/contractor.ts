import api from './api';
import type { Contractor } from '../types';

export interface UpdateContractorProfileDto {
  companyName?: string;
  description?: string;
  profileImage?: string;
  career?: string;
  specialties?: string[];
  serviceAreas?: string[];
  contactPhone?: string;
  contactEmail?: string;
}

export const contractorService = {
  getMyContractor: async (): Promise<Contractor> => {
    const { data } = await api.get('/contractors/me');
    return data;
  },

  getContractor: async (id: string): Promise<Contractor> => {
    const { data } = await api.get(`/contractors/${id}`);
    return data;
  },

  updateMyProfile: async (dto: UpdateContractorProfileDto): Promise<Contractor> => {
    const { data } = await api.patch('/contractors/me', dto);
    return data;
  },
};

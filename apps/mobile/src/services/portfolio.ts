import api from './api';
import { FeedResponse, PortfolioDetail } from '../types';

export interface FeedParams {
  limit?: number;
  cursor?: string;
  category?: string;
  subCategory?: string;
  city?: string;
  district?: string;
  costMin?: number;
  costMax?: number;
  search?: string;
}

export const portfolioService = {
  async getFeed(params: FeedParams = {}): Promise<FeedResponse> {
    const { data } = await api.get('/portfolios', { params });
    return data;
  },

  async getPortfolio(id: string): Promise<PortfolioDetail> {
    const { data } = await api.get(`/portfolios/${id}`);
    return data;
  },

  async likePortfolio(id: string): Promise<void> {
    await api.post(`/portfolios/${id}/like`);
  },

  async unlikePortfolio(id: string): Promise<void> {
    await api.delete(`/portfolios/${id}/like`);
  },

  async savePortfolio(id: string): Promise<void> {
    await api.post(`/portfolios/${id}/save`);
  },

  async unsavePortfolio(id: string): Promise<void> {
    await api.delete(`/portfolios/${id}/save`);
  },

  async getSavedPortfolios(
    limit?: number,
    cursor?: string,
  ): Promise<FeedResponse> {
    const { data } = await api.get('/portfolios/saved', {
      params: { limit, cursor },
    });
    return data;
  },
};

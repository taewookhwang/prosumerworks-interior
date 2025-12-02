export interface User {
  id: string;
  email: string;
  name: string;
  profileImage?: string;
  userType: 'customer' | 'contractor';
  phone?: string;
  createdAt: string;
  hasContractor?: boolean;
  contractor?: {
    id: string;
    companyName: string;
    status: 'pending' | 'approved' | 'rejected';
  };
}

export interface Portfolio {
  id: string;
  title: string;
  thumbnailUrl?: string;
  category: string;
  areaSize?: number;
  locationCity?: string;
  locationDistrict?: string;
  likeCount: number;
  isLiked: boolean;
  isSaved: boolean;
  contractor?: {
    id: string;
    companyName: string;
    profileImage?: string;
    description?: string;
    career?: string;
  };
  createdAt: string;
}

export interface PortfolioDetail extends Portfolio {
  description?: string;
  subCategory?: string;
  apartmentName?: string;
  durationDays?: number;
  costMin?: number;
  costMax?: number;
  saveCount: number;
  viewCount: number;
  completedAt?: string;
  images?: PortfolioImage[];
}

export interface PortfolioImage {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string;
  imageType: 'before' | 'after' | 'progress';
  displayOrder: number;
}

export interface Contractor {
  id: string;
  userId: string;
  companyName: string;
  description?: string;
  profileImage?: string;
  career?: string;
  specialties: string[];
  serviceAreas: string[];
  contactPhone?: string;
  contactEmail?: string;
  portfolioCount: number;
  reviewCount: number;
  averageRating?: number;
  status: 'pending' | 'approved' | 'rejected';
}

export interface FeedResponse {
  items: Portfolio[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

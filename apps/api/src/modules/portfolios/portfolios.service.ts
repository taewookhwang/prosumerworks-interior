import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Portfolio,
  PortfolioImage,
  PortfolioLike,
  PortfolioSave,
  PortfolioView,
} from './entities/portfolio.entity';
import { ContractorsService } from '../contractors/contractors.service';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';
import { FeedQueryDto } from './dto/feed-query.dto';

@Injectable()
export class PortfoliosService {
  constructor(
    @InjectRepository(Portfolio)
    private readonly portfolioRepository: Repository<Portfolio>,
    @InjectRepository(PortfolioImage)
    private readonly imageRepository: Repository<PortfolioImage>,
    @InjectRepository(PortfolioLike)
    private readonly likeRepository: Repository<PortfolioLike>,
    @InjectRepository(PortfolioSave)
    private readonly saveRepository: Repository<PortfolioSave>,
    @InjectRepository(PortfolioView)
    private readonly viewRepository: Repository<PortfolioView>,
    private readonly contractorsService: ContractorsService,
  ) {}

  async findFeed(query: FeedQueryDto, userId?: string) {
    const limit = query.limit || 20;

    // When search is provided, use query builder for OR conditions on title/description
    if (query.search) {
      const qb = this.portfolioRepository
        .createQueryBuilder('portfolio')
        .leftJoinAndSelect('portfolio.contractor', 'contractor')
        .leftJoinAndSelect('contractor.user', 'user')
        .leftJoinAndSelect('portfolio.images', 'images')
        .where('portfolio.isPublished = :published', { published: true })
        .andWhere(
          '(portfolio.title LIKE :search OR portfolio.description LIKE :search)',
          { search: `%${query.search}%` },
        );

      if (query.category) {
        qb.andWhere('portfolio.category = :category', { category: query.category });
      }

      if (query.city) {
        qb.andWhere('portfolio.locationCity = :city', { city: query.city });
      }

      qb.orderBy('portfolio.createdAt', 'DESC').take(limit);

      const portfolios = await qb.getMany();

      // Add like/save status for authenticated user
      if (userId) {
        for (const portfolio of portfolios) {
          const [isLiked, isSaved] = await Promise.all([
            this.likeRepository.findOne({
              where: { portfolioId: portfolio.id, userId },
            }),
            this.saveRepository.findOne({
              where: { portfolioId: portfolio.id, userId },
            }),
          ]);
          (portfolio as any).isLiked = !!isLiked;
          (portfolio as any).isSaved = !!isSaved;
        }
      }

      const nextCursor =
        portfolios.length === limit
          ? portfolios[portfolios.length - 1].createdAt.toISOString()
          : null;

      return {
        items: portfolios.map((p) => this.transformPortfolio(p)),
        nextCursor,
        hasMore: portfolios.length === limit,
      };
    }

    // Use query builder for complex filtering
    const qb = this.portfolioRepository
      .createQueryBuilder('portfolio')
      .leftJoinAndSelect('portfolio.contractor', 'contractor')
      .leftJoinAndSelect('contractor.user', 'user')
      .leftJoinAndSelect('portfolio.images', 'images')
      .where('portfolio.isPublished = :published', { published: true });

    if (query.category) {
      qb.andWhere('portfolio.category = :category', { category: query.category });
    }

    if (query.subCategory) {
      qb.andWhere('portfolio.subCategory = :subCategory', { subCategory: query.subCategory });
    }

    if (query.city) {
      qb.andWhere('portfolio.locationCity = :city', { city: query.city });
    }

    if (query.district) {
      qb.andWhere('portfolio.locationDistrict = :district', { district: query.district });
    }

    if (query.costMin) {
      qb.andWhere('portfolio.costMin >= :costMin', { costMin: query.costMin });
    }

    if (query.costMax) {
      qb.andWhere('portfolio.costMax <= :costMax', { costMax: query.costMax });
    }

    qb.orderBy('portfolio.createdAt', 'DESC').take(limit);

    const portfolios = await qb.getMany();

    // Add like/save status for authenticated user
    if (userId) {
      for (const portfolio of portfolios) {
        const [isLiked, isSaved] = await Promise.all([
          this.likeRepository.findOne({
            where: { portfolioId: portfolio.id, userId },
          }),
          this.saveRepository.findOne({
            where: { portfolioId: portfolio.id, userId },
          }),
        ]);
        (portfolio as any).isLiked = !!isLiked;
        (portfolio as any).isSaved = !!isSaved;
      }
    }

    const nextCursor =
      portfolios.length === limit
        ? portfolios[portfolios.length - 1].createdAt.toISOString()
        : null;

    return {
      items: portfolios.map((p) => this.transformPortfolio(p)),
      nextCursor,
      hasMore: portfolios.length === limit,
    };
  }

  async findById(id: string, userId?: string): Promise<any> {
    const portfolio = await this.portfolioRepository.findOne({
      where: { id },
      relations: ['contractor', 'contractor.user', 'images'],
    });

    if (!portfolio) {
      throw new NotFoundException('Portfolio not found');
    }

    // Increment view count only once per user
    if (userId) {
      const existingView = await this.viewRepository.findOne({
        where: { portfolioId: id, userId },
      });

      if (!existingView) {
        await this.viewRepository.save({ portfolioId: id, userId });
        await this.portfolioRepository.increment({ id }, 'viewCount', 1);
      }
    }

    let isLiked = false;
    let isSaved = false;

    if (userId) {
      const [like, save] = await Promise.all([
        this.likeRepository.findOne({ where: { portfolioId: id, userId } }),
        this.saveRepository.findOne({ where: { portfolioId: id, userId } }),
      ]);
      isLiked = !!like;
      isSaved = !!save;
    }

    return {
      ...this.transformPortfolioDetail(portfolio),
      isLiked,
      isSaved,
    };
  }

  async create(userId: string, dto: CreatePortfolioDto): Promise<Portfolio> {
    const contractor = await this.contractorsService.findByUserId(userId);
    if (!contractor) {
      throw new ForbiddenException('업체 등록이 필요합니다');
    }

    const portfolio = this.portfolioRepository.create({
      contractorId: contractor.id,
      title: dto.title,
      description: dto.description,
      category: dto.category,
      subCategory: dto.subCategory,
      apartmentName: dto.apartmentName,
      areaSize: dto.areaSize,
      locationCity: dto.locationCity,
      locationDistrict: dto.locationDistrict,
      durationDays: dto.durationDays,
      costMin: dto.costMin,
      costMax: dto.costMax,
      completedAt: dto.completedAt,
    });

    const saved = await this.portfolioRepository.save(portfolio);

    // Save images
    if (dto.images && dto.images.length > 0) {
      const images = dto.images.map((img, index) =>
        this.imageRepository.create({
          portfolioId: saved.id,
          imageUrl: img.imageUrl,
          thumbnailUrl: img.thumbnailUrl,
          imageType: img.imageType || 'after',
          displayOrder: img.displayOrder ?? index,
        }),
      );
      await this.imageRepository.save(images);
    }

    const result = await this.portfolioRepository.findOne({
      where: { id: saved.id },
      relations: ['images'],
    });
    return result!;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdatePortfolioDto,
  ): Promise<Portfolio> {
    const portfolio = await this.portfolioRepository.findOne({
      where: { id },
      relations: ['contractor'],
    });

    if (!portfolio) {
      throw new NotFoundException('Portfolio not found');
    }

    const contractor = await this.contractorsService.findByUserId(userId);
    if (portfolio.contractorId !== contractor?.id) {
      throw new ForbiddenException('수정 권한이 없습니다');
    }

    // Extract images from dto to handle separately
    const { images, ...updateData } = dto;

    // Update portfolio fields
    if (Object.keys(updateData).length > 0) {
      await this.portfolioRepository.update(id, updateData);
    }

    // Handle images update if provided
    if (images !== undefined) {
      // Delete existing images
      await this.imageRepository.delete({ portfolioId: id });

      // Insert new images
      if (images.length > 0) {
        const newImages = images.map((img, index) =>
          this.imageRepository.create({
            portfolioId: id,
            imageUrl: img.imageUrl,
            thumbnailUrl: img.thumbnailUrl,
            imageType: img.imageType || 'after',
            displayOrder: img.displayOrder ?? index,
          }),
        );
        await this.imageRepository.save(newImages);
      }
    }

    const result = await this.portfolioRepository.findOne({
      where: { id },
      relations: ['images'],
    });
    return result!;
  }

  async delete(id: string, userId: string): Promise<void> {
    const portfolio = await this.portfolioRepository.findOne({
      where: { id },
    });

    if (!portfolio) {
      throw new NotFoundException('Portfolio not found');
    }

    const contractor = await this.contractorsService.findByUserId(userId);
    if (portfolio.contractorId !== contractor?.id) {
      throw new ForbiddenException('삭제 권한이 없습니다');
    }

    await this.portfolioRepository.delete(id);
  }

  async like(portfolioId: string, userId: string): Promise<void> {
    const existing = await this.likeRepository.findOne({
      where: { portfolioId, userId },
    });

    if (!existing) {
      await this.likeRepository.save({ portfolioId, userId });
      await this.portfolioRepository.increment({ id: portfolioId }, 'likeCount', 1);
    }
  }

  async unlike(portfolioId: string, userId: string): Promise<void> {
    const result = await this.likeRepository.delete({ portfolioId, userId });
    if (result.affected && result.affected > 0) {
      await this.portfolioRepository.decrement({ id: portfolioId }, 'likeCount', 1);
    }
  }

  async save(portfolioId: string, userId: string): Promise<void> {
    const existing = await this.saveRepository.findOne({
      where: { portfolioId, userId },
    });

    if (!existing) {
      await this.saveRepository.save({ portfolioId, userId });
      await this.portfolioRepository.increment({ id: portfolioId }, 'saveCount', 1);
    }
  }

  async unsave(portfolioId: string, userId: string): Promise<void> {
    const result = await this.saveRepository.delete({ portfolioId, userId });
    if (result.affected && result.affected > 0) {
      await this.portfolioRepository.decrement({ id: portfolioId }, 'saveCount', 1);
    }
  }

  async findSaved(userId: string, limit = 20, cursor?: string) {
    const qb = this.saveRepository
      .createQueryBuilder('save')
      .leftJoinAndSelect('save.portfolio', 'portfolio')
      .leftJoinAndSelect('portfolio.contractor', 'contractor')
      .leftJoinAndSelect('contractor.user', 'user')
      .leftJoinAndSelect('portfolio.images', 'images')
      .where('save.userId = :userId', { userId });

    if (cursor) {
      qb.andWhere('save.createdAt < :cursor', { cursor: new Date(cursor) });
    }

    qb.orderBy('save.createdAt', 'DESC').take(limit);

    const saves = await qb.getMany();

    // Check like status for each saved portfolio
    const portfolioIds = saves.map((s) => s.portfolioId);
    let likes: PortfolioLike[] = [];
    if (portfolioIds.length > 0) {
      likes = await this.likeRepository
        .createQueryBuilder('like')
        .where('like.userId = :userId', { userId })
        .andWhere('like.portfolioId IN (:...portfolioIds)', { portfolioIds })
        .getMany();
    }
    const likedIds = new Set(likes.map((l) => l.portfolioId));

    return {
      items: saves.map((s) => ({
        ...this.transformPortfolio(s.portfolio),
        isLiked: likedIds.has(s.portfolioId),
        isSaved: true,
        savedAt: s.createdAt,
      })),
      nextCursor:
        saves.length === limit
          ? saves[saves.length - 1].createdAt.toISOString()
          : null,
      hasMore: saves.length === limit,
    };
  }

  private transformPortfolio(portfolio: Portfolio) {
    const thumbnail = portfolio.images?.[0];
    return {
      id: portfolio.id,
      title: portfolio.title,
      thumbnailUrl: thumbnail?.thumbnailUrl || thumbnail?.imageUrl,
      category: portfolio.category,
      areaSize: portfolio.areaSize,
      locationCity: portfolio.locationCity,
      locationDistrict: portfolio.locationDistrict,
      likeCount: portfolio.likeCount,
      isLiked: (portfolio as any).isLiked || false,
      isSaved: (portfolio as any).isSaved || false,
      contractor: portfolio.contractor
        ? {
            id: portfolio.contractor.id,
            companyName: portfolio.contractor.companyName,
            profileImage: portfolio.contractor.user?.profileImage,
          }
        : null,
      createdAt: portfolio.createdAt,
    };
  }

  private transformPortfolioDetail(portfolio: Portfolio) {
    return {
      id: portfolio.id,
      title: portfolio.title,
      description: portfolio.description,
      category: portfolio.category,
      subCategory: portfolio.subCategory,
      apartmentName: portfolio.apartmentName,
      areaSize: portfolio.areaSize,
      locationCity: portfolio.locationCity,
      locationDistrict: portfolio.locationDistrict,
      durationDays: portfolio.durationDays,
      costMin: portfolio.costMin,
      costMax: portfolio.costMax,
      likeCount: portfolio.likeCount,
      saveCount: portfolio.saveCount,
      viewCount: portfolio.viewCount,
      completedAt: portfolio.completedAt,
      images: portfolio.images?.map((img) => ({
        id: img.id,
        imageUrl: img.imageUrl,
        thumbnailUrl: img.thumbnailUrl,
        imageType: img.imageType,
        displayOrder: img.displayOrder,
      })),
      contractor: portfolio.contractor
        ? {
            id: portfolio.contractor.id,
            companyName: portfolio.contractor.companyName,
            description: portfolio.contractor.description,
            profileImage: portfolio.contractor.profileImage || portfolio.contractor.user?.profileImage,
            career: portfolio.contractor.career,
          }
        : null,
      createdAt: portfolio.createdAt,
    };
  }
}

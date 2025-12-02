import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { PortfoliosService } from './portfolios.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';
import { FeedQueryDto } from './dto/feed-query.dto';

@Controller('portfolios')
export class PortfoliosController {
  constructor(private readonly portfoliosService: PortfoliosService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async findFeed(@Query() query: FeedQueryDto, @Request() req: ExpressRequest) {
    const userId = (req as any).user?.id;
    return this.portfoliosService.findFeed(query, userId);
  }

  @Get('saved')
  @UseGuards(JwtAuthGuard)
  async findSaved(
    @Request() req: ExpressRequest,
    @Query('limit') limit?: number,
    @Query('cursor') cursor?: string,
  ) {
    return this.portfoliosService.findSaved((req as any).user.id, limit, cursor);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async findOne(@Param('id') id: string, @Request() req: ExpressRequest) {
    const userId = (req as any).user?.id;
    return this.portfoliosService.findById(id, userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Request() req: ExpressRequest, @Body() createDto: CreatePortfolioDto) {
    return this.portfoliosService.create((req as any).user.id, createDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Request() req: ExpressRequest,
    @Body() updateDto: UpdatePortfolioDto,
  ) {
    return this.portfoliosService.update(id, (req as any).user.id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string, @Request() req: ExpressRequest) {
    await this.portfoliosService.delete(id, (req as any).user.id);
    return { message: '삭제되었습니다' };
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  async like(@Param('id') id: string, @Request() req: ExpressRequest) {
    await this.portfoliosService.like(id, (req as any).user.id);
    return { message: '좋아요 완료' };
  }

  @Delete(':id/like')
  @UseGuards(JwtAuthGuard)
  async unlike(@Param('id') id: string, @Request() req: ExpressRequest) {
    await this.portfoliosService.unlike(id, (req as any).user.id);
    return { message: '좋아요 취소' };
  }

  @Post(':id/save')
  @UseGuards(JwtAuthGuard)
  async save(@Param('id') id: string, @Request() req: ExpressRequest) {
    await this.portfoliosService.save(id, (req as any).user.id);
    return { message: '저장 완료' };
  }

  @Delete(':id/save')
  @UseGuards(JwtAuthGuard)
  async unsave(@Param('id') id: string, @Request() req: ExpressRequest) {
    await this.portfoliosService.unsave(id, (req as any).user.id);
    return { message: '저장 취소' };
  }
}

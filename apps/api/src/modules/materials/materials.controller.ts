import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MaterialsService } from './materials.service';
import { Material, MaterialCategory } from './entities/material.entity';

@Controller('materials')
@UseGuards(JwtAuthGuard)
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Get()
  async findAll(): Promise<Material[]> {
    return this.materialsService.findAll();
  }

  @Get('search')
  async search(@Query('q') query: string): Promise<Material[]> {
    return this.materialsService.search(query || '');
  }

  @Get('category/:category')
  async findByCategory(
    @Param('category') category: MaterialCategory,
  ): Promise<Material[]> {
    return this.materialsService.findByCategory(category);
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<Material> {
    return this.materialsService.findById(id);
  }

  @Post()
  async create(@Body() data: Partial<Material>): Promise<Material> {
    return this.materialsService.create(data);
  }
}

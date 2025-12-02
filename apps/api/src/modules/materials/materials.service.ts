import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Material, MaterialCategory } from './entities/material.entity';

@Injectable()
export class MaterialsService {
  constructor(
    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>,
  ) {}

  async findAll(): Promise<Material[]> {
    return this.materialRepository.find({
      where: { isActive: true },
      order: { category: 'ASC', name: 'ASC' },
    });
  }

  async findById(id: string): Promise<Material> {
    const material = await this.materialRepository.findOneBy({ id });
    if (!material) {
      throw new NotFoundException('Material not found');
    }
    return material;
  }

  async findByCategory(category: MaterialCategory): Promise<Material[]> {
    return this.materialRepository.find({
      where: { category, isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findByIds(ids: string[]): Promise<Material[]> {
    return this.materialRepository.findByIds(ids);
  }

  async search(query: string): Promise<Material[]> {
    return this.materialRepository
      .createQueryBuilder('material')
      .where('material.isActive = :isActive', { isActive: true })
      .andWhere(
        '(material.name ILIKE :query OR material.brand ILIKE :query OR material.subCategory ILIKE :query)',
        { query: `%${query}%` },
      )
      .orderBy('material.name', 'ASC')
      .getMany();
  }

  async create(data: Partial<Material>): Promise<Material> {
    const material = this.materialRepository.create(data);
    return this.materialRepository.save(material);
  }

  async update(id: string, data: Partial<Material>): Promise<Material> {
    await this.materialRepository.update(id, data);
    return this.findById(id);
  }

  async deactivate(id: string): Promise<void> {
    await this.materialRepository.update(id, { isActive: false });
  }
}

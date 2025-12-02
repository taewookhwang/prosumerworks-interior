import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SimulationProject, SimulationProjectStatus } from './entities/simulation-project.entity';
import { FloorPlan } from './entities/floor-plan.entity';
import { StructuralElement } from './entities/structural-element.entity';
import { DesignSimulation } from './entities/design-simulation.entity';
import { SimulationCart } from './entities/simulation-cart.entity';
import { SimulationEstimate } from './entities/simulation-estimate.entity';

@Injectable()
export class SimulationService {
  constructor(
    @InjectRepository(SimulationProject)
    private readonly projectRepository: Repository<SimulationProject>,
    @InjectRepository(FloorPlan)
    private readonly floorPlanRepository: Repository<FloorPlan>,
    @InjectRepository(StructuralElement)
    private readonly structuralElementRepository: Repository<StructuralElement>,
    @InjectRepository(DesignSimulation)
    private readonly designSimulationRepository: Repository<DesignSimulation>,
    @InjectRepository(SimulationCart)
    private readonly cartRepository: Repository<SimulationCart>,
    @InjectRepository(SimulationEstimate)
    private readonly estimateRepository: Repository<SimulationEstimate>,
  ) {}

  // ============== Project Methods ==============

  async createProject(customerId: string, data: Partial<SimulationProject>): Promise<SimulationProject> {
    const project = this.projectRepository.create({
      customerId,
      ...data,
      status: SimulationProjectStatus.DRAFT,
    });
    return this.projectRepository.save(project);
  }

  async findProjectById(id: string): Promise<SimulationProject> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['floorPlans', 'designSimulations', 'estimates'],
    });
    if (!project) {
      throw new NotFoundException('Simulation project not found');
    }
    return project;
  }

  async findProjectsByCustomer(customerId: string): Promise<SimulationProject[]> {
    return this.projectRepository.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
    });
  }

  async updateProjectStatus(id: string, status: SimulationProjectStatus): Promise<SimulationProject> {
    await this.projectRepository.update(id, { status });
    return this.findProjectById(id);
  }

  // ============== Floor Plan Methods ==============

  async addFloorPlan(projectId: string, imageUrl: string): Promise<FloorPlan> {
    const floorPlan = this.floorPlanRepository.create({
      projectId,
      originalImageUrl: imageUrl,
    });
    return this.floorPlanRepository.save(floorPlan);
  }

  async findFloorPlanById(id: string): Promise<FloorPlan> {
    const floorPlan = await this.floorPlanRepository.findOne({
      where: { id },
      relations: ['structuralElements'],
    });
    if (!floorPlan) {
      throw new NotFoundException('Floor plan not found');
    }
    return floorPlan;
  }

  // ============== Structural Element Methods ==============

  async addStructuralElements(floorPlanId: string, elements: Partial<StructuralElement>[]): Promise<StructuralElement[]> {
    const structuralElements = elements.map((el) =>
      this.structuralElementRepository.create({
        floorPlanId,
        ...el,
      }),
    );
    return this.structuralElementRepository.save(structuralElements);
  }

  async updateDemolitionSelection(elementId: string, isSelected: boolean): Promise<StructuralElement> {
    await this.structuralElementRepository.update(elementId, {
      isSelectedForDemolition: isSelected,
    });
    const element = await this.structuralElementRepository.findOneBy({ id: elementId });
    if (!element) {
      throw new NotFoundException('Structural element not found');
    }
    return element;
  }

  // ============== Design Simulation Methods ==============

  async createDesignSimulation(projectId: string, data: Partial<DesignSimulation>): Promise<DesignSimulation> {
    const design = this.designSimulationRepository.create({
      projectId,
      ...data,
    });
    return this.designSimulationRepository.save(design);
  }

  async findDesignSimulationsByProject(projectId: string): Promise<DesignSimulation[]> {
    return this.designSimulationRepository.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
    });
  }

  // ============== Cart Methods ==============

  async addToCart(projectId: string, materialId: string, quantity: number, unitPrice: number): Promise<SimulationCart> {
    const cartItem = this.cartRepository.create({
      projectId,
      materialId,
      quantity,
      unitPriceSnapshot: unitPrice,
    });
    return this.cartRepository.save(cartItem);
  }

  async getCartItems(projectId: string): Promise<SimulationCart[]> {
    return this.cartRepository.find({
      where: { projectId },
      relations: ['material'],
    });
  }

  async removeFromCart(cartItemId: string): Promise<void> {
    await this.cartRepository.delete(cartItemId);
  }

  // ============== Estimate Methods ==============

  async createEstimate(projectId: string, data: Partial<SimulationEstimate>): Promise<SimulationEstimate> {
    const estimate = this.estimateRepository.create({
      projectId,
      ...data,
    });
    return this.estimateRepository.save(estimate);
  }

  async findEstimatesByProject(projectId: string): Promise<SimulationEstimate[]> {
    return this.estimateRepository.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
    });
  }
}

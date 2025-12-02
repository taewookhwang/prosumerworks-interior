import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SimulationService } from './simulation.service';
import { SimulationProject, PropertyType } from './entities/simulation-project.entity';

interface AuthenticatedRequest {
  user: { id: string };
}

@Controller('simulation')
@UseGuards(JwtAuthGuard)
export class SimulationController {
  constructor(private readonly simulationService: SimulationService) {}

  // ============== Project Endpoints ==============

  @Post('projects')
  async createProject(
    @Request() req: AuthenticatedRequest,
    @Body() body: { title: string; propertyType?: PropertyType; areaSize?: number; locationCity?: string; locationDistrict?: string },
  ): Promise<SimulationProject> {
    return this.simulationService.createProject(req.user.id, body);
  }

  @Get('projects')
  async getMyProjects(@Request() req: AuthenticatedRequest): Promise<SimulationProject[]> {
    return this.simulationService.findProjectsByCustomer(req.user.id);
  }

  @Get('projects/:id')
  async getProject(@Param('id') id: string): Promise<SimulationProject> {
    return this.simulationService.findProjectById(id);
  }

  // ============== Floor Plan Endpoints ==============

  @Post('projects/:projectId/floor-plans')
  async addFloorPlan(
    @Param('projectId') projectId: string,
    @Body() body: { imageUrl: string },
  ) {
    return this.simulationService.addFloorPlan(projectId, body.imageUrl);
  }

  @Get('floor-plans/:id')
  async getFloorPlan(@Param('id') id: string) {
    return this.simulationService.findFloorPlanById(id);
  }

  // ============== Structural Element Endpoints ==============

  @Post('floor-plans/:floorPlanId/elements')
  async addStructuralElements(
    @Param('floorPlanId') floorPlanId: string,
    @Body() body: { elements: any[] },
  ) {
    return this.simulationService.addStructuralElements(floorPlanId, body.elements);
  }

  @Post('elements/:elementId/demolition')
  async updateDemolitionSelection(
    @Param('elementId') elementId: string,
    @Body() body: { isSelected: boolean },
  ) {
    return this.simulationService.updateDemolitionSelection(elementId, body.isSelected);
  }

  // ============== Design Simulation Endpoints ==============

  @Post('projects/:projectId/designs')
  async createDesignSimulation(
    @Param('projectId') projectId: string,
    @Body() body: { stylePrompt: string; referenceImageUrls?: string[] },
  ) {
    return this.simulationService.createDesignSimulation(projectId, body);
  }

  @Get('projects/:projectId/designs')
  async getDesignSimulations(@Param('projectId') projectId: string) {
    return this.simulationService.findDesignSimulationsByProject(projectId);
  }

  // ============== Cart Endpoints ==============

  @Post('projects/:projectId/cart')
  async addToCart(
    @Param('projectId') projectId: string,
    @Body() body: { materialId: string; quantity: number; unitPrice: number },
  ) {
    return this.simulationService.addToCart(projectId, body.materialId, body.quantity, body.unitPrice);
  }

  @Get('projects/:projectId/cart')
  async getCartItems(@Param('projectId') projectId: string) {
    return this.simulationService.getCartItems(projectId);
  }

  // ============== Estimate Endpoints ==============

  @Get('projects/:projectId/estimates')
  async getEstimates(@Param('projectId') projectId: string) {
    return this.simulationService.findEstimatesByProject(projectId);
  }
}

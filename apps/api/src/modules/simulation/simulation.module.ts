import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SimulationProject } from './entities/simulation-project.entity';
import { FloorPlan } from './entities/floor-plan.entity';
import { StructuralElement } from './entities/structural-element.entity';
import { DesignSimulation } from './entities/design-simulation.entity';
import { SimulationCart } from './entities/simulation-cart.entity';
import { SimulationEstimate } from './entities/simulation-estimate.entity';
import { SimulationController } from './simulation.controller';
import { SimulationService } from './simulation.service';
import { MaterialsModule } from '../materials/materials.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SimulationProject,
      FloorPlan,
      StructuralElement,
      DesignSimulation,
      SimulationCart,
      SimulationEstimate,
    ]),
    MaterialsModule,
  ],
  controllers: [SimulationController],
  providers: [SimulationService],
  exports: [SimulationService],
})
export class SimulationModule {}

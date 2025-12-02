import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApsService } from './aps.service';
import { ApsController } from './aps.controller';
import { DesignAutomationService } from './design-automation.service';
import { DesignAutomationController } from './design-automation.controller';

@Module({
  imports: [ConfigModule],
  controllers: [ApsController, DesignAutomationController],
  providers: [ApsService, DesignAutomationService],
  exports: [ApsService, DesignAutomationService], // 다른 모듈에서 사용 가능하도록 export
})
export class ApsModule {}

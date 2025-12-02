import { Module } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { UploadsController } from './uploads.controller';

@Module({
  imports: [],
  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}

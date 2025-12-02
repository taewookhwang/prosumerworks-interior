import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('presigned-url')
  async getPresignedUrl(
    @Body('fileName') fileName: string,
    @Body('fileType') fileType: string,
    @Body('purpose') purpose: string,
  ) {
    return this.uploadsService.getPresignedUrl(fileName, fileType, purpose);
  }
}

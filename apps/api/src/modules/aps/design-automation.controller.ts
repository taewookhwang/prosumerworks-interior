/**
 * Design Automation Controller
 *
 * REST API endpoints for managing Design Automation resources
 * and extracting Block Reference coordinates from DWG files
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DesignAutomationService, ExtractionResult } from './design-automation.service';

@Controller('design-automation')
export class DesignAutomationController {
  constructor(private readonly daService: DesignAutomationService) {}

  // ============== 설정 및 상태 ==============

  /**
   * 사용 가능한 AutoCAD 엔진 목록 조회
   * GET /api/v1/design-automation/engines
   */
  @Get('engines')
  async listEngines() {
    const engines = await this.daService.listEngines();
    return {
      status: 'success',
      engines,
    };
  }

  /**
   * Nickname 설정 (최초 1회)
   * POST /api/v1/design-automation/nickname
   */
  @Post('nickname')
  async setNickname(@Body('nickname') nickname?: string) {
    await this.daService.setNickname(nickname);
    return {
      status: 'success',
      message: `Nickname set successfully`,
    };
  }

  // ============== AppBundle 관리 ==============

  /**
   * AppBundle 목록 조회
   * GET /api/v1/design-automation/appbundles
   */
  @Get('appbundles')
  async listAppBundles() {
    const appBundles = await this.daService.listAppBundles();
    return {
      status: 'success',
      appBundles,
    };
  }

  /**
   * 현재 AppBundle 조회
   * GET /api/v1/design-automation/appbundle
   */
  @Get('appbundle')
  async getAppBundle() {
    const appBundle = await this.daService.getAppBundle();
    return {
      status: appBundle ? 'success' : 'not_found',
      appBundle,
    };
  }

  /**
   * AppBundle 생성/업데이트 (ZIP 파일 업로드)
   * POST /api/v1/design-automation/appbundle
   * Body: multipart/form-data with 'file' field (ZIP)
   */
  @Post('appbundle')
  @UseInterceptors(FileInterceptor('file'))
  async createOrUpdateAppBundle(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const fileName = file.originalname.toLowerCase();
    if (!fileName.endsWith('.zip')) {
      throw new BadRequestException('Only ZIP files are supported');
    }

    const appBundle = await this.daService.createOrUpdateAppBundle(file.buffer);
    return {
      status: 'success',
      appBundle,
    };
  }

  /**
   * AppBundle 삭제
   * DELETE /api/v1/design-automation/appbundle
   */
  @Delete('appbundle')
  async deleteAppBundle() {
    await this.daService.deleteAppBundle();
    return {
      status: 'success',
      message: 'AppBundle deleted',
    };
  }

  // ============== Activity 관리 ==============

  /**
   * 현재 Activity 조회
   * GET /api/v1/design-automation/activity
   */
  @Get('activity')
  async getActivity() {
    const activity = await this.daService.getActivity();
    return {
      status: activity ? 'success' : 'not_found',
      activity,
    };
  }

  /**
   * Activity 생성/업데이트
   * POST /api/v1/design-automation/activity
   */
  @Post('activity')
  async createOrUpdateActivity() {
    const activity = await this.daService.createOrUpdateActivity();
    return {
      status: 'success',
      activity,
    };
  }

  /**
   * Activity 삭제
   * DELETE /api/v1/design-automation/activity
   */
  @Delete('activity')
  async deleteActivity() {
    await this.daService.deleteActivity();
    return {
      status: 'success',
      message: 'Activity deleted',
    };
  }

  // ============== 전체 설정 ==============

  /**
   * Design Automation 환경 전체 설정 (AppBundle + Activity)
   * POST /api/v1/design-automation/setup
   * Body: multipart/form-data with 'file' field (ZIP)
   */
  @Post('setup')
  @UseInterceptors(FileInterceptor('file'))
  async setupDesignAutomation(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const fileName = file.originalname.toLowerCase();
    if (!fileName.endsWith('.zip')) {
      throw new BadRequestException('Only ZIP files are supported');
    }

    const result = await this.daService.setupDesignAutomation(file.buffer);
    return {
      status: 'success',
      ...result,
    };
  }

  // ============== WorkItem 실행 ==============

  /**
   * WorkItem 상태 조회
   * GET /api/v1/design-automation/workitem?id=xxx
   */
  @Get('workitem')
  async getWorkItemStatus(@Query('id') workItemId: string) {
    if (!workItemId) {
      throw new BadRequestException('WorkItem ID is required');
    }

    const status = await this.daService.getWorkItemStatus(workItemId);
    return {
      status: 'success',
      workItem: status,
    };
  }

  /**
   * WorkItem 실행 (수동)
   * POST /api/v1/design-automation/workitem
   * Body: { inputFileUrl, outputFileUrl }
   */
  @Post('workitem')
  async submitWorkItem(
    @Body('inputFileUrl') inputFileUrl: string,
    @Body('outputFileUrl') outputFileUrl: string,
  ) {
    if (!inputFileUrl || !outputFileUrl) {
      throw new BadRequestException('inputFileUrl and outputFileUrl are required');
    }

    const workItem = await this.daService.submitWorkItem(inputFileUrl, outputFileUrl);
    return {
      status: 'success',
      workItem,
    };
  }

  // ============== 좌표 추출 (고수준 API) ==============

  /**
   * DWG 파일에서 Block Reference 좌표 추출
   * GET /api/v1/design-automation/extract-coords?urn=xxx
   *
   * OSS에 저장된 DWG 파일의 URN을 받아서:
   * 1. WorkItem 생성
   * 2. 완료 대기
   * 3. 결과 JSON 반환
   */
  @Get('extract-coords')
  async extractBlockCoordinates(@Query('urn') urn: string): Promise<{
    status: string;
    result: ExtractionResult;
  }> {
    if (!urn) {
      throw new BadRequestException('URN is required');
    }

    const result = await this.daService.extractBlockCoordinates(urn);
    return {
      status: result.success ? 'success' : 'failed',
      result,
    };
  }
}

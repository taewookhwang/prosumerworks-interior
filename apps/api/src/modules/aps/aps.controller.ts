import {
  Controller,
  Get,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApsService, DwgParseResult } from './aps.service';

@Controller('aps')
export class ApsController {
  constructor(private readonly apsService: ApsService) {}

  /**
   * APS 연결 테스트
   * GET /api/v1/aps/test-connection
   */
  @Get('test-connection')
  async testConnection() {
    const token = await this.apsService.getAccessToken();
    return {
      status: 'success',
      message: 'Connected to Autodesk Platform Services!',
      preview_token: token.substring(0, 20) + '...', // 보안상 앞부분만
    };
  }

  /**
   * DWG 파일 업로드 및 파싱
   * POST /api/v1/aps/parse-dwg
   * Body: multipart/form-data with 'file' field
   */
  @Post('parse-dwg')
  @UseInterceptors(FileInterceptor('file'))
  async parseDwgFile(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<DwgParseResult> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // DWG 파일 확인
    const fileName = file.originalname.toLowerCase();
    if (!fileName.endsWith('.dwg')) {
      throw new BadRequestException('Only DWG files are supported');
    }

    return this.apsService.parseDwgFile(file.buffer, file.originalname);
  }

  /**
   * 변환 상태 확인
   * GET /api/v1/aps/translation-status?urn=xxx
   */
  @Get('translation-status')
  async getTranslationStatus(@Query('urn') urn: string) {
    if (!urn) {
      throw new BadRequestException('URN is required');
    }
    return this.apsService.getTranslationStatus(urn);
  }

  /**
   * 모델 메타데이터 조회
   * GET /api/v1/aps/metadata?urn=xxx
   */
  @Get('metadata')
  async getMetadata(@Query('urn') urn: string) {
    if (!urn) {
      throw new BadRequestException('URN is required');
    }
    return this.apsService.getModelMetadata(urn);
  }

  /**
   * 오브젝트 트리 조회 (디버깅용)
   * GET /api/v1/aps/object-tree?urn=xxx&guid=xxx
   */
  @Get('object-tree')
  async getObjectTree(
    @Query('urn') urn: string,
    @Query('guid') guid: string,
  ) {
    if (!urn || !guid) {
      throw new BadRequestException('URN and GUID are required');
    }
    return this.apsService.getObjectTree(urn, guid);
  }

  /**
   * 요소 속성 조회 (디버깅용)
   * GET /api/v1/aps/properties?urn=xxx&guid=xxx
   */
  @Get('properties')
  async getProperties(
    @Query('urn') urn: string,
    @Query('guid') guid: string,
  ) {
    if (!urn || !guid) {
      throw new BadRequestException('URN and GUID are required');
    }
    return this.apsService.getProperties(urn, guid);
  }

  /**
   * 기존 URN을 다시 파싱 (업로드 없이)
   * GET /api/v1/aps/reparse?urn=xxx
   */
  @Get('reparse')
  async reparseUrn(@Query('urn') urn: string): Promise<DwgParseResult> {
    if (!urn) {
      throw new BadRequestException('URN is required');
    }
    return this.apsService.reparseExistingUrn(urn);
  }

  /**
   * Manifest 조회 (geometry/derivatives 정보)
   * GET /api/v1/aps/manifest?urn=xxx
   */
  @Get('manifest')
  async getManifest(@Query('urn') urn: string) {
    if (!urn) {
      throw new BadRequestException('URN is required');
    }
    return this.apsService.getManifestWithGeometry(urn);
  }

  /**
   * 특정 오브젝트들의 상세 속성 조회 (디버깅용)
   * GET /api/v1/aps/debug-props?urn=xxx&guid=xxx&objectIds=1,2,3
   */
  @Get('debug-props')
  async debugProperties(
    @Query('urn') urn: string,
    @Query('guid') guid: string,
    @Query('objectIds') objectIds: string,
  ) {
    if (!urn || !guid || !objectIds) {
      throw new BadRequestException('URN, GUID, and objectIds are required');
    }
    const ids = objectIds.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
    return this.apsService.debugObjectProperties(urn, guid, ids);
  }

  /**
   * Properties:query 엔드포인트로 bounds 포함 속성 조회
   * GET /api/v1/aps/props-with-bounds?urn=xxx&limit=10
   */
  @Get('props-with-bounds')
  async getPropertiesWithBounds(
    @Query('urn') urn: string,
    @Query('limit') limit: string = '10',
  ) {
    if (!urn) {
      throw new BadRequestException('URN is required');
    }

    // Get metadata to find GUID
    const metadata = await this.apsService.getModelMetadata(urn);
    const modelGuid = metadata.data?.metadata?.[0]?.guid;
    if (!modelGuid) {
      throw new BadRequestException('Model GUID not found');
    }

    return this.apsService.fetchPropertiesWithBounds(
      urn,
      modelGuid,
      parseInt(limit, 10) || 10,
      0,
    );
  }

  /**
   * Block Reference 샘플 조회 - 첫 10개의 Block Reference 속성 반환
   * GET /api/v1/aps/sample-blocks?urn=xxx
   */
  @Get('sample-blocks')
  async getSampleBlocks(@Query('urn') urn: string) {
    if (!urn) {
      throw new BadRequestException('URN is required');
    }

    // Get metadata to find GUID
    const metadata = await this.apsService.getModelMetadata(urn);
    const modelGuid = metadata.data?.metadata?.[0]?.guid;
    if (!modelGuid) {
      throw new BadRequestException('Model GUID not found');
    }

    // Get properties and find Block References
    const properties = await this.apsService.getProperties(urn, modelGuid);
    const blockRefs: any[] = [];

    if (properties.data?.collection) {
      for (const item of properties.data.collection) {
        // Check if this is a Block Reference
        const general = item.properties?.['General'] || item.properties?.['General '] || {};
        const elementName = general['Name '] || general['Name'] || '';

        if (elementName === 'Block Reference' && blockRefs.length < 10) {
          blockRefs.push({
            objectid: item.objectid,
            name: item.name,
            externalId: item.externalId,
            allProperties: item.properties,  // 전체 속성 구조 반환
          });
        }
      }
    }

    return {
      modelGuid,
      totalBlockReferences: blockRefs.length,
      samples: blockRefs,
    };
  }
}

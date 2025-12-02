import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApartmentsService } from './apartments.service';
import { CreateApartmentDto, UploadDwgDto } from './dto/create-apartment.dto';

@Controller('apartments')
export class ApartmentsController {
  constructor(private readonly apartmentsService: ApartmentsService) {}

  // ================== 아파트 관리 ==================

  /**
   * 아파트 목록 조회
   * GET /api/v1/apartments
   */
  @Get()
  async findAllApartments() {
    return this.apartmentsService.findAllApartments();
  }

  /**
   * 아파트 상세 조회
   * GET /api/v1/apartments/:id
   */
  @Get(':id')
  async findApartmentById(@Param('id') id: string) {
    return this.apartmentsService.findApartmentById(id);
  }

  /**
   * 아파트 생성 (관리자용)
   * POST /api/v1/apartments
   */
  @Post()
  async createApartment(@Body() dto: CreateApartmentDto) {
    return this.apartmentsService.createApartment(dto);
  }

  /**
   * 아파트 통계 조회
   * GET /api/v1/apartments/:id/stats
   */
  @Get(':id/stats')
  async getApartmentStats(@Param('id') id: string) {
    return this.apartmentsService.getApartmentStats(id);
  }

  // ================== 도면 관리 ==================

  /**
   * 아파트의 도면 목록 조회
   * GET /api/v1/apartments/:apartmentId/floor-plans
   */
  @Get(':apartmentId/floor-plans')
  async findFloorPlansByApartment(@Param('apartmentId') apartmentId: string) {
    return this.apartmentsService.findFloorPlansByApartment(apartmentId);
  }

  /**
   * 특정 평형 타입의 도면 조회
   * GET /api/v1/apartments/:apartmentId/floor-plans/by-type?type=84A
   */
  @Get(':apartmentId/floor-plans/by-type')
  async findFloorPlansByType(
    @Param('apartmentId') apartmentId: string,
    @Query('type') floorType: string,
  ) {
    return this.apartmentsService.findFloorPlansByFloorType(apartmentId, floorType);
  }

  /**
   * 특정 동/호수의 도면 조회
   * GET /api/v1/apartments/:apartmentId/floor-plans/by-unit?building=101&unit=1501
   */
  @Get(':apartmentId/floor-plans/by-unit')
  async findFloorPlanByUnit(
    @Param('apartmentId') apartmentId: string,
    @Query('building') buildingNumber: string,
    @Query('unit') unitNumber: string,
  ) {
    const plan = await this.apartmentsService.findFloorPlanByUnit(
      apartmentId,
      buildingNumber,
      unitNumber,
    );
    if (!plan) {
      throw new BadRequestException('해당 동/호수의 도면을 찾을 수 없습니다.');
    }
    return plan;
  }

  // ================== DWG 업로드 ==================

  /**
   * DWG 파일 업로드 및 파싱 (관리자용)
   * POST /api/v1/apartments/:apartmentId/upload-dwg
   * Body: multipart/form-data with 'file' field
   */
  @Post(':apartmentId/upload-dwg')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDwg(
    @Param('apartmentId') apartmentId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: Omit<UploadDwgDto, 'apartmentId'>,
  ) {
    if (!file) {
      throw new BadRequestException('파일이 업로드되지 않았습니다.');
    }

    const fileName = file.originalname.toLowerCase();
    if (!fileName.endsWith('.dwg')) {
      throw new BadRequestException('DWG 파일만 업로드 가능합니다.');
    }

    const dto: UploadDwgDto = {
      apartmentId,
      buildingNumber: body.buildingNumber,
      unitNumber: body.unitNumber,
      floorType: body.floorType,
      areaPyeong: body.areaPyeong ? Number(body.areaPyeong) : undefined,
    };

    return this.apartmentsService.uploadAndParseDwg(file.buffer, file.originalname, dto);
  }

  // ================== 시뮬레이터용 API ==================

  /**
   * 도면 상세 조회 (원본 데이터)
   * GET /api/v1/apartments/floor-plans/:id
   */
  @Get('floor-plans/:id')
  async findFloorPlanById(@Param('id') id: string) {
    return this.apartmentsService.findFloorPlanById(id);
  }

  /**
   * 시뮬레이터용 FloorPlanAnalysis 형식으로 변환
   * GET /api/v1/apartments/floor-plans/:id/analysis
   */
  @Get('floor-plans/:id/analysis')
  async getFloorPlanAnalysis(@Param('id') id: string) {
    const floorPlan = await this.apartmentsService.findFloorPlanById(id);
    return this.apartmentsService.convertToFloorPlanAnalysis(floorPlan);
  }
}

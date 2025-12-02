import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SdkManagerBuilder } from '@aps_sdk/autodesk-sdkmanager';
import { AuthenticationClient, Scopes } from '@aps_sdk/authentication';
import { OssClient, Region, PolicyKey } from '@aps_sdk/oss';
import { ModelDerivativeClient, Region as MDRegion } from '@aps_sdk/model-derivative';

/**
 * DWG 파일에서 추출된 요소 정보
 */
export interface DwgElement {
  id: string;
  type: 'wall' | 'door' | 'window' | 'column' | 'room' | 'bathroom' | 'kitchen' | 'fixture' | 'furniture' | 'other';
  name: string;
  layer: string;
  coordinates: {
    x: number;
    y: number;
    width?: number;
    height?: number;
  };
  properties: Record<string, any>;
}

/**
 * DWG 파싱 결과
 */
export interface DwgParseResult {
  success: boolean;
  fileName: string;
  urn: string;
  elements: DwgElement[];
  rooms: {
    name: string;
    area: number;
    coordinates: { x: number; y: number; width: number; height: number };
  }[];
  walls: DwgElement[];
  doors: DwgElement[];
  windows: DwgElement[];
  bathroom: DwgElement[];
  kitchen: DwgElement[];
  fixtures: DwgElement[];
  furniture: DwgElement[];
  rawObjectTree: any;
  rawProperties: any;
  metadata: {
    units: string;
    totalArea?: number;
    scale?: number;
    totalElements: number;
    classifiedElements: number;
  };
  /**
   * AI용 섬네일 이미지 URL (APS에서 생성된 2D 렌더링)
   */
  thumbnailUrl?: string;
  /**
   * AI용 시맨틱 설명 (도면 요소 요약)
   */
  semanticDescription?: {
    summary: string;
    elementCounts: Record<string, number>;
    layers: string[];
    blockNames: string[];
    estimatedRooms: string[];
  };
  /**
   * 평형별 템플릿 요소 (중복 제거된 고유 요소만)
   * - 같은 이름의 요소는 하나만 포함
   * - AI가 도면 구조를 이해하는 데 사용
   */
  templateElements?: {
    walls: DwgElement[];
    doors: DwgElement[];
    windows: DwgElement[];
    bathroom: DwgElement[];
    kitchen: DwgElement[];
    fixtures: DwgElement[];
    furniture: DwgElement[];
    uniqueCounts: Record<string, number>;
  };
}

@Injectable()
export class ApsService {
  private readonly logger = new Logger(ApsService.name);
  private sdkManager: any;
  private authenticationClient: AuthenticationClient;
  private ossClient: OssClient;
  private modelDerivativeClient: ModelDerivativeClient;

  // 토큰 캐싱
  private accessToken: string | null = null;
  private tokenExpiration: number = 0;

  // 버킷 이름 (프로젝트용)
  private readonly bucketKey: string;

  constructor(private configService: ConfigService) {
    // SDK 매니저 초기화
    this.sdkManager = SdkManagerBuilder.create().build();

    // 각 API 클라이언트 초기화
    this.authenticationClient = new AuthenticationClient(this.sdkManager);
    this.ossClient = new OssClient(this.sdkManager);
    this.modelDerivativeClient = new ModelDerivativeClient(this.sdkManager);

    // 버킷 이름 설정 (소문자, 숫자, 하이픈만 허용)
    this.bucketKey = 'interior-app-dwg-bucket';

    this.logger.log('APS Service initialized');
  }

  /**
   * 2-Legged OAuth 토큰 발급 (Server-to-Server)
   */
  async getAccessToken(): Promise<string> {
    // 캐시된 토큰이 유효하면 재사용
    if (this.accessToken && Date.now() < this.tokenExpiration) {
      return this.accessToken;
    }

    try {
      const clientId = this.configService.get<string>('APS_CLIENT_ID');
      const clientSecret = this.configService.get<string>('APS_CLIENT_SECRET');

      if (!clientId || !clientSecret) {
        throw new Error('APS_CLIENT_ID or APS_CLIENT_SECRET is missing in .env');
      }

      // 토큰 요청
      const credentials = await this.authenticationClient.getTwoLeggedToken(
        clientId,
        clientSecret,
        [
          Scopes.DataRead,
          Scopes.DataWrite,
          Scopes.BucketCreate,
          Scopes.BucketRead,
        ],
      );

      // 토큰 저장 (만료 5분 전까지 유효)
      this.accessToken = credentials.access_token;
      this.tokenExpiration = Date.now() + (credentials.expires_in - 300) * 1000;

      this.logger.log('New APS Access Token acquired');
      return this.accessToken;
    } catch (error) {
      this.logger.error('Failed to get APS Token:', error);
      throw new InternalServerErrorException('Failed to authenticate with Autodesk');
    }
  }

  /**
   * 버킷 생성 또는 확인
   */
  async ensureBucket(): Promise<string> {
    const token = await this.getAccessToken();

    try {
      // 버킷 존재 확인
      await this.ossClient.getBucketDetails(this.bucketKey, { accessToken: token });
      this.logger.log(`Bucket ${this.bucketKey} already exists`);
      return this.bucketKey;
    } catch (error: any) {
      // 버킷이 없으면 생성
      if (error.axiosError?.response?.status === 404 || error.response?.status === 404) {
        this.logger.log(`Creating bucket: ${this.bucketKey}`);
        await this.ossClient.createBucket(
          Region.Us,
          {
            bucketKey: this.bucketKey,
            policyKey: PolicyKey.Transient, // 24시간 후 자동 삭제
          },
          { accessToken: token }
        );
        this.logger.log(`Bucket ${this.bucketKey} created`);
        return this.bucketKey;
      }
      throw error;
    }
  }

  /**
   * DWG 파일 업로드 (Signed S3 Upload 방식)
   */
  async uploadDwgFile(
    fileBuffer: Buffer,
    fileName: string,
  ): Promise<{ objectId: string; urn: string }> {
    const token = await this.getAccessToken();
    await this.ensureBucket();

    try {
      // 파일 이름을 영문/숫자만으로 변환 (한글 제거)
      const sanitizedFileName = fileName
        .replace(/[^\w\d.-]/g, '_')
        .replace(/_+/g, '_');
      const objectName = `${Date.now()}_${sanitizedFileName}`;

      this.logger.log(`Uploading file: ${objectName} (${fileBuffer.length} bytes)`);

      const fetch = (await import('node-fetch')).default;

      // 1. Signed S3 Upload URL 요청
      const signedUrlResponse = await fetch(
        `https://developer.api.autodesk.com/oss/v2/buckets/${this.bucketKey}/objects/${encodeURIComponent(objectName)}/signeds3upload`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!signedUrlResponse.ok) {
        const errorText = await signedUrlResponse.text();
        this.logger.error(`Failed to get signed URL: ${signedUrlResponse.status} - ${errorText}`);
        throw new Error(`Failed to get signed URL: ${signedUrlResponse.status}`);
      }

      const signedData = await signedUrlResponse.json() as any;
      const uploadUrl = signedData.urls?.[0];
      const uploadKey = signedData.uploadKey;

      if (!uploadUrl || !uploadKey) {
        throw new Error('No upload URL or key received');
      }

      this.logger.log(`Got signed URL, uploading to S3...`);

      // 2. S3에 파일 업로드
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: fileBuffer,
        headers: {
          'Content-Type': 'application/octet-stream',
        },
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        this.logger.error(`S3 upload failed: ${uploadResponse.status} - ${errorText}`);
        throw new Error(`S3 upload failed: ${uploadResponse.status}`);
      }

      this.logger.log(`S3 upload successful, completing...`);

      // 3. 업로드 완료 알림
      const completeResponse = await fetch(
        `https://developer.api.autodesk.com/oss/v2/buckets/${this.bucketKey}/objects/${encodeURIComponent(objectName)}/signeds3upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ uploadKey }),
        }
      );

      if (!completeResponse.ok) {
        const errorText = await completeResponse.text();
        this.logger.error(`Complete upload failed: ${completeResponse.status} - ${errorText}`);
        throw new Error(`Complete upload failed: ${completeResponse.status}`);
      }

      const completeResult = await completeResponse.json() as any;
      this.logger.log(`Upload completed: ${JSON.stringify(completeResult)}`);

      // URN 생성 (Base64 URL-safe 인코딩)
      const objectId = completeResult.objectId || `urn:adsk.objects:os.object:${this.bucketKey}/${objectName}`;
      const urn = Buffer.from(objectId).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      this.logger.log(`File uploaded: ${objectName}, URN: ${urn}`);
      return { objectId, urn };
    } catch (error) {
      this.logger.error('Failed to upload DWG file:', error);
      throw new InternalServerErrorException('Failed to upload DWG file');
    }
  }

  /**
   * DWG → SVF2 변환 작업 시작
   */
  async startTranslation(urn: string): Promise<string> {
    const token = await this.getAccessToken();

    try {
      const job = await this.modelDerivativeClient.startJob(
        {
          input: {
            urn: urn,
          },
          output: {
            formats: [
              {
                type: 'svf2' as any,
                views: ['2d', '3d'],
              },
            ],
            destination: {
              region: MDRegion.Us,
            },
          },
        },
        { accessToken: token }
      );

      this.logger.log(`Translation job started for URN: ${urn}`);
      return job.urn || urn;
    } catch (error) {
      this.logger.error('Failed to start translation:', error);
      throw new InternalServerErrorException('Failed to start DWG translation');
    }
  }

  /**
   * 변환 상태 확인
   */
  async getTranslationStatus(urn: string): Promise<{
    status: 'pending' | 'inprogress' | 'success' | 'failed';
    progress: string;
    messages?: any[];
  }> {
    const token = await this.getAccessToken();

    try {
      const manifest = await this.modelDerivativeClient.getManifest(urn, { accessToken: token });

      // 실패 시 상세 메시지 추출
      let messages: any[] = [];
      if (manifest.derivatives) {
        for (const derivative of manifest.derivatives as any[]) {
          if (derivative.messages) {
            messages = messages.concat(derivative.messages);
          }
        }
      }

      return {
        status: manifest.status as any,
        progress: manifest.progress || '0%',
        messages,
      };
    } catch (error) {
      this.logger.error('Failed to get translation status:', error);
      throw new InternalServerErrorException('Failed to get translation status');
    }
  }

  /**
   * 변환 완료 대기 (폴링)
   */
  async waitForTranslation(
    urn: string,
    maxWaitSeconds: number = 300,
  ): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitSeconds * 1000) {
      const { status, progress, messages } = await this.getTranslationStatus(urn);
      this.logger.log(`Translation status: ${status}, progress: ${progress}`);

      if (status === 'success') {
        return true;
      }
      if (status === 'failed') {
        const errorDetails = messages?.map((m: any) => m.message || m.code).join('; ') || 'Unknown error';
        this.logger.error(`Translation failed: ${errorDetails}`);
        throw new InternalServerErrorException(`DWG translation failed: ${errorDetails}`);
      }

      // 5초 대기
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    throw new InternalServerErrorException('Translation timeout');
  }

  /**
   * 변환된 모델에서 메타데이터 추출
   */
  async getModelMetadata(urn: string): Promise<any> {
    const token = await this.getAccessToken();

    try {
      const metadata = await this.modelDerivativeClient.getModelViews(urn, { accessToken: token });
      return metadata;
    } catch (error) {
      this.logger.error('Failed to get model metadata:', error);
      throw new InternalServerErrorException('Failed to get model metadata');
    }
  }

  /**
   * 오브젝트 트리 (요소 계층 구조) 가져오기
   */
  async getObjectTree(urn: string, modelGuid: string): Promise<any> {
    const token = await this.getAccessToken();

    try {
      const tree = await this.modelDerivativeClient.getObjectTree(urn, modelGuid, { accessToken: token });
      return tree;
    } catch (error) {
      this.logger.error('Failed to get object tree:', error);
      throw new InternalServerErrorException('Failed to get object tree');
    }
  }

  /**
   * 요소 속성 가져오기
   */
  async getProperties(urn: string, modelGuid: string): Promise<any> {
    const token = await this.getAccessToken();

    try {
      const properties = await this.modelDerivativeClient.getAllProperties(urn, modelGuid, { accessToken: token });
      return properties;
    } catch (error) {
      this.logger.error('Failed to get properties:', error);
      throw new InternalServerErrorException('Failed to get properties');
    }
  }

  /**
   * DWG 파일을 업로드하고 파싱하여 구조화된 데이터 반환
   * (전체 플로우)
   */
  async parseDwgFile(
    fileBuffer: Buffer,
    fileName: string,
  ): Promise<DwgParseResult> {
    try {
      // 1. 파일 업로드
      this.logger.log(`Starting DWG parse for: ${fileName}`);
      const { urn } = await this.uploadDwgFile(fileBuffer, fileName);

      // 2. 변환 시작
      await this.startTranslation(urn);

      // 3. 변환 완료 대기
      await this.waitForTranslation(urn, 300);

      // 4. 메타데이터 가져오기
      const metadata = await this.getModelMetadata(urn);
      const modelGuid = metadata.data?.metadata?.[0]?.guid;

      if (!modelGuid) {
        throw new Error('Model GUID not found in metadata');
      }

      // 5. 오브젝트 트리 및 속성 가져오기
      const [objectTree, properties] = await Promise.all([
        this.getObjectTree(urn, modelGuid),
        this.getProperties(urn, modelGuid),
      ]);

      // 6. 데이터 파싱 및 구조화
      const parsedResult = this.parseObjectData(
        fileName,
        urn,
        objectTree,
        properties,
      );

      // 7. 썸네일 URL 추가
      const thumbnailUrl = await this.getThumbnailUrl(urn);
      if (thumbnailUrl) {
        parsedResult.thumbnailUrl = thumbnailUrl;
      }

      this.logger.log(`DWG parse completed: ${parsedResult.elements.length} elements found`);
      return parsedResult;
    } catch (error: any) {
      this.logger.error('Failed to parse DWG file:', error);
      throw new InternalServerErrorException(`Failed to parse DWG file: ${error.message}`);
    }
  }

  /**
   * 오브젝트 데이터를 구조화된 형태로 파싱
   * 실제 DWG 레이어 구조에 맞게 개선됨
   */
  private parseObjectData(
    fileName: string,
    urn: string,
    objectTree: any,
    properties: any,
  ): DwgParseResult {
    const elements: DwgElement[] = [];
    const walls: DwgElement[] = [];
    const doors: DwgElement[] = [];
    const windows: DwgElement[] = [];
    const bathroom: DwgElement[] = [];
    const kitchen: DwgElement[] = [];
    const fixtures: DwgElement[] = [];
    const furniture: DwgElement[] = [];
    const rooms: DwgParseResult['rooms'] = [];

    // 실제 DWG 레이어 기반 분류 매핑 (화성시 아파트 도면 기준)
    // 주의: 정확한 매칭을 위해 exactMatch와 partialMatch 구분
    const exactLayerMapping: Record<string, DwgElement['type']> = {
      // 문 관련
      'DOOR': 'door',
      'I-DOOR': 'door',
      'A-DOOR': 'door',
      // 벽 관련
      'WAL1': 'wall',
      'WALL': 'wall',
      'A-WALL': 'wall',
      'I-WALL': 'wall',
      '2SEC': 'wall',
      '3SEC': 'wall',
      // 기둥
      'COL': 'column',
      'A-COLUMN': 'column',
      // 화장실 관련
      'TOI': 'bathroom',
      'TOILET': 'bathroom',
      'BATH': 'bathroom',
      // 주방 관련 (주방가구만 정확히 매칭)
      'I-FUR(주방가구)': 'kitchen',
      'KIT': 'kitchen',
      'KITCHEN': 'kitchen',
      // 가구 (I-FUR은 가구로 분류, 주방가구 아님)
      'I-FUR': 'furniture',
      '6FUR': 'furniture',
      'FURN': 'furniture',
      'FURNITURE': 'furniture',
      // 조명/전기
      'LIGHT': 'fixture',
      'I-LIGHT': 'fixture',
      'ELEC': 'fixture',
      'ELECTRICAL': 'fixture',
      '4ELE': 'fixture',
      // 창문
      'WIN': 'window',
      'WINDOW': 'window',
      'A-WINDOW': 'window',
      // 타일 (욕실/주방)
      'TILE': 'bathroom',
    };

    // 부분 매칭 (정확한 매칭 실패 시에만 사용)
    const partialLayerMapping: Record<string, DwgElement['type']> = {
      'DOOR': 'door',
      'WALL': 'wall',
      'TOI': 'bathroom',
      'BATH': 'bathroom',
      'WIN': 'window',
    };

    // 이름 기반 키워드 매핑 (블록 이름용)
    const nameKeywords: Record<DwgElement['type'], string[]> = {
      wall: ['wall', '벽'],
      door: ['door', '문'],
      window: ['window', '창'],
      column: ['column', '기둥', 'pillar'],
      room: ['room', '방', '거실', '침실', '안방'],
      bathroom: ['세면기', '양변기', '변기', '욕조', '샤워', '세면대', 'toilet', 'wash', 'bath'],
      kitchen: ['싱크', '가스레인지', '냉장고', 'sink', 'range'],
      fixture: ['조명', 'light', '콘센트', '스위치'],
      furniture: ['가구', 'sofa', '소파', 'table', '테이블', 'bed', '침대'],
      other: [],
    };

    // 속성 데이터를 ID로 인덱싱
    const propertiesById: Record<number, any> = {};
    if (properties.data?.collection) {
      for (const item of properties.data.collection) {
        propertiesById[item.objectid] = item;
      }
    }

    this.logger.log(`Properties indexed: ${Object.keys(propertiesById).length} items`);

    /**
     * 중첩된 속성 객체에서 값 추출 (APS 속성 구조에 맞게)
     * properties: { General: { Layer: "DOOR" }, Geometry: { "Start Point X": "100" } }
     */
    const extractProperty = (props: any, ...keys: string[]): string => {
      if (!props?.properties) return '';

      // 각 카테고리를 순회하며 키 찾기
      for (const category of Object.values(props.properties)) {
        if (typeof category === 'object' && category !== null) {
          for (const key of keys) {
            if ((category as any)[key] !== undefined) {
              return String((category as any)[key]);
            }
          }
        }
      }
      return '';
    };

    /**
     * 좌표 추출 (Line, Polyline, Block Reference 등)
     */
    const extractCoordinates = (props: any): DwgElement['coordinates'] => {
      const coords: DwgElement['coordinates'] = { x: 0, y: 0 };

      if (!props?.properties) return coords;

      // Geometry 카테고리에서 좌표 추출
      const geometry = props.properties['Geometry'] || props.properties['Geometry '] || {};

      // Start Point (Line의 시작점)
      const startX = geometry['Start Point X'] || geometry['Position X'];
      const startY = geometry['Start Point Y'] || geometry['Position Y'];

      if (startX) coords.x = parseFloat(startX) || 0;
      if (startY) coords.y = parseFloat(startY) || 0;

      // End Point로 크기 계산 (Line의 경우)
      const endX = geometry['End Point X'];
      const endY = geometry['End Point Y'];

      if (endX && endY) {
        const ex = parseFloat(endX) || 0;
        const ey = parseFloat(endY) || 0;
        coords.width = Math.abs(ex - coords.x);
        coords.height = Math.abs(ey - coords.y);
      }

      // 직접적인 Width/Height (Block Reference 등)
      const width = geometry['Width'] || geometry['Length'];
      const height = geometry['Height'];
      if (width) coords.width = parseFloat(width) || coords.width;
      if (height) coords.height = parseFloat(height) || coords.height;

      // Scale 정보 (Block Reference)
      const scaleX = geometry['Scale X'];
      const scaleY = geometry['Scale Y'];
      if (scaleX && coords.width) coords.width *= Math.abs(parseFloat(scaleX) || 1);
      if (scaleY && coords.height) coords.height *= Math.abs(parseFloat(scaleY) || 1);

      return coords;
    };

    /**
     * 요소 타입 판별
     */
    const determineType = (name: string, layer: string): DwgElement['type'] => {
      const nameLower = name.toLowerCase();
      const layerUpper = layer.toUpperCase();

      // 1. 정확한 레이어 매칭 (우선순위 가장 높음)
      for (const [layerKey, type] of Object.entries(exactLayerMapping)) {
        if (layerUpper === layerKey.toUpperCase()) {
          return type;
        }
      }

      // 2. 부분 레이어 매칭 (정확한 매칭 실패 시)
      for (const [layerKey, type] of Object.entries(partialLayerMapping)) {
        if (layerUpper.includes(layerKey.toUpperCase())) {
          return type;
        }
      }

      // 3. 이름 기반 키워드 매칭 (블록 이름)
      for (const [type, keywords] of Object.entries(nameKeywords)) {
        if (type === 'other') continue;
        for (const keyword of keywords) {
          if (nameLower.includes(keyword.toLowerCase()) || name.includes(keyword)) {
            return type as DwgElement['type'];
          }
        }
      }

      return 'other';
    };

    // 전체 좌표 범위 추적 (정규화용)
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    // 오브젝트 트리 순회
    const traverseTree = (node: any, _parentName: string = '') => {
      if (!node) return;

      const objectId = node.objectid;
      const name = node.name || '';
      const props = propertiesById[objectId];

      // 레이어 정보 추출 (중첩 구조에서)
      const layer = extractProperty(props, 'Layer');

      // 요소 타입 추출 (Line, Polyline, Block Reference 등)
      const elementName = extractProperty(props, 'Name ', 'Name');

      // 좌표 정보 추출
      const coordinates = extractCoordinates(props);

      // 좌표 범위 업데이트
      if (coordinates.x !== 0 || coordinates.y !== 0) {
        minX = Math.min(minX, coordinates.x);
        minY = Math.min(minY, coordinates.y);
        maxX = Math.max(maxX, coordinates.x + (coordinates.width || 0));
        maxY = Math.max(maxY, coordinates.y + (coordinates.height || 0));
      }

      // 요소 타입 판별
      const type = determineType(name, layer);

      // 의미있는 요소만 저장 (other 제외 또는 좌표가 있는 경우)
      if (type !== 'other' || (coordinates.x !== 0 || coordinates.y !== 0)) {
        const element: DwgElement = {
          id: `dwg_${objectId}`,
          type,
          name: name || elementName,
          layer,
          coordinates,
          properties: props?.properties || {},
        };

        elements.push(element);

        // 타입별 분류
        switch (type) {
          case 'wall':
          case 'column':
            walls.push(element);
            break;
          case 'door':
            doors.push(element);
            break;
          case 'window':
            windows.push(element);
            break;
          case 'bathroom':
            bathroom.push(element);
            break;
          case 'kitchen':
            kitchen.push(element);
            break;
          case 'fixture':
            fixtures.push(element);
            break;
          case 'furniture':
            furniture.push(element);
            break;
          case 'room':
            const area = parseFloat(extractProperty(props, 'Area')) || 0;
            rooms.push({
              name,
              area,
              coordinates: {
                x: coordinates.x,
                y: coordinates.y,
                width: coordinates.width || 0,
                height: coordinates.height || 0,
              },
            });
            break;
        }
      }

      // 자식 노드 순회
      if (node.objects) {
        for (const child of node.objects) {
          traverseTree(child, name);
        }
      }
    };

    // 트리 순회 시작
    if (objectTree.data?.objects) {
      for (const root of objectTree.data.objects) {
        traverseTree(root);
      }
    }

    // 분류된 요소 수 계산
    const classifiedCount = elements.filter(e => e.type !== 'other').length;

    // 시맨틱 설명 생성
    const uniqueLayers = [...new Set(elements.map(e => e.layer).filter(l => l))];
    const uniqueBlockNames = [...new Set(elements.map(e => e.name).filter(n => n && !n.includes('[')))];

    // 요소 수 집계
    const elementCounts: Record<string, number> = {
      walls: walls.length,
      doors: doors.length,
      windows: windows.length,
      bathroom: bathroom.length,
      kitchen: kitchen.length,
      fixtures: fixtures.length,
      furniture: furniture.length,
    };

    // 추정 방 목록 (블록 이름에서 추론)
    const estimatedRooms: string[] = [];
    const bathroomCount = bathroom.filter(e =>
      e.name.includes('변기') || e.name.includes('양변기') || e.name.includes('세면')
    ).length;
    const hasKitchen = kitchen.length > 0;

    if (bathroomCount > 0) {
      // 화장실 수 추정 (변기 개수 기준)
      const toiletCount = bathroom.filter(e => e.name.includes('변기') || e.name.includes('양변기')).length;
      if (toiletCount >= 2) {
        estimatedRooms.push('화장실 (2개)');
      } else if (toiletCount > 0) {
        estimatedRooms.push('화장실');
      }
    }
    if (hasKitchen) estimatedRooms.push('주방');
    if (doors.length > 2) estimatedRooms.push(`방 (${Math.max(1, doors.length - 2)}개 추정)`);

    // 요약 문장 생성
    const summaryParts: string[] = [];
    summaryParts.push(`총 ${elements.length}개 요소 감지`);
    if (walls.length > 0) summaryParts.push(`벽체 ${walls.length}개`);
    if (doors.length > 0) summaryParts.push(`문 ${doors.length}개`);
    if (bathroom.length > 0) summaryParts.push(`욕실 설비 ${bathroom.length}개`);
    if (kitchen.length > 0) summaryParts.push(`주방 설비 ${kitchen.length}개`);
    if (furniture.length > 0) summaryParts.push(`가구 ${furniture.length}개`);

    const semanticDescription = {
      summary: summaryParts.join(', '),
      elementCounts,
      layers: uniqueLayers.slice(0, 20), // 최대 20개 레이어
      blockNames: uniqueBlockNames.slice(0, 30), // 최대 30개 블록명
      estimatedRooms,
    };

    // 중복 제거 유틸리티 함수: Block Reference만 필터링하고 중복 제거
    const deduplicateElements = (elements: DwgElement[]): DwgElement[] => {
      const seen = new Set<string>();

      // 기하 도형 타입 (템플릿에서 제외) - AutoCAD 요소 타입명
      const primitiveTypes = ['Line', 'Circle', 'Arc', 'Polyline', 'Ellipse', 'Spline', 'Point', 'Hatch', 'Solid', 'Text', 'MText', '3D Face', '3D Solid', 'Region', 'Mesh'];

      // 의미없는 블록명 패턴 (AutoCAD 내부 생성 블록)
      const meaninglessPattern = /^A\$C[A-F0-9]+$/i;

      return elements.filter(el => {
        // 이름에서 핸들 제거 (예: "84a 양변기 [105E79]" → "84a 양변기")
        const baseName = el.name.replace(/ \[[A-Fa-f0-9]+\]$/, '');

        // AutoCAD 요소 타입 확인 (properties.General["Name "])
        const elementType = el.properties?.['General']?.['Name '] || el.properties?.['General']?.['Name'] || '';

        // 1. 기하 도형 제외 (Block Reference가 아닌 요소)
        // 요소 타입으로 필터링 (더 정확함)
        if (primitiveTypes.some(p => elementType === p)) {
          return false;
        }

        // 이름 기반 백업 필터 (요소 이름이 기하 도형으로 시작하는 경우)
        if (primitiveTypes.some(p => baseName.startsWith(p))) {
          return false;
        }

        // 2. AutoCAD 내부 생성 블록 제외 (A$C...)
        if (meaninglessPattern.test(baseName)) {
          return false;
        }

        // 3. 중복 제거
        if (seen.has(baseName)) return false;
        seen.add(baseName);
        return true;
      });
    };

    // 평형별 템플릿 요소 생성 (중복 제거)
    const templateWalls = deduplicateElements(walls);
    const templateDoors = deduplicateElements(doors);
    const templateWindows = deduplicateElements(windows);
    const templateBathroom = deduplicateElements(bathroom);
    const templateKitchen = deduplicateElements(kitchen);
    const templateFixtures = deduplicateElements(fixtures);
    const templateFurniture = deduplicateElements(furniture);

    const templateElements = {
      walls: templateWalls,
      doors: templateDoors,
      windows: templateWindows,
      bathroom: templateBathroom,
      kitchen: templateKitchen,
      fixtures: templateFixtures,
      furniture: templateFurniture,
      uniqueCounts: {
        walls: templateWalls.length,
        doors: templateDoors.length,
        windows: templateWindows.length,
        bathroom: templateBathroom.length,
        kitchen: templateKitchen.length,
        fixtures: templateFixtures.length,
        furniture: templateFurniture.length,
        total: templateWalls.length + templateDoors.length + templateWindows.length +
               templateBathroom.length + templateKitchen.length + templateFixtures.length + templateFurniture.length,
      },
    };

    this.logger.log(`Parsed ${elements.length} elements, ${classifiedCount} classified`);
    this.logger.log(`  - Template elements (deduplicated): ${templateElements.uniqueCounts.total}`);
    this.logger.log(`  - Walls: ${walls.length}, Doors: ${doors.length}, Windows: ${windows.length}`);
    this.logger.log(`  - Bathroom: ${bathroom.length}, Kitchen: ${kitchen.length}`);
    this.logger.log(`  - Fixtures: ${fixtures.length}, Furniture: ${furniture.length}`);
    this.logger.log(`  - Coordinate range: X(${minX.toFixed(0)}~${maxX.toFixed(0)}), Y(${minY.toFixed(0)}~${maxY.toFixed(0)})`);
    this.logger.log(`  - Semantic: ${semanticDescription.summary}`);

    return {
      success: true,
      fileName,
      urn,
      elements,
      rooms,
      walls,
      doors,
      windows,
      bathroom,
      kitchen,
      fixtures,
      furniture,
      rawObjectTree: objectTree,
      rawProperties: properties,
      metadata: {
        units: 'mm',
        totalArea: rooms.reduce((sum, r) => sum + r.area, 0),
        scale: maxX > 0 ? 1000 / maxX : 1, // 정규화 스케일
        totalElements: elements.length,
        classifiedElements: classifiedCount,
      },
      semanticDescription,
      templateElements,
    };
  }

  /**
   * URN에서 썸네일 URL 추출
   */
  async getThumbnailUrl(urn: string): Promise<string | null> {
    const token = await this.getAccessToken();

    try {
      const manifest = await this.modelDerivativeClient.getManifest(urn, { accessToken: token });

      // Find 2D view thumbnail (usually the best floor plan representation)
      if (manifest.derivatives) {
        for (const derivative of manifest.derivatives as any[]) {
          if (derivative.children) {
            for (const child of derivative.children) {
              // Prefer 2D view thumbnails
              if (child.type === 'geometry' && child.role === '2d' && child.children) {
                for (const thumb of child.children) {
                  if (thumb.role === 'thumbnail' && thumb.resolution) {
                    const [width] = thumb.resolution;
                    if (width >= 400) { // Get highest resolution
                      // Construct the thumbnail URL
                      return `https://developer.api.autodesk.com/modelderivative/v2/designdata/${encodeURIComponent(urn)}/thumbnail?width=400&height=400`;
                    }
                  }
                }
              }
            }
          }
        }
      }

      // Fallback to general thumbnail endpoint
      return `https://developer.api.autodesk.com/modelderivative/v2/designdata/${encodeURIComponent(urn)}/thumbnail?width=400&height=400`;
    } catch (error: any) {
      this.logger.warn('Failed to get thumbnail URL:', error.message);
      return null;
    }
  }

  /**
   * Manifest에서 bounding box 및 geometry 정보 추출
   */
  async getManifestWithGeometry(urn: string): Promise<any> {
    const token = await this.getAccessToken();
    const fetch = (await import('node-fetch')).default;

    try {
      // Get manifest
      const manifestResponse = await fetch(
        `https://developer.api.autodesk.com/modelderivative/v2/designdata/${encodeURIComponent(urn)}/manifest`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (!manifestResponse.ok) {
        throw new Error(`Failed to get manifest: ${manifestResponse.status}`);
      }

      const manifest = await manifestResponse.json() as any;
      this.logger.log(`Manifest status: ${manifest.status}`);

      return manifest;
    } catch (error: any) {
      this.logger.error('Failed to get manifest:', error);
      throw error;
    }
  }

  /**
   * REST API로 직접 Specific Properties 조회 (위치 정보 포함 시도)
   */
  async fetchPropertiesWithQuery(urn: string, modelGuid: string, objectIds: number[]): Promise<any> {
    const token = await this.getAccessToken();
    const fetch = (await import('node-fetch')).default;

    try {
      const response = await fetch(
        `https://developer.api.autodesk.com/modelderivative/v2/designdata/${encodeURIComponent(urn)}/metadata/${modelGuid}/properties:query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: {
              $in: ['objectid', objectIds.slice(0, 50)] // Limit to 50 objects
            },
            fields: ['objectid', 'name', 'externalId', 'properties'],
            pagination: {
              offset: 0,
              limit: 100,
            }
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.warn(`Properties query failed: ${response.status} - ${errorText}`);
        return null;
      }

      return await response.json();
    } catch (error: any) {
      this.logger.error('Failed to fetch properties with query:', error);
      return null;
    }
  }

  /**
   * APS properties:query 엔드포인트를 사용해서 bounds(bounding box) 가져오기
   * 이 엔드포인트는 객체별 geometry bounds를 반환할 수 있음
   */
  async fetchPropertiesWithBounds(urn: string, modelGuid: string, limit: number = 100, offset: number = 0): Promise<any> {
    const token = await this.getAccessToken();
    const fetch = (await import('node-fetch')).default;

    try {
      const url = `https://developer.api.autodesk.com/modelderivative/v2/designdata/${encodeURIComponent(urn)}/metadata/${modelGuid}/properties:query`;
      this.logger.log(`Fetching properties with bounds from: ${url}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: ['objectid', 'name', 'externalId', 'properties'],
          pagination: {
            offset,
            limit,
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.warn(`Properties:query failed: ${response.status} - ${errorText}`);
        return { error: response.status, message: errorText };
      }

      const data = await response.json() as any;
      this.logger.log(`Got ${data.data?.collection?.length || 0} properties with bounds`);
      return data;
    } catch (error: any) {
      this.logger.error('Failed to fetch properties with bounds:', error);
      return { error: error.message };
    }
  }

  /**
   * 2D 뷰어블의 Object Bounds (bounding box) 가져오기
   * F2D derivative에서 각 요소의 위치 정보 추출
   */
  async getObjectBounds(urn: string, modelGuid: string): Promise<Map<number, { minX: number; minY: number; maxX: number; maxY: number }>> {
    const token = await this.getAccessToken();
    const fetch = (await import('node-fetch')).default;
    const boundsMap = new Map<number, { minX: number; minY: number; maxX: number; maxY: number }>();

    try {
      // Try the properties endpoint with specific fields
      // Some APS versions support 'bounds' field
      const response = await fetch(
        `https://developer.api.autodesk.com/modelderivative/v2/designdata/${encodeURIComponent(urn)}/metadata/${modelGuid}/properties?forceget=true`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        this.logger.warn(`Failed to fetch properties with bounds: ${response.status}`);
        return boundsMap;
      }

      const data = await response.json() as any;

      // Check if the response contains any bounds/transform info
      if (data.data?.collection) {
        for (const item of data.data.collection) {
          // Check for bounding box in various formats
          const bbox = item.bounds || item.bbox || item.boundingBox;
          if (bbox) {
            boundsMap.set(item.objectid, {
              minX: bbox[0] || bbox.min?.x || 0,
              minY: bbox[1] || bbox.min?.y || 0,
              maxX: bbox[3] || bbox.max?.x || 0,
              maxY: bbox[4] || bbox.max?.y || 0,
            });
          }

          // Also check properties for Insertion Point (Block Reference specific)
          if (item.properties) {
            const geometry = item.properties['Geometry'] || item.properties['Geometry '] || {};
            const insertX = geometry['Insertion Point X'] || geometry['Position X'] || geometry['Insert X'];
            const insertY = geometry['Insertion Point Y'] || geometry['Position Y'] || geometry['Insert Y'];

            if (insertX !== undefined && insertY !== undefined) {
              const x = parseFloat(String(insertX)) || 0;
              const y = parseFloat(String(insertY)) || 0;
              boundsMap.set(item.objectid, {
                minX: x,
                minY: y,
                maxX: x,
                maxY: y,
              });
            }
          }
        }
      }

      this.logger.log(`Found bounds for ${boundsMap.size} objects`);
      return boundsMap;
    } catch (error: any) {
      this.logger.error('Failed to get object bounds:', error);
      return boundsMap;
    }
  }

  /**
   * 특정 오브젝트 ID들의 상세 속성 조회 (디버깅용)
   * Block Reference의 Insertion Point 등 확인
   */
  async debugObjectProperties(urn: string, modelGuid: string, objectIds: number[]): Promise<any[]> {
    const results: any[] = [];

    try {
      // Fetch all properties first
      const allProps = await this.getProperties(urn, modelGuid);

      // Find properties for specific object IDs
      if (allProps.data?.collection) {
        for (const item of allProps.data.collection) {
          if (objectIds.includes(item.objectid)) {
            results.push({
              objectid: item.objectid,
              name: item.name,
              externalId: item.externalId,
              properties: item.properties,
            });
          }
        }
      }

      return results;
    } catch (error: any) {
      this.logger.error('Failed to get debug properties:', error);
      return [];
    }
  }

  /**
   * 기존 URN을 다시 파싱 (업로드/변환 없이)
   * 파싱 로직 테스트용
   */
  async reparseExistingUrn(urn: string): Promise<DwgParseResult> {
    try {
      this.logger.log(`Reparsing existing URN: ${urn.substring(0, 30)}...`);

      // 1. 메타데이터에서 GUID 가져오기
      const metadata = await this.getModelMetadata(urn);
      const modelGuid = metadata.data?.metadata?.[0]?.guid;

      if (!modelGuid) {
        throw new Error('Model GUID not found in metadata');
      }

      this.logger.log(`Found model GUID: ${modelGuid}`);

      // 2. 오브젝트 트리 및 속성 가져오기
      const [objectTree, properties] = await Promise.all([
        this.getObjectTree(urn, modelGuid),
        this.getProperties(urn, modelGuid),
      ]);

      // 3. 데이터 파싱 및 구조화
      const parsedResult = this.parseObjectData(
        'reparsed_file.dwg',
        urn,
        objectTree,
        properties,
      );

      // 4. 썸네일 URL 추가
      const thumbnailUrl = await this.getThumbnailUrl(urn);
      if (thumbnailUrl) {
        parsedResult.thumbnailUrl = thumbnailUrl;
      }

      this.logger.log(`Reparse completed: ${parsedResult.elements.length} elements found`);
      return parsedResult;
    } catch (error: any) {
      this.logger.error('Failed to reparse URN:', error);
      throw new InternalServerErrorException(`Failed to reparse URN: ${error.message}`);
    }
  }
}

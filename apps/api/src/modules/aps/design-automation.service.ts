/**
 * Design Automation Service for AutoCAD
 *
 * Handles AppBundle, Activity, and WorkItem management
 * for extracting Block Reference coordinates from DWG files
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';

// ============== 타입 정의 ==============

export interface AppBundleInfo {
  id: string;
  engine: string;
  description: string;
  version: number;
  package?: string;
}

export interface ActivityInfo {
  id: string;
  commandLine: string[];
  parameters: Record<string, ActivityParameter>;
  engine: string;
  appbundles: string[];
  description: string;
  version: number;
}

export interface ActivityParameter {
  verb: 'get' | 'put' | 'read' | 'post';
  description: string;
  localName?: string;
  required?: boolean;
  zip?: boolean;
}

export interface WorkItemStatus {
  id: string;
  status: 'pending' | 'inprogress' | 'success' | 'failed' | 'cancelled';
  progress?: string;
  reportUrl?: string;
  stats?: {
    timeQueued?: string;
    timeDownloadStarted?: string;
    timeInstructionsStarted?: string;
    timeInstructionsEnded?: string;
    timeUploadEnded?: string;
  };
}

export interface ExtractedBlockReference {
  handle: string;
  effectiveName: string;
  positionX: number;
  positionY: number;
  positionZ: number;
  layer: string;
  rotation: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
}

export interface ExtractionResult {
  success: boolean;
  fileName?: string;
  totalBlockReferences?: number;
  units?: string;
  blockReferences?: ExtractedBlockReference[];
  layerCounts?: Record<string, number>;
  errorMessage?: string;
}

// ============== 상수 ==============

const DA_BASE_URL = 'https://developer.api.autodesk.com/da/us-east/v3';
const NICKNAME = 'interior-app'; // 또는 실제 APS app nickname
const APPBUNDLE_NAME = 'ExtractCoords';
const ACTIVITY_NAME = 'ExtractCoordsActivity';
const ENGINE = 'Autodesk.AutoCAD+24_1'; // AutoCAD 2024

@Injectable()
export class DesignAutomationService {
  private readonly logger = new Logger(DesignAutomationService.name);
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(private readonly configService: ConfigService) {}

  // ============== 인증 ==============

  /**
   * APS access token 획득 (Design Automation scope 포함)
   */
  private async getAccessToken(): Promise<string> {
    const now = Date.now();

    // Token이 아직 유효하면 재사용
    if (this.accessToken && this.tokenExpiry > now + 60000) {
      return this.accessToken;
    }

    const clientId = this.configService.get<string>('APS_CLIENT_ID');
    const clientSecret = this.configService.get<string>('APS_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('APS_CLIENT_ID and APS_CLIENT_SECRET must be configured');
    }

    const response = await axios.post(
      'https://developer.api.autodesk.com/authentication/v2/token',
      new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
        scope: 'code:all data:write data:read bucket:create bucket:delete',
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    this.accessToken = response.data.access_token;
    this.tokenExpiry = now + response.data.expires_in * 1000;

    return this.accessToken!;
  }

  /**
   * Authorization header가 포함된 axios 인스턴스 생성
   */
  private async getAuthorizedClient(): Promise<AxiosInstance> {
    const token = await this.getAccessToken();
    return axios.create({
      baseURL: DA_BASE_URL,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  // ============== AppBundle 관리 ==============

  /**
   * AppBundle 생성 또는 버전 업데이트
   */
  async createOrUpdateAppBundle(zipBuffer: Buffer): Promise<AppBundleInfo> {
    const client = await this.getAuthorizedClient();
    const fullId = `${NICKNAME}.${APPBUNDLE_NAME}+prod`;

    try {
      // 기존 AppBundle 확인
      const existingBundle = await this.getAppBundle();

      if (existingBundle) {
        // 새 버전 생성
        this.logger.log(`Updating existing AppBundle: ${fullId}`);
        return await this.createAppBundleVersion(zipBuffer);
      }
    } catch (error) {
      // AppBundle이 없으면 새로 생성
    }

    // AppBundle 생성
    this.logger.log(`Creating new AppBundle: ${APPBUNDLE_NAME}`);

    const createResponse = await client.post('/appbundles', {
      id: APPBUNDLE_NAME,
      engine: ENGINE,
      description: 'Extracts Block Reference coordinates from DWG files',
    });

    // alias 생성
    await client.post(`/appbundles/${APPBUNDLE_NAME}/aliases`, {
      id: 'prod',
      version: 1,
    });

    // ZIP 파일 업로드
    const uploadUrl = createResponse.data.uploadParameters?.endpointURL;
    const formData = createResponse.data.uploadParameters?.formData;

    if (uploadUrl && formData) {
      await this.uploadAppBundleZip(uploadUrl, formData, zipBuffer);
    }

    return createResponse.data;
  }

  /**
   * AppBundle 새 버전 생성
   */
  private async createAppBundleVersion(zipBuffer: Buffer): Promise<AppBundleInfo> {
    const client = await this.getAuthorizedClient();

    const versionResponse = await client.post(`/appbundles/${APPBUNDLE_NAME}/versions`, {
      engine: ENGINE,
      description: 'Extracts Block Reference coordinates from DWG files',
    });

    // alias 업데이트
    await client.patch(`/appbundles/${APPBUNDLE_NAME}/aliases/prod`, {
      version: versionResponse.data.version,
    });

    // ZIP 파일 업로드
    const uploadUrl = versionResponse.data.uploadParameters?.endpointURL;
    const formData = versionResponse.data.uploadParameters?.formData;

    if (uploadUrl && formData) {
      await this.uploadAppBundleZip(uploadUrl, formData, zipBuffer);
    }

    return versionResponse.data;
  }

  /**
   * AppBundle ZIP 파일 업로드 (S3 presigned URL)
   */
  private async uploadAppBundleZip(
    uploadUrl: string,
    formData: Record<string, string>,
    zipBuffer: Buffer,
  ): Promise<void> {
    const form = new FormData();

    // S3 form fields 추가
    for (const [key, value] of Object.entries(formData)) {
      form.append(key, value);
    }

    // ZIP 파일 추가
    form.append('file', zipBuffer, {
      filename: 'ExtractCoords.bundle.zip',
      contentType: 'application/zip',
    });

    await axios.post(uploadUrl, form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    this.logger.log('AppBundle ZIP uploaded successfully');
  }

  /**
   * AppBundle 조회
   */
  async getAppBundle(): Promise<AppBundleInfo | null> {
    const client = await this.getAuthorizedClient();
    const fullId = `${NICKNAME}.${APPBUNDLE_NAME}+prod`;

    try {
      const response = await client.get(`/appbundles/${fullId}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * 모든 AppBundle 목록 조회
   */
  async listAppBundles(): Promise<string[]> {
    const client = await this.getAuthorizedClient();
    const response = await client.get('/appbundles');
    return response.data.data || [];
  }

  /**
   * AppBundle 삭제
   */
  async deleteAppBundle(): Promise<void> {
    const client = await this.getAuthorizedClient();
    await client.delete(`/appbundles/${APPBUNDLE_NAME}`);
    this.logger.log(`AppBundle ${APPBUNDLE_NAME} deleted`);
  }

  // ============== Activity 관리 ==============

  /**
   * Activity 생성 또는 업데이트
   */
  async createOrUpdateActivity(): Promise<ActivityInfo> {
    const client = await this.getAuthorizedClient();
    const fullId = `${NICKNAME}.${ACTIVITY_NAME}+prod`;

    try {
      // 기존 Activity 확인
      const existingActivity = await this.getActivity();

      if (existingActivity) {
        // 새 버전 생성
        this.logger.log(`Updating existing Activity: ${fullId}`);
        return await this.createActivityVersion();
      }
    } catch (error) {
      // Activity가 없으면 새로 생성
    }

    // Activity 생성
    this.logger.log(`Creating new Activity: ${ACTIVITY_NAME}`);

    const activityDef = {
      id: ACTIVITY_NAME,
      commandLine: [
        '$(engine.path)\\accoreconsole.exe /i "$(args[inputFile].path)" /s "$(settings[script].path)"',
      ],
      parameters: {
        inputFile: {
          verb: 'get',
          description: 'Input DWG file',
          localName: 'input.dwg',
          required: true,
        },
        outputJson: {
          verb: 'put',
          description: 'Output JSON file with Block Reference coordinates',
          localName: 'result.json',
          required: true,
        },
      },
      settings: {
        script: {
          value: 'EXTRACT_COORDS\n',
        },
      },
      engine: ENGINE,
      appbundles: [`${NICKNAME}.${APPBUNDLE_NAME}+prod`],
      description: 'Extracts Block Reference coordinates from DWG files',
    };

    const response = await client.post('/activities', activityDef);

    // alias 생성
    await client.post(`/activities/${ACTIVITY_NAME}/aliases`, {
      id: 'prod',
      version: 1,
    });

    return response.data;
  }

  /**
   * Activity 새 버전 생성
   */
  private async createActivityVersion(): Promise<ActivityInfo> {
    const client = await this.getAuthorizedClient();

    const activityDef = {
      commandLine: [
        '$(engine.path)\\accoreconsole.exe /i "$(args[inputFile].path)" /s "$(settings[script].path)"',
      ],
      parameters: {
        inputFile: {
          verb: 'get',
          description: 'Input DWG file',
          localName: 'input.dwg',
          required: true,
        },
        outputJson: {
          verb: 'put',
          description: 'Output JSON file with Block Reference coordinates',
          localName: 'result.json',
          required: true,
        },
      },
      settings: {
        script: {
          value: 'EXTRACT_COORDS\n',
        },
      },
      engine: ENGINE,
      appbundles: [`${NICKNAME}.${APPBUNDLE_NAME}+prod`],
      description: 'Extracts Block Reference coordinates from DWG files',
    };

    const versionResponse = await client.post(
      `/activities/${ACTIVITY_NAME}/versions`,
      activityDef,
    );

    // alias 업데이트
    await client.patch(`/activities/${ACTIVITY_NAME}/aliases/prod`, {
      version: versionResponse.data.version,
    });

    return versionResponse.data;
  }

  /**
   * Activity 조회
   */
  async getActivity(): Promise<ActivityInfo | null> {
    const client = await this.getAuthorizedClient();
    const fullId = `${NICKNAME}.${ACTIVITY_NAME}+prod`;

    try {
      const response = await client.get(`/activities/${fullId}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Activity 삭제
   */
  async deleteActivity(): Promise<void> {
    const client = await this.getAuthorizedClient();
    await client.delete(`/activities/${ACTIVITY_NAME}`);
    this.logger.log(`Activity ${ACTIVITY_NAME} deleted`);
  }

  // ============== WorkItem 실행 ==============

  /**
   * WorkItem 생성 및 실행
   * @param inputFileUrl DWG 파일의 signed URL (OSS bucket)
   * @param outputFileUrl 결과 JSON을 저장할 signed URL
   */
  async submitWorkItem(
    inputFileUrl: string,
    outputFileUrl: string,
  ): Promise<WorkItemStatus> {
    const client = await this.getAuthorizedClient();
    const activityId = `${NICKNAME}.${ACTIVITY_NAME}+prod`;

    const workItemDef = {
      activityId,
      arguments: {
        inputFile: {
          url: inputFileUrl,
          verb: 'get',
        },
        outputJson: {
          url: outputFileUrl,
          verb: 'put',
        },
      },
    };

    const response = await client.post('/workitems', workItemDef);

    this.logger.log(`WorkItem submitted: ${response.data.id}`);
    return response.data;
  }

  /**
   * WorkItem 상태 조회
   */
  async getWorkItemStatus(workItemId: string): Promise<WorkItemStatus> {
    const client = await this.getAuthorizedClient();
    const response = await client.get(`/workitems/${workItemId}`);
    return response.data;
  }

  /**
   * WorkItem 완료 대기 (polling)
   */
  async waitForWorkItem(
    workItemId: string,
    timeoutMs: number = 120000,
    pollIntervalMs: number = 3000,
  ): Promise<WorkItemStatus> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const status = await this.getWorkItemStatus(workItemId);

      if (status.status === 'success' || status.status === 'failed' || status.status === 'cancelled') {
        return status;
      }

      this.logger.log(`WorkItem ${workItemId} status: ${status.status}`);
      await this.sleep(pollIntervalMs);
    }

    throw new Error(`WorkItem ${workItemId} timed out after ${timeoutMs}ms`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============== 고수준 API ==============

  /**
   * DWG 파일에서 Block Reference 좌표 추출 (전체 프로세스)
   * @param dwgUrn OSS에 저장된 DWG 파일의 URN
   */
  async extractBlockCoordinates(dwgUrn: string): Promise<ExtractionResult> {
    const bucketKey = this.configService.get<string>('APS_BUCKET_KEY') || 'interior-app-dwg-bucket';

    // 1. DWG 파일의 signed URL 생성
    const inputSignedUrl = await this.getSignedUrl(dwgUrn, 'read');

    // 2. 결과 JSON을 저장할 임시 object key 생성
    const outputKey = `da-output/${Date.now()}_result.json`;
    const outputSignedUrl = await this.createSignedUrlForUpload(bucketKey, outputKey);

    // 3. WorkItem 실행
    const workItem = await this.submitWorkItem(inputSignedUrl, outputSignedUrl);

    // 4. WorkItem 완료 대기
    const finalStatus = await this.waitForWorkItem(workItem.id);

    if (finalStatus.status !== 'success') {
      return {
        success: false,
        errorMessage: `WorkItem failed: ${finalStatus.status}`,
      };
    }

    // 5. 결과 JSON 다운로드
    const resultUrl = await this.getSignedUrl(outputKey, 'read', bucketKey);
    const resultResponse = await axios.get(resultUrl);

    return resultResponse.data as ExtractionResult;
  }

  /**
   * OSS object의 signed URL 생성
   */
  private async getSignedUrl(
    objectKey: string,
    access: 'read' | 'write' | 'readwrite',
    bucketKey?: string,
  ): Promise<string> {
    const token = await this.getAccessToken();
    const bucket = bucketKey || this.configService.get<string>('APS_BUCKET_KEY') || 'interior-app-dwg-bucket';

    const response = await axios.post(
      `https://developer.api.autodesk.com/oss/v2/buckets/${bucket}/objects/${encodeURIComponent(objectKey)}/signeds3${access === 'write' ? 'upload' : 'download'}`,
      {
        minutesExpiration: 60,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data.url || response.data.signedUrl;
  }

  /**
   * 업로드용 signed URL 생성
   */
  private async createSignedUrlForUpload(
    bucketKey: string,
    objectKey: string,
  ): Promise<string> {
    const token = await this.getAccessToken();

    const response = await axios.get(
      `https://developer.api.autodesk.com/oss/v2/buckets/${bucketKey}/objects/${encodeURIComponent(objectKey)}/signeds3upload`,
      {
        params: {
          minutesExpiration: 60,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return response.data.urls?.[0] || response.data.signedUrl;
  }

  // ============== 설정 및 초기화 ==============

  /**
   * Design Automation 환경 설정 (AppBundle + Activity 생성)
   */
  async setupDesignAutomation(appBundleZip: Buffer): Promise<{
    appBundle: AppBundleInfo;
    activity: ActivityInfo;
  }> {
    this.logger.log('Setting up Design Automation environment...');

    // 1. AppBundle 생성/업데이트
    const appBundle = await this.createOrUpdateAppBundle(appBundleZip);
    this.logger.log(`AppBundle ready: ${appBundle.id}`);

    // 2. Activity 생성/업데이트
    const activity = await this.createOrUpdateActivity();
    this.logger.log(`Activity ready: ${activity.id}`);

    return { appBundle, activity };
  }

  /**
   * Forge/APS App nickname 설정 (최초 1회)
   */
  async setNickname(nickname: string = NICKNAME): Promise<void> {
    const client = await this.getAuthorizedClient();

    try {
      await client.patch('/forgeapps/me', {
        nickname,
      });
      this.logger.log(`Nickname set to: ${nickname}`);
    } catch (error: any) {
      if (error.response?.status === 409) {
        this.logger.log(`Nickname already set: ${nickname}`);
      } else {
        throw error;
      }
    }
  }

  /**
   * 사용 가능한 AutoCAD 엔진 목록 조회
   */
  async listEngines(): Promise<string[]> {
    const client = await this.getAuthorizedClient();
    const response = await client.get('/engines');

    // AutoCAD 엔진만 필터링
    return (response.data.data || []).filter((engine: string) =>
      engine.includes('AutoCAD'),
    );
  }
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadsService {
  private s3Client: S3Client;
  private bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.get<string>('AWS_REGION') || 'ap-northeast-2',
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') || '',
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '',
      },
    });
    this.bucket = this.configService.get<string>('AWS_S3_BUCKET') || 'interior-app-images';
  }

  async getPresignedUrl(
    fileName: string,
    fileType: string,
    purpose: string,
  ): Promise<{ uploadUrl: string; fileUrl: string; expiresIn: number }> {
    const extension = fileName.split('.').pop();
    const key = `${purpose}/${uuidv4()}.${extension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: 3600,
    });

    const fileUrl = `https://${this.bucket}.s3.amazonaws.com/${key}`;

    return {
      uploadUrl,
      fileUrl,
      expiresIn: 3600,
    };
  }
}

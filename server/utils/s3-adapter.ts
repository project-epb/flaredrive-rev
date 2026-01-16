import {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export interface S3Config {
  endpointUrl: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
  forcePathStyle: boolean
}

export class S3Adapter {
  private client: S3Client
  private bucketName: string

  constructor(config: S3Config) {
    this.client = new S3Client({
      endpoint: config.endpointUrl,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: config.forcePathStyle,
    })
    this.bucketName = config.bucketName
  }

  async listObjects(prefix: string = '', delimiter?: string, maxKeys: number = 1000) {
    const command = new ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: prefix,
      Delimiter: delimiter,
      MaxKeys: maxKeys,
    })

    const response = await this.client.send(command)

    return {
      objects: response.Contents || [],
      commonPrefixes: response.CommonPrefixes || [],
      isTruncated: response.IsTruncated || false,
      nextContinuationToken: response.NextContinuationToken,
    }
  }

  async getPresignedUploadUrl(key: string, expiresIn: number = 3600, contentType?: string) {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
    })

    return await getSignedUrl(this.client, command, { expiresIn })
  }

  async getPresignedDownloadUrl(key: string, expiresIn: number = 3600) {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    })

    return await getSignedUrl(this.client, command, { expiresIn })
  }

  async deleteObject(key: string) {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    })

    await this.client.send(command)
  }

  async deleteObjects(keys: string[]) {
    await Promise.all(keys.map((key) => this.deleteObject(key)))
  }
}

export const createS3Adapter = (config: S3Config) => new S3Adapter(config)

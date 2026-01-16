import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export interface S3Config {
  endpointUrl: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
  forcePathStyle: boolean
}

export interface S3ObjectInfo {
  key: string
  size: number
  lastModified: Date
  etag?: string
  contentType?: string
}

export interface S3ListResult {
  objects: S3ObjectInfo[]
  prefix: string
  nextToken?: string
  commonPrefixes: string[]
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

  async listObjects(prefix: string = '', maxKeys: number = 1000, continuationToken?: string): Promise<S3ListResult> {
    const command = new ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: prefix,
      MaxKeys: maxKeys,
      ContinuationToken: continuationToken,
      Delimiter: '/',
    })

    const response = await this.client.send(command)

    const objects: S3ObjectInfo[] = (response.Contents || []).map((item) => ({
      key: item.Key!,
      size: item.Size || 0,
      lastModified: item.LastModified || new Date(),
      etag: item.ETag,
    }))

    const commonPrefixes = (response.CommonPrefixes || []).map((item) => item.Prefix!).filter(Boolean)

    return {
      objects,
      prefix,
      nextToken: response.NextContinuationToken,
      commonPrefixes,
    }
  }

  async getObjectMetadata(key: string): Promise<S3ObjectInfo> {
    const command = new HeadObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    })

    const response = await this.client.send(command)

    return {
      key,
      size: response.ContentLength || 0,
      lastModified: response.LastModified || new Date(),
      etag: response.ETag,
      contentType: response.ContentType,
    }
  }

  async deleteObject(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    })

    await this.client.send(command)
  }

  async getPresignedUrlForGet(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    })

    return await getSignedUrl(this.client, command, { expiresIn })
  }

  async getPresignedUrlForPut(key: string, contentType?: string, expiresIn: number = 3600): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
    })

    return await getSignedUrl(this.client, command, { expiresIn })
  }

  async getObject(key: string): Promise<ReadableStream | null> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    })

    const response = await this.client.send(command)
    return response.Body?.transformToWebStream() || null
  }
}

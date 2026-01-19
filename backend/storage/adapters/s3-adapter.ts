import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  ListObjectsV2Output,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import type { StorageAdapter } from '../adapter.js'
import type {
  StorageGetResult,
  StorageListResult,
  StorageTestResult,
  PresignGetResult,
  PresignPutResult,
} from '../types.js'
import { createS3Client, encodeCopySource, type S3BucketConfig } from '../../utils/s3-client.js'

const stripQuotes = (value: string) => value.replace(/^\"|\"$/g, '')

export class S3Adapter implements StorageAdapter {
  private readonly s3: S3Client
  private readonly bucketName: string

  constructor(private readonly cfg: S3BucketConfig) {
    this.s3 = createS3Client(cfg)
    this.bucketName = cfg.bucketName
  }

  async list(
    prefix: string,
    opts: { delimiter?: string; limit?: number; startAfter?: string }
  ): Promise<StorageListResult> {
    const limit = Math.min(1000, Math.max(1, opts.limit || 1000))

    const list: ListObjectsV2Output = await this.s3.send(
      new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix || undefined,
        Delimiter: opts.delimiter || undefined,
        MaxKeys: limit,
        StartAfter: opts.startAfter || undefined,
      })
    )

    const objects = (list.Contents || [])
      .filter((o) => o.Key)
      .map((o) => {
        const etag = o.ETag ? stripQuotes(o.ETag) : ''
        return {
          key: o.Key || '',
          version: 'v1',
          size: Number(o.Size || 0),
          etag,
          httpEtag: etag,
          checksums: {},
          uploaded: o.LastModified ? new Date(o.LastModified) : new Date(),
          httpMetadata: {
            etag,
            contentLength: Number(o.Size || 0),
            lastModified: o.LastModified ? new Date(o.LastModified).toUTCString() : undefined,
          },
          customMetadata: {},
          range: undefined,
          storageClass: o.StorageClass || 'Standard',
        }
      })
      .filter((o) => o.key !== prefix)

    const folders = (list.CommonPrefixes || []).map((p) => p.Prefix || '').filter(Boolean)
    const hasMore = !!list.IsTruncated
    const moreAfter = hasMore ? objects.at(-1)?.key || null : null

    return {
      objects,
      folders,
      hasMore,
      moreAfter,
    }
  }

  async put(
    key: string,
    body: ArrayBuffer,
    opts: { contentType?: string; metadata?: Record<string, string> }
  ): Promise<{ etag?: string }> {
    const res = await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: new Uint8Array(body),
        ...(opts.contentType ? { ContentType: opts.contentType } : {}),
        ...(opts.metadata ? { Metadata: opts.metadata } : {}),
      })
    )

    return { etag: res.ETag ? stripQuotes(res.ETag) : '' }
  }

  async copy(
    fromKey: string,
    toKey: string,
    opts: { contentType?: string; metadata?: Record<string, string> }
  ): Promise<{ etag?: string }> {
    const res = await this.s3.send(
      new CopyObjectCommand({
        Bucket: this.bucketName,
        Key: toKey,
        CopySource: encodeCopySource(this.bucketName, fromKey),
        MetadataDirective: 'REPLACE',
        ...(opts.metadata ? { Metadata: opts.metadata } : {}),
        ...(opts.contentType ? { ContentType: opts.contentType } : {}),
      })
    )

    return { etag: res.CopyObjectResult?.ETag ? stripQuotes(res.CopyObjectResult.ETag) : '' }
  }

  async delete(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucketName, Key: key }))
  }

  async get(key: string): Promise<StorageGetResult> {
    const obj: any = await this.s3.send(new GetObjectCommand({ Bucket: this.bucketName, Key: key }))
    if (!obj?.Body) {
      throw new Error('File not found')
    }
    return {
      body: obj.Body,
      contentType: obj.ContentType || 'application/octet-stream',
      etag: obj.ETag ? stripQuotes(obj.ETag) : '',
    }
  }

  async testConnection(): Promise<StorageTestResult> {
    const startedAt = Date.now()
    try {
      try {
        await this.s3.send(new HeadBucketCommand({ Bucket: this.bucketName }))
      } catch (e: any) {
        const status = e?.$metadata?.httpStatusCode
        if (status === 405 || status === 501 || status === 400) {
          await this.s3.send(
            new ListObjectsV2Command({
              Bucket: this.bucketName,
              MaxKeys: 1,
            })
          )
        } else {
          throw e
        }
      }

      return { ok: true, latencyMs: Date.now() - startedAt }
    } catch (e: any) {
      return {
        ok: false,
        latencyMs: Date.now() - startedAt,
        error: e?.name || 'S3Error',
        message: e?.message || e?.toString?.() || 'Connection test failed',
        status: e?.$metadata?.httpStatusCode,
      }
    }
  }

  async presignPut(key: string, opts: { expiresIn: number; contentType?: string }): Promise<PresignPutResult> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ...(opts.contentType ? { ContentType: opts.contentType } : {}),
    })

    // Bun/Vite 打包时可能引入 aws-sdk 多版本类型，导致泛型不兼容；这里做最小断言。
    const url = await getSignedUrl(this.s3, command, { expiresIn: opts.expiresIn })

    return {
      method: 'PUT',
      url,
      headers: opts.contentType ? { 'Content-Type': opts.contentType } : {},
      expiresIn: opts.expiresIn,
    }
  }

  async presignGet(
    key: string,
    opts: { expiresIn: number; download?: boolean; fileName?: string }
  ): Promise<PresignGetResult> {
    const fileName = (opts.fileName || '').trim()
    const responseDisposition = opts.download
      ? `attachment${fileName ? `; filename=\"${encodeURIComponent(fileName)}\"` : ''}`
      : undefined

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ...(responseDisposition ? { ResponseContentDisposition: responseDisposition } : {}),
    })

    const url = await getSignedUrl(this.s3 as any, command as any, { expiresIn: opts.expiresIn })

    return {
      method: 'GET',
      url,
      headers: {},
      expiresIn: opts.expiresIn,
    }
  }
}

export const createS3Adapter = (cfg: S3BucketConfig): StorageAdapter => {
  return new S3Adapter(cfg)
}

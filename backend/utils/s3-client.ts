import { S3Client } from '@aws-sdk/client-s3'

export type S3BucketConfig = {
  endpointUrl: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
  forcePathStyle: number
}

export const createS3Client = (cfg: S3BucketConfig) => {
  return new S3Client({
    // AWS SDK v3 doesn't support 'auto' as a standard region and may try to load config.
    // For R2 and other S3-compatible providers, 'us-east-1' is the standard placeholder.
    region: cfg.region === 'auto' ? 'us-east-1' : cfg.region || 'us-east-1',
    endpoint: cfg.endpointUrl,
    forcePathStyle: !!cfg.forcePathStyle,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
    // Fix for MinIO/S3-compatible providers: avoid adding checksum headers that might not be signed or supported
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  })
}

export const encodeCopySource = (bucketName: string, key: string) => {
  // CopySource requires URL-encoding, but keep '/' separators.
  const encodedKey = encodeURIComponent(key).replace(/%2F/g, '/')
  return `/${bucketName}/${encodedKey}`
}

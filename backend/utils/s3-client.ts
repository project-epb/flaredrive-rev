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
    region: cfg.region || 'auto',
    endpoint: cfg.endpointUrl,
    forcePathStyle: !!cfg.forcePathStyle,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  })
}

export const encodeCopySource = (bucketName: string, key: string) => {
  // CopySource requires URL-encoding, but keep '/' separators.
  const encodedKey = encodeURIComponent(key).replace(/%2F/g, '/')
  return `/${bucketName}/${encodedKey}`
}

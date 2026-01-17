import type { StorageAdapter } from './adapter.js'
import type { S3BucketConfig } from '../utils/s3-client.js'
import { createS3Adapter } from './adapters/s3-adapter.js'

export const createStorageAdapter = (cfg: S3BucketConfig): StorageAdapter => {
  // 当前只有 S3-compatible 实现；后续可在这里按 provider/类型分发。
  return createS3Adapter(cfg)
}

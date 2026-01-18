import type {
  StorageGetResult,
  StorageListResult,
  StorageTestResult,
  PresignGetResult,
  PresignPutResult,
} from './types.js'

export interface StorageAdapter {
  list(prefix: string, opts: { delimiter?: string; limit?: number; startAfter?: string }): Promise<StorageListResult>

  put(
    key: string,
    body: ArrayBuffer,
    opts: { contentType?: string; metadata?: Record<string, string> }
  ): Promise<{ etag?: string }>

  copy(
    fromKey: string,
    toKey: string,
    opts: { contentType?: string; metadata?: Record<string, string> }
  ): Promise<{ etag?: string }>

  delete(key: string): Promise<void>

  get(key: string): Promise<StorageGetResult>

  testConnection(): Promise<StorageTestResult>

  presignPut(key: string, opts: { expiresIn: number; contentType?: string }): Promise<PresignPutResult>

  presignGet(key: string, opts: { expiresIn: number; download?: boolean; fileName?: string }): Promise<PresignGetResult>
}

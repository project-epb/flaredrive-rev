export type StorageListResult = {
  objects: {
    key: string
    size: number
    etag?: string
    uploaded?: number
    httpMetadata?: Record<string, any>
    customMetadata?: Record<string, any>
  }[]
  folders: string[]
  hasMore: boolean
  moreAfter: string | null
}

export type StorageGetResult = {
  body: BodyInit | ReadableStream
  contentType: string
  etag: string
}

export type StorageTestResult = {
  ok: boolean
  latencyMs: number
  status?: number
  error?: string
  message?: string
}

export type PresignPutResult = {
  method: 'PUT'
  url: string
  headers: Record<string, string>
  expiresIn: number
}

export type PresignGetResult = {
  method: 'GET'
  url: string
  headers: Record<string, string>
  expiresIn: number
}

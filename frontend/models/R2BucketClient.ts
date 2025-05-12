import axios, { type Axios } from 'axios'
import { type R2Object } from '@cloudflare/workers-types/2023-07-01'

export interface R2BucketListResponse {
  objects: R2Object[]
  folders: string[]
  prefix: string
  limit: number
  startAfter: string
  hasMore: boolean
  moreAfter: string | null
}

export class R2BucketClient {
  readonly request: Axios
  constructor(private baseURL: string = '/api/bucket') {
    this.request = axios.create({
      baseURL,
    })
  }

  setBaseURL(baseURL: string) {
    this.baseURL = baseURL
    this.request.defaults.baseURL = baseURL
    return this
  }

  list(prefix: string, options?: { delimiter?: string; limit?: number; startAfter?: string }) {
    const { delimiter, limit, startAfter } = options || {}
    return this.request.get<R2BucketListResponse>(prefix, {
      params: {
        delimiter,
        limit,
        startAfter,
      },
    })
  }

  upload(
    key: string,
    file: File | Blob | ArrayBuffer | string,
    options?: {
      contentType?: string
      metadata?: Record<string, string>
    }
  ) {
    const metadata = options?.metadata || {}
    const contentType = options?.contentType || (file as File).type || 'application/octet-stream'
    const metaHeaders = Object.entries(metadata).reduce(
      (acc, [key, value]) => {
        key = this.convertNonAsciiString(key)
        value = this.convertNonAsciiString(value)
        if (key.length > 128 || value.length > 128) {
          throw new Error('Key or value length exceeds 128 characters')
        }
        acc[`x-amz-meta-${key}`] = value
        return acc
      },
      {} as Record<string, string>
    )
    return this.request.put<R2Object>(key, file, {
      headers: {
        ...metaHeaders,
        'Content-Type': contentType || 'application/octet-stream',
      },
    })
  }

  delete(key: string): Promise<void> {
    return this.request.delete(key)
  }

  rename(oldKey: string, newKey: string): Promise<void> {
    return this.request.put(newKey, null, {
      params: {
        copySource: oldKey,
      },
    })
  }

  private convertNonAsciiString(str: string) {
    const hasNonAscii = /[^\x00-\x7F]/.test(str)
    if (hasNonAscii) {
      return encodeURIComponent(str)
    } else {
      return str
    }
  }
}

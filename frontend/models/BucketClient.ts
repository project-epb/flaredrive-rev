import { Fexios, type FexiosFinalContext } from 'fexios'

export type StorageListObject = {
  key: string
  version: string
  size: number
  etag: string
  httpEtag: string
  checksums: any
  uploaded: Date
  httpMetadata?: Record<string, any>
  customMetadata?: Record<string, any>
  range?: any
  storageClass: string
}

export type StorageListResult = {
  objects: StorageListObject[]
  folders: string[]
  prefix: string
  limit: number
  startAfter: string
  hasMore: boolean
  moreAfter: string | null
}

export interface BucketInfo {
  id: string
  name: string
  cdnBaseUrl?: string
  edgeThumbnailUrl?: string
  bucketName: string
  endpointUrl: string
  region: string
  accessKeyId?: string // Usually masked or not returned fully if secure
  forcePathStyle?: number | boolean
  uploadMethod?: 'presigned' | 'proxy'
}

export class BucketClient {
  readonly request: Fexios
  constructor(private baseURL: string = '/api/bucket/') {
    this.request = Fexios.create({
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
    return this.request.get<StorageListResult>(prefix, {
      query: {
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
    return this.request.put<StorageListObject>(key, file, {
      headers: {
        ...metaHeaders,
        'Content-Type': contentType || 'application/octet-stream',
      },
      timeout: 0,
    })
  }

  delete(key: string): Promise<FexiosFinalContext<any>> {
    return this.request.delete(key)
  }

  rename(oldKey: string, newKey: string): Promise<FexiosFinalContext<any>> {
    return this.request.put(newKey, null, {
      query: {
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

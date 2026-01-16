/**
 * 文件辅助工具 Composable
 */
export const useFileHelper = () => {
  /**
   * 格式化文件大小
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'

    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  /**
   * 格式化日期
   */
  const formatDate = (date: string | Date): string => {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  /**
   * 根据文件名获取图标
   */
  const getFileIcon = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase()

    const iconMap: Record<string, string> = {
      // 图片
      jpg: 'i-lucide-image',
      jpeg: 'i-lucide-image',
      png: 'i-lucide-image',
      gif: 'i-lucide-image',
      svg: 'i-lucide-image',
      webp: 'i-lucide-image',
      bmp: 'i-lucide-image',

      // 视频
      mp4: 'i-lucide-video',
      avi: 'i-lucide-video',
      mov: 'i-lucide-video',
      wmv: 'i-lucide-video',
      flv: 'i-lucide-video',
      mkv: 'i-lucide-video',
      webm: 'i-lucide-video',

      // 音频
      mp3: 'i-lucide-music',
      wav: 'i-lucide-music',
      flac: 'i-lucide-music',
      aac: 'i-lucide-music',
      ogg: 'i-lucide-music',
      m4a: 'i-lucide-music',

      // 文档
      pdf: 'i-lucide-file-type',
      doc: 'i-lucide-file-text',
      docx: 'i-lucide-file-text',
      xls: 'i-lucide-file-spreadsheet',
      xlsx: 'i-lucide-file-spreadsheet',
      ppt: 'i-lucide-presentation',
      pptx: 'i-lucide-presentation',

      // 文本
      txt: 'i-lucide-file-text',
      md: 'i-lucide-file-text',
      json: 'i-lucide-file-json',
      xml: 'i-lucide-file-code',
      csv: 'i-lucide-file-spreadsheet',

      // 代码
      js: 'i-lucide-file-code',
      ts: 'i-lucide-file-code',
      jsx: 'i-lucide-file-code',
      tsx: 'i-lucide-file-code',
      vue: 'i-lucide-file-code',
      html: 'i-lucide-file-code',
      css: 'i-lucide-file-code',
      scss: 'i-lucide-file-code',
      sass: 'i-lucide-file-code',
      less: 'i-lucide-file-code',
      py: 'i-lucide-file-code',
      java: 'i-lucide-file-code',
      cpp: 'i-lucide-file-code',
      c: 'i-lucide-file-code',
      go: 'i-lucide-file-code',
      rs: 'i-lucide-file-code',
      php: 'i-lucide-file-code',
      rb: 'i-lucide-file-code',

      // 压缩文件
      zip: 'i-lucide-file-archive',
      rar: 'i-lucide-file-archive',
      '7z': 'i-lucide-file-archive',
      tar: 'i-lucide-file-archive',
      gz: 'i-lucide-file-archive',
      bz2: 'i-lucide-file-archive',
    }

    return iconMap[ext || ''] || 'i-lucide-file'
  }

  /**
   * 检查文件是否为图片
   */
  const isImage = (filename: string | { httpMetadata?: { contentType?: string } }): boolean => {
    if (typeof filename === 'string') {
      const ext = filename.split('.').pop()?.toLowerCase()
      return ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(ext || '')
    } else {
      const contentType = filename.httpMetadata?.contentType || ''
      return contentType.startsWith('image/')
    }
  }

  /**
   * 检查文件是否为视频
   */
  const isVideo = (filename: string | { httpMetadata?: { contentType?: string } }): boolean => {
    if (typeof filename === 'string') {
      const ext = filename.split('.').pop()?.toLowerCase()
      return ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'].includes(ext || '')
    } else {
      const contentType = filename.httpMetadata?.contentType || ''
      return contentType.startsWith('video/')
    }
  }

  /**
   * 检查文件是否为音频
   */
  const isAudio = (filename: string | { httpMetadata?: { contentType?: string } }): boolean => {
    if (typeof filename === 'string') {
      const ext = filename.split('.').pop()?.toLowerCase()
      return ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(ext || '')
    } else {
      const contentType = filename.httpMetadata?.contentType || ''
      return contentType.startsWith('audio/')
    }
  }

  /**
   * 检查文件是否为文本
   */
  const isText = (filename: string | { httpMetadata?: { contentType?: string } }): boolean => {
    if (typeof filename === 'string') {
      const ext = filename.split('.').pop()?.toLowerCase()
      return ['txt', 'md', 'json', 'xml', 'csv'].includes(ext || '')
    } else {
      const contentType = filename.httpMetadata?.contentType || ''
      return contentType.startsWith('text/')
    }
  }

  /**
   * 获取文件类型
   */
  const getFileType = (filename: string): string => {
    if (isImage(filename)) return 'image'
    if (isVideo(filename)) return 'video'
    if (isAudio(filename)) return 'audio'
    if (isText(filename)) return 'text'

    const ext = filename.split('.').pop()?.toLowerCase()
    if (ext === 'pdf') return 'pdf'
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) return 'archive'
    if (['js', 'ts', 'jsx', 'tsx', 'vue', 'html', 'css', 'py', 'java'].includes(ext || '')) return 'code'

    return 'unknown'
  }

  /**
   * 从文件路径中提取文件名
   */
  const getFileName = (path: string): string => {
    const parts = path.split('/')
    return parts[parts.length - 1] || path
  }

  /**
   * 从文件路径中提取文件夹名
   */
  const getFolderName = (path: string): string => {
    const parts = path.replace(/\/$/, '').split('/')
    return parts[parts.length - 1] || path
  }

  return {
    formatFileSize,
    formatDate,
    getFileIcon,
    isImage,
    isVideo,
    isAudio,
    isText,
    getFileType,
    getFileName,
    getFolderName,
  }
}

// 全局工具对象，用于兼容旧代码
export const FileHelper = {
  formatBytes: (bytes: number) => useFileHelper().formatFileSize(bytes),
  formatDate: (date: string | Date) => useFileHelper().formatDate(date),
  getIcon: (filename: string) => useFileHelper().getFileIcon(filename),
  isImage: (filename: string) => useFileHelper().isImage(filename),
  isVideo: (filename: string) => useFileHelper().isVideo(filename),
  isAudio: (filename: string) => useFileHelper().isAudio(filename),
  isText: (filename: string) => useFileHelper().isText(filename),
  getFileType: (filename: string) => useFileHelper().getFileType(filename),
  getFileName: (path: string) => useFileHelper().getFileName(path),
  getFolderName: (path: string) => useFileHelper().getFolderName(path),
}

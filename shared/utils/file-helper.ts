import {
  IconFile,
  IconFileZip,
  IconFileText,
  IconPhoto,
  IconVideo,
  IconMusic,
  IconFileCode,
  IconFolder,
} from '@tabler/icons-vue'
import type { Component } from 'vue'

export class FileHelper {
  static getFileExtension(filename: string): string {
    const parts = filename.split('.')
    return parts.length > 1 ? (parts[parts.length - 1]?.toLowerCase() ?? '') : ''
  }

  static isImage(filename: string): boolean {
    const ext = this.getFileExtension(filename)
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)
  }

  static isVideo(filename: string): boolean {
    const ext = this.getFileExtension(filename)
    return ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'flv'].includes(ext)
  }

  static isAudio(filename: string): boolean {
    const ext = this.getFileExtension(filename)
    return ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(ext)
  }

  static isCode(filename: string): boolean {
    const ext = this.getFileExtension(filename)
    return [
      'js',
      'ts',
      'jsx',
      'tsx',
      'vue',
      'py',
      'java',
      'cpp',
      'c',
      'cs',
      'php',
      'rb',
      'go',
      'rs',
      'swift',
      'kt',
      'json',
      'xml',
      'yaml',
      'yml',
      'toml',
      'md',
      'html',
      'css',
      'scss',
      'sass',
      'less',
    ].includes(ext)
  }

  static isText(filename: string): boolean {
    const ext = this.getFileExtension(filename)
    return ['txt', 'log', 'csv', 'tsv', 'md'].includes(ext)
  }

  static isArchive(filename: string): boolean {
    const ext = this.getFileExtension(filename)
    return ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(ext)
  }

  static getIcon(filename: string, isFolder = false): Component {
    if (isFolder) return IconFolder

    if (this.isImage(filename)) return IconPhoto
    if (this.isVideo(filename)) return IconVideo
    if (this.isAudio(filename)) return IconMusic
    if (this.isCode(filename)) return IconFileCode
    if (this.isText(filename)) return IconFileText
    if (this.isArchive(filename)) return IconFileZip

    return IconFile
  }

  static getPreviewType(filename: string): 'image' | 'video' | 'audio' | 'markdown' | 'text' | 'pdf' | 'iframe' | 'unknown' {
    if (this.isImage(filename)) return 'image'
    if (this.isVideo(filename)) return 'video'
    if (this.isAudio(filename)) return 'audio'
    if (this.getFileExtension(filename) === 'md') return 'markdown'
    if (this.isText(filename) || this.isCode(filename)) return 'text'
    if (this.getFileExtension(filename) === 'pdf') return 'iframe'
    return 'unknown'
  }

  static getSimpleFileInfo(filename: string) {
    return {
      name: filename.split('/').pop() || filename,
      ext: this.getFileExtension(filename)
    }
  }

  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'

    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  static formatDate(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60))
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60))
        return minutes === 0 ? '刚刚' : `${minutes} 分钟前`
      }
      return `${hours} 小时前`
    }

    if (days < 7) return `${days} 天前`
    if (days < 30) return `${Math.floor(days / 7)} 周前`
    if (days < 365) return `${Math.floor(days / 30)} 个月前`

    return date.toLocaleDateString('zh-CN')
  }
}

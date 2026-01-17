<template lang="pug">
.upload-form.space-y-6
  NCard.cursor-pointer.transition-all(
    content-style='padding: 0',
    :class='{ "ring-2 ring-primary": isDragOver }',
    @dragenter.prevent='onDragEnter',
    @dragover.prevent='onDragOver',
    @dragleave.prevent='onDragLeave',
    @drop.prevent='onDrop',
    @click='openFilePicker',
    hoverable
  )
    input.sr-only(ref='fileInputRef', type='file', multiple, @change='onFileInputChange')
    .flex.flex-col.items-center.gap-4.p-12.text-center
      .p-4.rounded-full.bg-primary-100(class='dark:bg-primary-900/20')
        Icon.size-12.text-primary(name='i-lucide-upload')
      div
        .text-lg.font-semibold.mb-2 点击选择文件或拖拽到此区域
        .text-sm.text-gray-500(class='dark:text-gray-400') 支持单个或批量上传
      NButton(type='primary', size='large')
        template(#icon)
          Icon(name='i-lucide-file-plus')
        | 选择文件

  NFormItem(v-if='!prefixReadonly', label='上传路径', feedback='可选，指定文件上传的目录')
    NInput(v-model:value='uploadPrefix', placeholder='例如：folder/subfolder/', size='large')
      template(#prefix)
        Icon(name='i-lucide-folder')

  NCard(v-if='files.length', size='small')
    template(#header)
      .flex.items-center.justify-between
        .flex.items-center.gap-2
          Icon.size-5(name='i-lucide-files')
          span.font-semibold 待上传文件 ({{ files.length }})
        NButton(type='error', quaternary, size='small', @click='files = []')
          template(#icon)
            Icon(name='i-lucide-x')
          | 清空

    .space-y-2
      .flex.items-center.justify-between.gap-3.p-3.rounded-lg.bg-gray-50(
        v-for='f in files',
        :key='f.name',
        class='dark:bg-gray-800'
      )
        .flex.items-center.gap-3.flex-1.min-w-0
          Icon.size-5.text-blue-600(name='i-lucide-file')
          .min-w-0
            p.font-medium.truncate {{ f.name }}
            p.text-xs.text-gray-500(class='dark:text-gray-400') {{ formatBytes(f.size) }}

    template(#action)
      NButton(type='primary', size='large', block, :loading='uploading', @click='uploadAll')
        template(#icon)
          Icon(name='i-lucide-upload')
        | 开始上传
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    bucketId: string
    prefix?: string
    prefixReadonly?: boolean
  }>(),
  {
    prefix: '',
    prefixReadonly: false,
  }
)

const emit = defineEmits(['success'])
const message = useMessage()

const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)
const uploading = ref(false)

const uploadPrefix = ref(props.prefix)

const files = ref<File[]>([])

const normalizePrefix = (prefix: string) => {
  if (!prefix) return ''
  return prefix.endsWith('/') ? prefix : `${prefix}/`
}

const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes)) return ''
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  if (mb < 1024) return `${mb.toFixed(1)} MB`
  const gb = mb / 1024
  return `${gb.toFixed(1)} GB`
}

const openFilePicker = () => {
  fileInputRef.value?.click()
}

const onFileInputChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  const selected = Array.from(input.files || [])
  if (selected.length) {
    files.value = selected
  }
  // allow selecting the same file again
  input.value = ''
}

const onDragEnter = () => {
  isDragOver.value = true
}

const onDragOver = () => {
  isDragOver.value = true
}

const onDragLeave = () => {
  isDragOver.value = false
}

const onDrop = (e: DragEvent) => {
  isDragOver.value = false
  const dropped = Array.from(e.dataTransfer?.files || [])
  if (dropped.length) {
    files.value = dropped
  }
}

const uploadOne = async (file: File) => {
  const prefix = props.prefixReadonly ? normalizePrefix(props.prefix) : normalizePrefix(uploadPrefix.value)
  const key = `${prefix}${file.name}`

  const presignResponse = await $fetch<{ url: string }>(`/api/objects/${props.bucketId}/presign`, {
    method: 'POST',
    body: {
      key,
      operation: 'upload',
      contentType: file.type,
    },
  })

  if (!presignResponse?.url) {
    throw new Error('Failed to get presign URL')
  }

  const uploadResponse = await fetch(presignResponse.url, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
  })

  if (!uploadResponse.ok) {
    throw new Error('Upload failed')
  }
}

const uploadAll = async () => {
  if (!files.value.length) {
    message.warning('请选择要上传的文件')
    return
  }

  uploading.value = true
  try {
    for (const file of files.value) {
      await uploadOne(file)
      message.success(`${file.name} 上传成功`)
    }

    files.value = []
    emit('success')
  } catch (error) {
    console.error('Upload error:', error)
    message.error('上传失败')
  } finally {
    uploading.value = false
  }
}
</script>

<style lang="scss" scoped>
.upload-form {
  .upload-drop-area {
    border: 1px dashed rgba(148, 163, 184, 0.9);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.6);
    transition: all 0.15s ease;
  }

  .upload-drop-area.is-dragover {
    border-color: rgba(99, 102, 241, 0.9);
    background: rgba(99, 102, 241, 0.08);
  }

  :deep(.dark) .upload-drop-area {
    background: rgba(2, 6, 23, 0.35);
    border-color: rgba(71, 85, 105, 0.9);
  }
}
</style>

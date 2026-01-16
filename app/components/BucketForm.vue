<template lang="pug">
UForm.space-y-4(@submit.prevent='handleSubmit')
  UFormField(label='助记标题', required, hint='仅用于显示，可随意命名')
    UInput(v-model='formValue.name', placeholder='例如：我的图片存储', size='lg', icon='i-lucide-tag')

  UFormField(label='Bucket Name', required, hint='实际的 S3 桶名称')
    UInput(v-model='formValue.bucketName', placeholder='例如：my-bucket', size='lg', icon='i-lucide-database')

  UFormField(label='Endpoint URL', required, hint='S3 服务的端点地址')
    UInput(
      v-model='formValue.endpointUrl',
      placeholder='例如：https://s3.amazonaws.com',
      size='lg',
      icon='i-lucide-server'
    )

  UFormField(label='Region', required)
    UInput(v-model='formValue.region', placeholder='例如：us-east-1 或 auto', size='lg', icon='i-lucide-map-pin')

  .grid.gap-4.grid-cols-1(class='md:grid-cols-2')
    UFormField(label='Access Key ID', :required='!bucket')
      UInput(
        v-model='formValue.accessKeyId',
        :placeholder='bucket ? "若不修改请留空" : "输入 Access Key ID"',
        size='lg',
        icon='i-lucide-key'
      )

    UFormField(label='Secret Access Key', :required='!bucket')
      UInput(
        v-model='formValue.secretAccessKey',
        type='password',
        :placeholder='bucket ? "若不修改请留空" : "输入 Secret Access Key"',
        size='lg',
        icon='i-lucide-lock',
        autocomplete='new-password'
      )

  UFormField(label='CDN Base URL', hint='可选，用于加速访问')
    UInput(v-model='formValue.cdnBaseUrl', placeholder='例如：https://cdn.example.com', size='lg', icon='i-lucide-globe')

  UFormField
    UCheckbox(v-model='formValue.forcePathStyle', label='强制路径样式')

  .flex.justify-end.gap-3.pt-4
    UButton(color='error', variant='ghost', @click='$emit("cancel")') 取消
    UButton(type='submit', color='primary', size='lg', :loading='loading') {{ bucket ? '保存' : '添加' }}
</template>

<script setup lang="ts">
import type { BucketInfo } from '~/composables/bucket'

const props = defineProps<{
  bucket?: BucketInfo
}>()

const emit = defineEmits(['success', 'cancel'])
const toast = useToast()
const loading = ref(false)

const formValue = reactive({
  name: props.bucket?.name || '',
  bucketName: props.bucket?.bucketName || '',
  endpointUrl: props.bucket?.endpointUrl || '',
  region: props.bucket?.region || 'auto',
  accessKeyId: '',
  secretAccessKey: '',
  cdnBaseUrl: props.bucket?.cdnBaseUrl || '',
  forcePathStyle: props.bucket?.forcePathStyle === 1,
})

const isValidUrl = (value: string) => {
  try {
    // eslint-disable-next-line no-new
    new URL(value)
    return true
  } catch {
    return false
  }
}

const handleSubmit = async () => {
  try {
    if (!formValue.name) {
      toast.add({ title: '请输入存储桶名称', color: 'warning' })
      return
    }
    if (!formValue.bucketName) {
      toast.add({ title: '请输入 Bucket Name', color: 'warning' })
      return
    }
    if (!formValue.endpointUrl) {
      toast.add({ title: '请输入 Endpoint URL', color: 'warning' })
      return
    }
    if (!isValidUrl(formValue.endpointUrl)) {
      toast.add({ title: '请输入有效的 URL', color: 'warning' })
      return
    }
    if (!formValue.region) {
      toast.add({ title: '请输入 Region', color: 'warning' })
      return
    }
    if (!props.bucket && !formValue.accessKeyId) {
      toast.add({ title: '请输入 Access Key ID', color: 'warning' })
      return
    }
    if (!props.bucket && !formValue.secretAccessKey) {
      toast.add({ title: '请输入 Secret Access Key', color: 'warning' })
      return
    }

    loading.value = true

    const payload = {
      ...formValue,
      forcePathStyle: !!formValue.forcePathStyle,
    }

    if (props.bucket) {
      // 编辑模式
      await $fetch(`/api/buckets/${props.bucket.id}`, {
        method: 'PUT',
        body: payload,
      })
      toast.add({ title: '更新成功', color: 'success' })
    } else {
      // 添加模式
      await $fetch('/api/buckets', {
        method: 'POST',
        body: payload,
      })
      toast.add({ title: '添加成功', color: 'success' })
    }

    emit('success')
  } catch (error) {
    console.error('Failed to save bucket:', error)
    toast.add({ title: (error as any).data?.message || '操作失败', color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

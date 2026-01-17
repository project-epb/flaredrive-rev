<template lang="pug">
form.space-y-4(@submit.prevent='handleSubmit')
  NFormItem(label='显示名称', required, feedback='仅用于显示，可随意命名')
    NInput(v-model:value='formValue.name', placeholder='例如：我的图片存储', size='large')
      template(#prefix)
        Icon(name='i-lucide-tag')

  NFormItem(label='Bucket Name', required, feedback='实际的 S3 桶名称')
    NInput(v-model:value='formValue.bucketName', placeholder='例如：my-bucket', size='large')
      template(#prefix)
        Icon(name='i-lucide-database')

  NFormItem(label='Endpoint URL', required, feedback='S3 服务的端点地址')
    NInput(v-model:value='formValue.endpointUrl', placeholder='例如：https://s3.amazonaws.com', size='large')
      template(#prefix)
        Icon(name='i-lucide-server')

  NFormItem(label='Region', required)
    NInput(v-model:value='formValue.region', placeholder='例如：us-east-1 或 auto', size='large')
      template(#prefix)
        Icon(name='i-lucide-map-pin')

  .grid.gap-4.grid-cols-1(class='md:grid-cols-2')
    NFormItem(label='Access Key ID', :required='!bucket')
      NInput(
        v-model:value='formValue.accessKeyId',
        :placeholder='bucket ? "若不修改请留空" : "输入 Access Key ID"',
        size='large'
      )
        template(#prefix)
          Icon(name='i-lucide-key')

    NFormItem(label='Secret Access Key', :required='!bucket')
      NInput(
        v-model:value='formValue.secretAccessKey',
        type='password',
        :placeholder='bucket ? "若不修改请留空" : "输入 Secret Access Key"',
        size='large',
        show-password-on='click',
        :input-props='{ autocomplete: "new-password" }'
      )
        template(#prefix)
          Icon(name='i-lucide-lock')

  NFormItem(label='CDN Base URL', feedback='可选，用于加速访问')
    NInput(v-model:value='formValue.cdnBaseUrl', placeholder='例如：https://cdn.example.com', size='large')
      template(#prefix)
        Icon(name='i-lucide-globe')

  NFormItem(label='强制路径样式')
    NSwitch(v-model:checked='formValue.forcePathStyle') 强制路径样式

  .flex.justify-end.gap-3.pt-4
    NButton(type='error', quaternary, @click='$emit("cancel")') 取消
    NButton(attr-type='submit', type='primary', :loading='loading') {{ bucket ? '保存' : '添加' }}
</template>

<script setup lang="ts">
import type { BucketInfo } from '~/composables/bucket'

const props = defineProps<{
  bucket?: BucketInfo
}>()

const emit = defineEmits(['success', 'cancel'])
const message = useMessage()
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
      message.warning('请输入存储桶名称')
      return
    }
    if (!formValue.bucketName) {
      message.warning('请输入 Bucket Name')
      return
    }
    if (!formValue.endpointUrl) {
      message.warning('请输入 Endpoint URL')
      return
    }
    if (!isValidUrl(formValue.endpointUrl)) {
      message.warning('请输入有效的 URL')
      return
    }
    if (!formValue.region) {
      message.warning('请输入 Region')
      return
    }
    if (!props.bucket && !formValue.accessKeyId) {
      message.warning('请输入 Access Key ID')
      return
    }
    if (!props.bucket && !formValue.secretAccessKey) {
      message.warning('请输入 Secret Access Key')
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
      message.success('更新成功')
    } else {
      // 添加模式
      await $fetch('/api/buckets', {
        method: 'POST',
        body: payload,
      })
      message.success('添加成功')
    }

    emit('success')
  } catch (error) {
    console.error('Failed to save bucket:', error)
    message.error((error as any).data?.message || '操作失败')
  } finally {
    loading.value = false
  }
}
</script>

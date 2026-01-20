<template lang="pug">
NForm.space-y-4(ref='formRef', :model='formValue', :rules='rules', @submit.prevent='handleSubmit')
  NFormItem(label='Display Name', path='name', feedback='Display name for this bucket')
    NInput(v-model:value='formValue.name', placeholder='e.g. My Assets', size='large')
      template(#prefix)
        IconTag

  NFormItem(label='Bucket Name', path='bucketName', feedback='Actual S3 bucket name')
    NInput(v-model:value='formValue.bucketName', placeholder='e.g. my-s3-bucket', size='large')
      template(#prefix)
        IconDatabase

  NFormItem(label='Endpoint URL', path='endpointUrl', feedback='S3 endpoint URL')
    NInput(v-model:value='formValue.endpointUrl', placeholder='e.g. https://s3.amazonaws.com', size='large')
      template(#prefix)
        IconServer

  NFormItem(label='Region', path='region')
    NInput(v-model:value='formValue.region', placeholder='e.g. us-east-1 or auto', size='large')
      template(#prefix)
        IconMapPin

  .grid.gap-4.grid-cols-1(class='md:grid-cols-2')
    NFormItem(label='Access Key ID', path='accessKeyId')
      NInput(
        v-model:value='formValue.accessKeyId',
        :placeholder='bucket ? "Leave empty to keep unchanged" : "Enter Access Key ID"',
        size='large'
      )
        template(#prefix)
          IconKey

    NFormItem(label='Secret Access Key', path='secretAccessKey')
      NInput(
        v-model:value='formValue.secretAccessKey',
        type='password',
        :placeholder='bucket ? "Leave empty to keep unchanged" : "Enter Secret Access Key"',
        size='large',
        show-password-on='click',
        :input-props='{ autocomplete: "new-password" }'
      )
        template(#prefix)
          IconLock

  NFormItem(label='CDN Base URL', path='cdnBaseUrl', feedback='Optional, public URL prefix for files')
    NInput(v-model:value='formValue.cdnBaseUrl', placeholder='e.g. https://cdn.example.com', size='large')
      template(#prefix)
        IconGlobe

  NFormItem(
    label='Edge Thumbnail URL (Optional)',
    path='edgeThumbnailUrl',
    feedback='URL structure for edge-rendered thumbnails. Variables: {cdn_base_url}, {width}, {height}, {file_key}'
  )
    .flex.flex-col.gap-2.w-full
      NInput(v-model:value='formValue.edgeThumbnailUrl', placeholder='URL Template', size='large')
        template(#prefix)
          IconPhoto
      .flex.gap-2.flex-wrap
        NButton(
          v-for='preset in edgeThumbnailPresets',
          :key='preset.label',
          size='small',
          dashed,
          @click='formValue.edgeThumbnailUrl = preset.value'
        ) {{ preset.label }}

  NFormItem(label='Upload Method', path='uploadMethod')
    NSelect(
      v-model:value='formValue.uploadMethod',
      size='large',
      :options='uploadMethodOptions',
      placeholder='Select upload method'
    )

  NFormItem(label='Force Path Style', path='forcePathStyle')
    NSwitch(v-model:checked='formValue.forcePathStyle') 
      template(#checked) Enabled
      template(#unchecked) Disabled

  .flex.justify-end.gap-3.pt-4
    NButton(type='error', quaternary, @click='$emit("cancel")') Cancel
    NButton(attr-type='submit', type='primary', :loading='loading') {{ bucket ? 'Save Changes' : 'Create Bucket' }}
</template>

<script setup lang="ts">
import type { BucketInfo } from '@/models/BucketClient'
import {
  IconTag,
  IconDatabase,
  IconServer,
  IconMapPin,
  IconKey,
  IconLock,
  IconGlobe,
  IconPhoto,
} from '@tabler/icons-vue'
import fexios from 'fexios'
import { useMessage, type FormInst, type FormRules } from 'naive-ui'

const props = defineProps<{
  bucket?: BucketInfo
}>()

const emit = defineEmits(['success', 'cancel'])
const message = useMessage()
const loading = ref(false)
const formRef = ref<FormInst | null>(null)

const formValue = reactive({
  name: props.bucket?.name || '',
  bucketName: props.bucket?.bucketName || '',
  endpointUrl: props.bucket?.endpointUrl || '',
  region: props.bucket?.region || 'auto',
  accessKeyId: '',
  secretAccessKey: '',
  cdnBaseUrl: props.bucket?.cdnBaseUrl || '',
  edgeThumbnailUrl: props.bucket?.edgeThumbnailUrl || '',
  forcePathStyle: props.bucket?.forcePathStyle === 1 || props.bucket?.forcePathStyle === true,
  uploadMethod: props.bucket?.uploadMethod || 'presigned',
})

const uploadMethodOptions = [
  { label: 'Presigned direct upload', value: 'presigned' },
  { label: 'FlareDrive proxy upload', value: 'proxy' },
]

const edgeThumbnailPresets = [
  {
    label: 'Cloudflare',
    value:
      '{cdn_base_url}cdn-cgi/image/format=auto,fit=contain,width={width},height={height},onerror=redirect/{file_key}',
  },
  {
    label: 'Upyun',
    value: '{cdn_base_url}{file_key}!/fwfh/{width}x{height}/format/webp',
  },
]

const rules = computed<FormRules>(() => {
  return {
    name: { required: true, message: 'Please enter display name', trigger: 'blur' },
    bucketName: { required: true, message: 'Please enter bucket name', trigger: 'blur' },
    endpointUrl: [
      { required: true, message: 'Please enter endpoint URL', trigger: 'blur' },
      {
        validator: (rule, value) => {
          try {
            new URL(value)
            return true
          } catch {
            return new Error('Please enter a valid URL')
          }
        },
        trigger: 'blur',
      },
    ],
    region: { required: true, message: 'Please enter region', trigger: 'blur' },
    accessKeyId: {
      required: !props.bucket,
      message: 'Please enter Access Key ID',
      trigger: 'blur',
    },
    secretAccessKey: {
      required: !props.bucket,
      message: 'Please enter Secret Access Key',
      trigger: 'blur',
    },
    uploadMethod: { required: true, message: 'Please select upload method', trigger: 'blur' },
  }
})

const handleSubmit = async () => {
  try {
    await formRef.value?.validate()

    loading.value = true

    const payload = {
      ...formValue,
      forcePathStyle: formValue.forcePathStyle ? 1 : 0,
    }

    if (props.bucket) {
      // Edit Mode
      await fexios.put(`/api/buckets/${props.bucket.id}`, payload)
      message.success('Bucket updated successfully')
    } else {
      // Create Mode
      await fexios.post('/api/buckets', payload)
      message.success('Bucket created successfully')
    }

    emit('success')
  } catch (error: any) {
    if (error?.message?.includes('validation failed')) {
      // Validation error, do nothing
      return
    }
    console.error('Failed to save bucket:', error)
    const msg = error.response?.data?.error || error.message || 'Operation failed'
    message.error(msg)
  } finally {
    loading.value = false
  }
}
</script>

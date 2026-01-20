<template lang="pug">
.admin-users-page
  .flex.items-center.justify-between.mb-6
    div
      h1.text-2xl.font-bold.mb-1 User Management
      NText(depth='3') Manage user accounts and permissions

    .flex.gap-2
      NButton(secondary, @click='loadUsers', :loading='isLoading')
        template(#icon): NIcon: IconRefresh
      NButton(type='primary', @click='openCreate') New User

  NDataTable(:columns='columns', :data='rows', :loading='isLoading', :row-key='(row) => row.id', scroll-x='100%')

  NModal(v-model:show='showCreate', title='Create User', preset='card', style='width: 520px; max-width: 90vw')
    NForm(:model='form', :rules='rules', ref='formRef', label-width='80')
      NFormItem(label='Email', path='email')
        NInput(v-model:value='form.email', placeholder='user@example.com')
      NFormItem(label='Password', path='password')
        NInput(v-model:value='form.password', type='password', show-password-on='click')
      NFormItem(label='Authorization Level', path='authorizationLevel')
        NSelect(v-model:value='form.authorizationLevel', :options='authOptions')
      .flex.justify-end.gap-3.mt-4
        NButton(@click='showCreate = false') Cancel
        NButton(type='primary', @click='submitCreate', :loading='isSubmitting') Create
</template>

<script setup lang="ts">
import {
  NButton,
  NCard,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NSelect,
  NTag,
  NSpace,
  NPopconfirm,
  useMessage,
} from 'naive-ui'
import fexios from 'fexios'
import { IconRefresh } from '@tabler/icons-vue'

type AdminUserRow = {
  id: number
  email: string
  authorizationLevel: number
  createdAt: number
  bucketCount?: number
}

const message = useMessage()
const rows = ref<AdminUserRow[]>([])
const isLoading = ref(false)
const showCreate = ref(false)
const isSubmitting = ref(false)

const formRef = ref()
const form = reactive({
  email: '',
  password: '',
  authorizationLevel: 1,
})

const authOptions = [
  { label: 'General', value: 1 },
  { label: 'Advanced', value: 2 },
  { label: 'System Operator', value: 3 },
]

const rules = {
  email: {
    required: true,
    message: 'Please enter an email',
    trigger: ['blur', 'input'],
    validator: (_: any, value: string) => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(value),
  },
  password: {
    required: true,
    message: 'Please enter at least 8 characters for the password',
    trigger: ['blur', 'input'],
    validator: (_: any, value: string) => typeof value === 'string' && value.length >= 8,
  },
  authorizationLevel: {
    required: true,
    message: 'Please select an authorization level',
    trigger: ['change'],
  },
}

const resetForm = () => {
  form.email = ''
  form.password = ''
  form.authorizationLevel = 1
}

const loadUsers = async () => {
  isLoading.value = true
  try {
    const { data } = await fexios.get<AdminUserRow[]>('/api/admin/users')
    rows.value = data || []
  } catch (e: any) {
    message.error(e?.response?.data?.error || e?.message || 'Failed to load')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadUsers()
})

const openCreate = () => {
  resetForm()
  showCreate.value = true
}

const submitCreate = async () => {
  const ok = await formRef.value
    ?.validate?.()
    .then(() => true)
    .catch(() => false)
  if (!ok) return

  isSubmitting.value = true
  try {
    await fexios.post('/api/admin/users', form)
    message.success('Created successfully')
    showCreate.value = false
    await loadUsers()
  } catch (e: any) {
    message.error(e?.response?.data?.error || e?.message || 'Creation failed')
  } finally {
    isSubmitting.value = false
  }
}

const updateAuthLevel = async (row: AdminUserRow, value: number) => {
  try {
    await fexios.patch(`/api/admin/users/${row.id}`, { authorizationLevel: value })
    message.success('Updated successfully')
    await loadUsers()
  } catch (e: any) {
    message.error(e?.response?.data?.error || e?.message || 'Update failed')
  }
}

const handleDelete = async (row: AdminUserRow) => {
  try {
    await fexios.delete(`/api/admin/users/${row.id}`)
    message.success('Deleted successfully')
    await loadUsers()
  } catch (e: any) {
    message.error(e?.response?.data?.error || e?.message || 'Deletion failed')
  }
}

const columns = [
  { title: 'ID', key: 'id', width: 80 },
  { title: 'Email', key: 'email', width: 220, ellipsis: true },
  {
    title: 'Authorization Level',
    key: 'authorizationLevel',
    width: 160,
    render: (row: AdminUserRow) =>
      h(NSelect, {
        value: row.authorizationLevel,
        options: authOptions,
        size: 'small',
        onUpdateValue: (value: number) => updateAuthLevel(row, value),
      }),
  },
  {
    title: 'Bucket Count',
    key: 'bucketCount',
    width: 80,
    render: (row: AdminUserRow) => h(NTag, { size: 'small' }, () => String(row.bucketCount ?? 0)),
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 120,
    render(row: AdminUserRow) {
      return h(NSpace, {}, () => [
        h(
          NPopconfirm,
          {
            onPositiveClick: () => handleDelete(row),
            'positive-text': 'Delete',
            'negative-text': 'Cancel',
          },
          {
            trigger: () => h(NButton, { size: 'small', type: 'error', secondary: true }, { default: () => 'Delete' }),
            default: () => `Delete user "${row.email}"?`,
          }
        ),
      ])
    },
  },
]
</script>

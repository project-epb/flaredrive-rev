<template lang="pug">
NuxtLayout(name='auth')
  UCard
    template(#header='')
      h2.text-2xl.font-bold.text-center 注册

    form.space-y-4(@submit.prevent='handleSubmit')
      UFormGroup(label='邮箱', required)
        UInput(
          v-model='formValue.email',
          type='email',
          placeholder='请输入邮箱',
          autocomplete='email',
          size='lg',
          icon='i-lucide-mail'
        )

      UFormGroup(label='密码', required, hint='至少 8 个字符')
        UInput(
          v-model='formValue.password',
          type='password',
          placeholder='请输入密码',
          autocomplete='new-password',
          size='lg',
          icon='i-lucide-lock'
        )

      UFormGroup(label='确认密码', required)
        UInput(
          v-model='formValue.confirmPassword',
          type='password',
          placeholder='请再次输入密码',
          autocomplete='new-password',
          size='lg',
          icon='i-lucide-lock'
        )

      UButton(type='submit', color='primary', block, size='lg', :loading='loading') 注册

    template(#footer='')
      .text-center.text-sm
        span.text-gray-600(class='dark:text-gray-400') 已有账号？
        UButton(variant='link', color='primary', padded=false, @click='$router.push("/auth/login")') 立即登录
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'auth',
})

const router = useRouter()
const toast = useToast()
const loading = ref(false)

const formValue = reactive({
  email: '',
  password: '',
  confirmPassword: '',
})

const isValidEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

const handleSubmit = async () => {
  try {
    if (!formValue.email) {
      toast.add({ title: '请输入邮箱', color: 'warning' })
      return
    }
    if (!isValidEmail(formValue.email)) {
      toast.add({ title: '请输入有效的邮箱地址', color: 'warning' })
      return
    }
    if (!formValue.password) {
      toast.add({ title: '请输入密码', color: 'warning' })
      return
    }
    if (formValue.password.length < 8) {
      toast.add({ title: '密码至少 8 个字符', color: 'warning' })
      return
    }
    if (!formValue.confirmPassword) {
      toast.add({ title: '请确认密码', color: 'warning' })
      return
    }
    if (formValue.confirmPassword !== formValue.password) {
      toast.add({ title: '两次输入的密码不一致', color: 'warning' })
      return
    }

    loading.value = true

    const response = (await $fetch('/api/auth/register', {
      method: 'POST',
      body: {
        email: formValue.email,
        password: formValue.password,
      },
    })) as any

    if (response.message) {
      toast.add({
        title: response.message === 'email already registered' ? '邮箱已被注册' : response.message,
        color: 'error',
      })
      return
    }

    toast.add({ title: '注册成功，请登录', color: 'success' })
    router.push('/auth/login')
  } catch (error: any) {
    console.error('Register error:', error)
    toast.add({ title: error.data?.message || '注册失败，请稍后重试', color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.auth-form {
  .form-title {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 1.5rem;
    text-align: center;
  }

  .form-footer {
    margin-top: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }
}
</style>

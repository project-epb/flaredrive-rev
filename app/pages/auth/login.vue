<template lang="pug">
#login
  UCard
    template(#header='')
      h2.text-2xl.font-bold.text-center 登录

    UForm.space-y-4(@submit.prevent='handleSubmit')
      UFormField(label='邮箱', required)
        UInput(
          v-model='formValue.email',
          type='email',
          placeholder='请输入邮箱',
          autocomplete='email',
          size='lg',
          icon='i-lucide-mail'
        )

      UFormField(label='密码', required)
        UInput(
          v-model='formValue.password',
          type='password',
          placeholder='请输入密码',
          autocomplete='current-password',
          size='lg',
          icon='i-lucide-lock'
        )

      UButton(type='submit', color='primary', block, size='lg', :loading='loading') 登录

    template(#footer='')
      .text-center.text-sm
        span.text-gray-600(class='dark:text-gray-400') 还没有账号？
        UButton(variant='link', color='primary', padded=false, @click='$router.push("/auth/register")') 立即注册
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
})

const isValidEmail = (email: string) => {
  // 足够用于前端基本校验
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

    loading.value = true

    const response = (await $fetch('/api/auth/login', {
      method: 'POST',
      body: {
        email: formValue.email,
        password: formValue.password,
      },
    }) as unknown) as { message?: string }

    if (response.message) {
      toast.add({
        title: response.message === 'invalid credentials' ? '邮箱或密码错误' : response.message,
        color: 'error',
      })
      return
    }

    toast.add({ title: '登录成功', color: 'success' })
    router.push('/buckets')
  } catch (error) {
    console.error('Login error:', error)
    toast.add({ title: (error as any).data?.message || '登录失败，请稍后重试', color: 'error' })
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

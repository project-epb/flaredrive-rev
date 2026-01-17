<template lang="pug">
#login
  NCard
    template(#header)
      h2.text-2xl.font-bold.text-center 登录

    form.space-y-4(@submit.prevent='handleSubmit')
      NFormItem(label='邮箱')
        NInput(
          v-model:value='formValue.email',
          type='text',
          placeholder='请输入邮箱',
          size='large',
          :input-props="{ autocomplete: 'email' }"
        )
           template(#prefix)
             Icon(name='i-lucide-mail')

      NFormItem(label='密码')
        NInput(
          v-model:value='formValue.password',
          type='password',
          placeholder='请输入密码',
          size='large',
          show-password-on='click',
          :input-props="{ autocomplete: 'current-password' }"
        )
           template(#prefix)
             Icon(name='i-lucide-lock')

      NButton(type='primary', block, size='large', :loading='loading', attr-type='submit') 登录

    template(#footer='')
      .text-center.text-sm
        span.text-gray-600(class='dark:text-gray-400') 还没有账号？
        NButton(text, type='primary', @click='$router.push("/auth/register")') 立即注册
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'auth',
})

const router = useRouter()
const message = useMessage()
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
      message.warning('请输入邮箱')
      return
    }
    if (!isValidEmail(formValue.email)) {
      message.warning('请输入有效的邮箱地址')
      return
    }
    if (!formValue.password) {
      message.warning('请输入密码')
      return
    }
    if (formValue.password.length < 8) {
      message.warning('密码至少 8 个字符')
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
      const msg = response.message === 'invalid credentials' ? '邮箱或密码错误' : response.message
      message.error(msg)
      return
    }

    message.success('登录成功')
    router.push('/buckets')
  } catch (error) {
    console.error('Login error:', error)
    message.error((error as any).data?.message || '登录失败，请稍后重试')
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

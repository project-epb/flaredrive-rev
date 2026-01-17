<template lang="pug">
#register
  NCard
    template(#header='')
      h2.text-2xl.font-bold.text-center 注册

    NForm.space-y-4(@submit.prevent='handleSubmit')
      NFormItem(label='邮箱')
        NInput(
          v-model:value='formValue.email',
          type='text',
          placeholder='请输入邮箱',
          size='large',
          :input-props='{ autocomplete: "email" }'
        )
          template(#prefix)
            Icon(name='i-lucide-mail')

      NFormItem(label='密码', feedback='至少 8 个字符')
        NInput(
          v-model:value='formValue.password',
          type='password',
          placeholder='请输入密码',
          size='large',
          show-password-on='click',
          :input-props='{ autocomplete: "new-password" }'
        )
          template(#prefix)
            Icon(name='i-lucide-lock')

      NFormItem(label='确认密码')
        NInput(
          v-model:value='formValue.confirmPassword',
          type='password',
          placeholder='请再次输入密码',
          size='large',
          show-password-on='click',
          :input-props='{ autocomplete: "new-password" }'
        )
          template(#prefix)
            Icon(name='i-lucide-lock')

      NButton(type='primary', block, size='large', :loading='loading', attr-type='submit') 注册

    template(#footer='')
      .text-center.text-sm
        span.text-gray-600(class='dark:text-gray-400') 已有账号？
        NButton(text, type='primary', @click='$router.push("/auth/login")') 立即登录
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
  confirmPassword: '',
})

const isValidEmail = (email: string) => {
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
    if (!formValue.confirmPassword) {
      message.warning('请确认密码')
      return
    }
    if (formValue.confirmPassword !== formValue.password) {
      message.warning('两次输入的密码不一致')
      return
    }

    loading.value = true

    const response = (await $fetch('/api/auth/register', {
      method: 'POST',
      body: {
        email: formValue.email,
        password: formValue.password,
      },
    })) as unknown as { message?: string }

    if (response.message) {
      const msg = response.message === 'email already registered' ? '邮箱已被注册' : response.message
      message.error(msg)
      return
    }

    message.success('注册成功，请登录')
    router.push('/auth/login')
  } catch (error) {
    console.error('Register error:', error)
    message.error((error as any).data?.message || '注册失败，请稍后重试')
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

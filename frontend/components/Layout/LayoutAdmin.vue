<template lang="pug">
NLayout.full-layout-container.admin-layout(native-scrollbar, content-class='admin-full', position='absolute')
  GlobalHeader
  NLayout.admin-shell(has-sider, native-scrollbar)
    NLayoutSider.admin-sider(
      bordered,
      show-trigger,
      v-model:collapsed='siderCollapsed',
      :collapsed-width='64',
      :native-scrollbar='false',
      :collapse-mode='windowWidth < 768 ? "transform" : "width"'
    )
      NMenu.mt-2(
        :value='activeKey',
        @update:value='handleMenu',
        :collapsed='siderCollapsed',
        :collapsed-width='64',
        :collapsed-icon-size='22',
        :options='menuOptions'
      )
    NLayoutContent.admin-content(content-class='admin-content-inner p-4', native-scrollbar)
      slot
  GlobalFooter
</template>

<script setup lang="ts">
import { NIcon } from 'naive-ui'
import type { MenuOption } from 'naive-ui'
import { IconUsers, IconBucket, IconDashboard } from '@tabler/icons-vue'
import type { Component } from 'vue'

const route = useRoute()
const router = useRouter()

const siderCollapsed = useLocalStorage('flaredrive:admin/sider-collapsed', false)
const { width: windowWidth } = useWindowSize()

const renderIcon = (icon: Component) => {
  return () => h(NIcon, null, { default: () => h(icon) })
}

const menuOptions = computed<MenuOption[]>(() => [
  {
    label: '控制台',
    key: '/admin',
    icon: renderIcon(IconDashboard),
  },
  {
    key: 'divider-1',
    type: 'divider',
  },
  {
    label: '用户管理',
    key: '/admin/users',
    icon: renderIcon(IconUsers),
  },
  {
    label: '存储桶管理',
    key: '/admin/buckets',
    icon: renderIcon(IconBucket),
  },
])

const activeKey = computed(() => {
  const path = route.path
  if (path.startsWith('/admin/users')) return '/admin/users'
  if (path.startsWith('/admin/buckets')) return '/admin/buckets'
  if (path === '/admin' || path.startsWith('/admin/')) return '/admin'
  return ''
})

const handleMenu = (key: string) => {
  if (key) router.push(key)
}
</script>

<style scoped lang="sass">
:deep(.admin-full)
  min-height: 100vh
  display: flex
  flex-direction: column

.admin-shell
  flex: 1
</style>

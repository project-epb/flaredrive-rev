<template lang="pug">
NLayout.full-layout-container.admin-layout(native-scrollbar, content-class='admin-full', position='absolute')
  GlobalHeader
  NLayout.admin-shell(has-sider, native-scrollbar)
    NLayoutSider.admin-sider(
      bordered,
      show-trigger='bar',
      v-model:collapsed='siderCollapsed',
      :native-scrollbar='false',
      :collapsed-width='windowWidth < 768 ? 0 : 64',
      :collapse-mode='windowWidth < 768 ? "transform" : "width"',
      :position='windowWidth < 768 ? "absolute" : "static"',
      @click.stop
    )
      NMenu.mt-2(
        :value='activeKey',
        @update:value='handleMenu',
        :collapsed='siderCollapsed',
        :collapsed-width='64',
        :collapsed-icon-size='22',
        :options='menuOptions'
      )
    NLayoutContent.admin-content(
      content-class='admin-content-inner p-4',
      native-scrollbar,
      :content-style='{ paddingLeft: "1.5rem" }'
    )
      slot
  GlobalFooter
</template>

<script setup lang="ts">
import { NIcon } from 'naive-ui'
import type { MenuOption } from 'naive-ui'
import { IconUsers, IconBucket, IconDashboard, IconSettings } from '@tabler/icons-vue'
import type { Component } from 'vue'

const route = useRoute()
const router = useRouter()

const { width: windowWidth } = useWindowSize()
const siderCollapsed = useLocalStorage('flaredrive:admin/sider-collapsed', windowWidth.value < 768)

const renderIcon = (icon: Component) => {
  return () => h(NIcon, null, { default: () => h(icon) })
}

const menuOptions = computed<MenuOption[]>(() => [
  {
    label: 'Admin Dashboard',
    key: '/admin',
    icon: renderIcon(IconDashboard),
  },
  {
    key: 'divider-1',
    type: 'divider',
  },
  {
    label: 'Site Settings',
    key: '/admin/settings',
    icon: renderIcon(IconSettings),
  },
  {
    label: 'User Management',
    key: '/admin/users',
    icon: renderIcon(IconUsers),
  },
  {
    label: 'Bucket Management',
    key: '/admin/buckets',
    icon: renderIcon(IconBucket),
  },
])

const activeKey = computed(() => {
  const path = route.path
  if (path.startsWith('/admin/settings')) return '/admin/settings'
  if (path.startsWith('/admin/users')) return '/admin/users'
  if (path.startsWith('/admin/buckets')) return '/admin/buckets'
  if (path === '/admin' || path.startsWith('/admin/')) return '/admin'
  return ''
})

const handleMenu = (key: string) => {
  if (key) router.push(key)
  if (windowWidth.value < 768) {
    siderCollapsed.value = true
  }
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

<template lang="pug">
.preferences-page
  NH1 Preferences
  NP(depth='3') Customize your local experience. These settings are stored in your browser.

  .grid.grid-cols-1.gap-4.mt-4
    NCard(title='Browser')
      NForm(label-placement='left', label-width='180')
        NFormItem(label='Default layout')
          NSelect(
            style='min-width: 220px',
            :value='browserLayout',
            :options='layoutSelectOptions',
            @update:value='onUpdateLayout'
          )
          template(#feedback)
            span.text-xs.opacity-70
              | Used for bucket object browsing.

        NFormItem(label='Top sticky rail')
          NSwitch(:value='showTopStickyRail', @update:value='onUpdateTopRail')
          template(#feedback)
            span.text-xs.opacity-70
              | Show the top sticky action rail in bucket browser.

        NFormItem(label='Gallery sort')
          .flex.items-center.gap-2.flex-wrap
            NSelect(
              style='min-width: 180px',
              :value='gallerySortBy',
              :options='gallerySortByOptions',
              @update:value='onUpdateGallerySortBy'
            )
            NSelect(
              style='min-width: 180px',
              :value='gallerySortOrder',
              :options='sortOrderOptions',
              @update:value='onUpdateGallerySortOrder'
            )
          template(#feedback)
            span.text-xs.opacity-70
              | Default sorting for the gallery view.

    NCard(title='Theme')
      NForm(label-placement='left', label-width='180')
        NFormItem(label='Color mode')
          NSelect(
            style='min-width: 220px',
            :value='theme.rawTheme',
            :options='themeOptions',
            @update:value='onUpdateTheme'
          )
          template(#feedback)
            span.text-xs.opacity-70
              | Light, dark or follow system.

    NCard(title='Reset')
      NForm(label-placement='left', label-width='180')
        NFormItem(label='Reset preferences')
          NButton(type='warning', secondary, @click='onReset') Reset
          template(#feedback)
            span.text-xs.opacity-70
              | Restore defaults for all local preferences.
</template>

<script setup lang="ts">
import { useDialog, useMessage } from 'naive-ui'
import type { SelectMixedOption } from 'naive-ui/es/select/src/interface'
import { isBrowserLayout, isGallerySortBy, isSortOrder } from '@/stores/prefs'

definePage({
  name: 'preferences',
  meta: {
    // keep default auth requirement
  },
})

const prefs = usePrefsStore()
const theme = useThemeStore()

const { browserLayout, showTopStickyRail, gallerySortBy, gallerySortOrder } = storeToRefs(prefs)

const dialog = useDialog()
const message = useMessage()

const layoutSelectOptions: SelectMixedOption[] = [
  { label: 'List', value: 'list' },
  { label: 'Gallery', value: 'gallery' },
  { label: 'Book', value: 'book' },
]

const gallerySortByOptions: SelectMixedOption[] = [
  { label: 'Name', value: 'key' },
  { label: 'Size', value: 'size' },
  { label: 'Date', value: 'uploaded' },
]

const sortOrderOptions: SelectMixedOption[] = [
  { label: 'Ascending', value: 'ascend' },
  { label: 'Descending', value: 'descend' },
]

const themeOptions: SelectMixedOption[] = [
  { label: 'Auto', value: 'auto' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
]

function onUpdateLayout(value: string) {
  if (isBrowserLayout(value)) browserLayout.value = value
}

function onUpdateTopRail(value: boolean) {
  showTopStickyRail.value = value
}

function onUpdateGallerySortBy(value: string) {
  if (isGallerySortBy(value)) gallerySortBy.value = value
}

function onUpdateGallerySortOrder(value: string) {
  if (isSortOrder(value)) gallerySortOrder.value = value
}

function onUpdateTheme(value: string) {
  if (value === 'auto' || value === 'light' || value === 'dark') {
    theme.setTheme(value)
  }
}

function onReset() {
  dialog.warning({
    title: 'Reset Preferences',
    content: 'Reset all local preferences to defaults?',
    positiveText: 'Reset',
    negativeText: 'Cancel',
    onPositiveClick: () => {
      prefs.reset()
      message.success('Reset')
    },
  })
}
</script>

<style scoped lang="sass">
.preferences-page
  padding: 1rem 1.5rem
</style>

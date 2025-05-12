import { lightTheme, darkTheme } from 'naive-ui'

export const useThemeStore = defineStore('theme', () => {
  const theme = useColorMode({
    storageKey: 'flaredrive:color-mode',
  })

  watch(
    theme,
    (newTheme) => {
      console.info('Theme changed', {
        value: newTheme,
        state: theme.state.value,
        store: theme.store.value,
        system: theme.system.value,
      })
    },
    { immediate: true }
  )

  const resolvedTheme = computed(() => theme.value)
  const rawTheme = computed(() => theme.store.value)

  function setTheme(newTheme: 'light' | 'dark' | 'auto') {
    theme.value = newTheme
  }
  const naiveUiTheme = computed(() => {
    return theme.value === 'dark' ? darkTheme : lightTheme
  })

  return { theme, resolvedTheme, rawTheme, setTheme, naiveUiTheme }
})

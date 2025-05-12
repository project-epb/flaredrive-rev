import { lightTheme, darkTheme } from 'naive-ui'

export const useThemeStore = defineStore('theme', () => {
  const theme = useColorMode({})

  function setTheme(newTheme: 'light' | 'dark' | 'auto') {
    theme.value = newTheme
  }
  const naiveUiTheme = computed(() => {
    return theme.value === 'dark' ? darkTheme : lightTheme
  })

  return { theme, setTheme, naiveUiTheme }
})

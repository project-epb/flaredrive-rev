export default defineNuxtPlugin(() => {
  const colorMode = useColorMode()

  const apply = () => {
    const isDark = colorMode.value === 'dark'

    // Tailwind (darkMode: 'class') + our CSS variables rely on `.dark`
    document.documentElement.classList.toggle('dark', isDark)

    // Let the browser render built-in controls appropriately
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
  }

  watch(() => colorMode.value, apply, { immediate: true })
})

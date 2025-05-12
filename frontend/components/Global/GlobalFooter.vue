<template lang="pug">
NLayoutFooter.global-footer(bordered)
  div(w-1200px, max-w='[calc(100vw-2rem)]', m-x-auto, p-t-6, p-b-8)
    NP Copyright © {{ date.getFullYear() }} FlareDrive
</template>

<script setup lang="ts">
const date = useNow()
</script>

<style scoped lang="sass"></style>

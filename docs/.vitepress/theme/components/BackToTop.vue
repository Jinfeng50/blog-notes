<script setup lang="ts">
import { inBrowser, useRoute } from 'vitepress'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { watch } from 'vue'

const visible = ref(false)
const route = useRoute()

const updateVisible = () => {
  if (!inBrowser) return
  visible.value = window.scrollY > 600
}

const backToTop = () => {
  if (!inBrowser) return
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  updateVisible()
  window.addEventListener('scroll', updateVisible, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', updateVisible)
})

watch(() => route.path, () => {
  visible.value = false
  if (inBrowser) window.requestAnimationFrame(updateVisible)
})
</script>

<template>
  <button
    v-show="visible"
    class="back-to-top"
    type="button"
    aria-label="返回顶部"
    @click="backToTop"
  >
    ↑
  </button>
</template>

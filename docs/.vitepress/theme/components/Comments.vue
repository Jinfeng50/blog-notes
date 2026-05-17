<script setup lang="ts">
import { inBrowser, useData, useRoute } from 'vitepress'
import { nextTick, onMounted, ref, watch } from 'vue'

const container = ref<HTMLElement | null>(null)
const route = useRoute()
const { frontmatter, isDark } = useData()

const utterancesTheme = () => (isDark.value ? 'github-dark' : 'github-light')

const shouldShowComments = () => {
  if (frontmatter.value.comments === false) return false
  return route.path !== '/'
}

const loadComments = async () => {
  if (!inBrowser || !container.value || !shouldShowComments()) return

  await nextTick()
  container.value.innerHTML = ''

  const script = document.createElement('script')
  script.src = 'https://utteranc.es/client.js'
  script.async = true
  script.crossOrigin = 'anonymous'
  script.setAttribute('repo', 'Jinfeng50/blog-notes')
  script.setAttribute('issue-term', 'pathname')
  script.setAttribute('label', 'comment')
  script.setAttribute('theme', utterancesTheme())

  container.value.appendChild(script)
}

const updateTheme = () => {
  const iframe = document.querySelector<HTMLIFrameElement>('.utterances-frame')
  iframe?.contentWindow?.postMessage(
    { type: 'set-theme', theme: utterancesTheme() },
    'https://utteranc.es'
  )
}

onMounted(loadComments)
watch(() => route.path, loadComments)
watch(isDark, updateTheme)
</script>

<template>
  <div v-if="shouldShowComments()" ref="container" class="comments" />
</template>

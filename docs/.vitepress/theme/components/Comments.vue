<script setup lang="ts">
import { inBrowser, useData, useRoute } from 'vitepress'
import { nextTick, onMounted, ref, watch } from 'vue'

const container = ref<HTMLElement | null>(null)
const loaded = ref(false)
const loading = ref(false)
const failed = ref(false)
let activePath = ''
const route = useRoute()
const { frontmatter, isDark } = useData()

const utterancesTheme = () => (isDark.value ? 'github-dark' : 'github-light')

const shouldShowComments = () => {
  if (frontmatter.value.comments === false) return false
  return route.path.startsWith('/notes/') && route.path !== '/notes/'
}

const loadComments = async () => {
  if (!inBrowser || !container.value || !shouldShowComments()) return

  activePath = route.path

  await nextTick()
  if (!container.value || activePath !== route.path) return

  container.value.innerHTML = ''
  loaded.value = false
  failed.value = false
  loading.value = true

  const script = document.createElement('script')
  script.src = 'https://utteranc.es/client.js'
  script.async = true
  script.crossOrigin = 'anonymous'
  script.setAttribute('repo', 'Jinfeng50/blog-notes')
  script.setAttribute('issue-term', 'pathname')
  script.setAttribute('label', 'comment')
  script.setAttribute('theme', utterancesTheme())
  script.addEventListener('load', () => {
    if (activePath !== route.path) return

    loaded.value = true
    loading.value = false
  })
  script.addEventListener('error', () => {
    if (activePath !== route.path) return

    failed.value = true
    loading.value = false
  })

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
  <section v-if="shouldShowComments()" class="comments">
    <div class="comments-head">
      <div>
        <p>讨论</p>
        <h2>评论区</h2>
      </div>
      <a href="https://github.com/apps/utterances" target="_blank" rel="noreferrer">
        GitHub 登录后评论
      </a>
    </div>
    <p v-if="failed" class="comments-hint error">
      评论加载失败，请检查网络或确认 utterances 已授权当前仓库。
    </p>
    <p v-else-if="loading" class="comments-hint">
      正在加载 GitHub 评论…
    </p>
    <p v-else-if="!loaded" class="comments-hint">
      评论由 GitHub Issues 驱动。首次评论前，请先确认仓库已安装并授权 utterances。
    </p>
    <div ref="container" />
  </section>
</template>

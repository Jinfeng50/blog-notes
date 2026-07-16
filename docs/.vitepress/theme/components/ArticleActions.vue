<script setup lang="ts">
import { inBrowser, useRoute } from 'vitepress'
import { computed, ref } from 'vue'
import { data as posts } from '../posts.data'

const route = useRoute()
const copied = ref(false)

const editUrl = () => {
  const path = route.path.replace(/^\//, '').replace(/\/$/, '/index')
  return `https://github.com/Jinfeng50/blog-notes/edit/main/docs/${path}.md`
}

const isArticlePage = () => route.path.startsWith('/notes/') && route.path !== '/notes/'

const relatedPosts = computed(() => {
  const current = posts.find((post) => post.url === route.path)
  const currentTags = new Set(current?.tags ?? [])

  return posts
    .filter((post) => post.url !== route.path)
    .map((post) => ({
      ...post,
      score: post.tags.filter((tag) => currentTags.has(tag)).length
    }))
    .sort((a, b) => b.score - a.score || b.date.localeCompare(a.date))
    .slice(0, 2)
})

const copyLink = async () => {
  if (!inBrowser) return

  await navigator.clipboard?.writeText(window.location.href)
  copied.value = true
  window.setTimeout(() => {
    copied.value = false
  }, 1600)
}
</script>

<template>
  <section v-if="isArticlePage()" class="article-actions">
    <div class="article-actions-head">
      <div>
        <p>继续探索</p>
        <h2>这篇笔记有帮助吗？</h2>
      </div>
      <div class="article-action-links">
        <button type="button" @click="copyLink">
          {{ copied ? '已复制' : '复制链接' }}
        </button>
        <a href="/notes/">全部笔记</a>
        <a href="/tags">相关标签</a>
        <a :href="editUrl()" target="_blank" rel="noreferrer">编辑本文</a>
      </div>
    </div>

    <div v-if="relatedPosts.length" class="related-posts">
      <a v-for="post in relatedPosts" :key="post.url" :href="post.url">
        <span>{{ post.title }}</span>
        <small>{{ post.summary }}</small>
      </a>
    </div>
  </section>
</template>

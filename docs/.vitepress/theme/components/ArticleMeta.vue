<script setup lang="ts">
import { useData, useRoute } from 'vitepress'
import { computed } from 'vue'
import { tagSlug } from '../content'
import { data as posts } from '../posts.data'

const { frontmatter, page } = useData()
const route = useRoute()

const readingTime = computed(() => {
  const post = posts.find((item) => item.url === route.path)
  const wordCount = post?.wordCount ?? page.value?.frontmatter?.wordCount
  if (typeof wordCount === 'number') return `${Math.max(1, Math.ceil(wordCount / 400))} 分钟阅读`
  return '短文'
})

const tagLink = (tag: string) => `/tags#${tagSlug(tag)}`
</script>

<template>
  <div
    v-if="frontmatter.summary || frontmatter.tags?.length"
    class="article-meta"
  >
    <p v-if="frontmatter.summary" class="article-summary">
      {{ frontmatter.summary }}
    </p>
    <div v-if="frontmatter.tags?.length" class="article-tags">
      <a v-for="tag in frontmatter.tags" :key="tag" class="article-tag" :href="tagLink(tag)">
        # {{ tag }}
      </a>
      <span class="article-tag muted">{{ readingTime }}</span>
    </div>
  </div>
</template>

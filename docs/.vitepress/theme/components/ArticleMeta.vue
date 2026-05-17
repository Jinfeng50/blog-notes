<script setup lang="ts">
import { useData } from 'vitepress'
import { computed } from 'vue'

const { frontmatter, page } = useData()

const readingTime = computed(() => {
  const wordCount = page.value?.frontmatter?.wordCount
  if (typeof wordCount === 'number') return `${Math.max(1, Math.ceil(wordCount / 400))} 分钟阅读`
  return '短文'
})
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
      <span v-for="tag in frontmatter.tags" :key="tag" class="article-tag">
        # {{ tag }}
      </span>
      <span class="article-tag muted">{{ readingTime }}</span>
    </div>
  </div>
</template>

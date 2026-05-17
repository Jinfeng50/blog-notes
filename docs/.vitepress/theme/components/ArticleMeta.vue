<script setup lang="ts">
import { useData } from 'vitepress'

const { frontmatter } = useData()
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
    </div>
  </div>
</template>

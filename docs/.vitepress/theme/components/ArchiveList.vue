<script setup lang="ts">
import { computed } from 'vue'
import { data as posts } from '../posts.data'

const groups = computed(() => {
  const result = new Map<string, typeof posts>()
  for (const post of posts) {
    const key = post.date.slice(0, 7)
    result.set(key, [...(result.get(key) ?? []), post])
  }
  return [...result.entries()]
})
</script>

<template>
  <div v-if="groups.length" class="archive-list">
    <section v-for="[month, monthPosts] in groups" :key="month" class="archive-group">
      <h2>{{ month }}</h2>
      <a v-for="post in monthPosts" :key="post.url" :href="post.url" class="archive-row">
        <time :datetime="post.date">{{ post.date.slice(8) }}</time>
        <span>
          <strong>{{ post.title }}</strong>
          <small>{{ post.summary }}</small>
        </span>
      </a>
    </section>
  </div>
  <p v-else class="content-empty">暂时还没有可归档的文章。</p>
</template>

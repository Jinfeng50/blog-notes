<script setup lang="ts">
import { computed } from 'vue'
import { tagSlug } from '../content'
import { data as posts } from '../posts.data'

const groups = computed(() => {
  const result = new Map<string, typeof posts>()
  for (const post of posts) {
    for (const tag of post.tags) result.set(tag, [...(result.get(tag) ?? []), post])
  }
  return [...result.entries()].sort(([a], [b]) => a.localeCompare(b, 'zh-CN'))
})
</script>

<template>
  <template v-if="groups.length">
    <nav class="tag-cloud" aria-label="全部标签">
      <a v-for="[tag, tagPosts] in groups" :key="tag" :href="`#${tagSlug(tag)}`">
        {{ tag }} <small>{{ tagPosts.length }}</small>
      </a>
    </nav>

    <section v-for="[tag, tagPosts] in groups" :id="tagSlug(tag)" :key="tag" class="tag-group">
      <h2>{{ tag }}</h2>
      <a v-for="post in tagPosts" :key="post.url" :href="post.url" class="tag-post">
        <strong>{{ post.title }}</strong>
        <span>{{ post.date }}</span>
      </a>
    </section>
  </template>
  <p v-else class="content-empty">暂时还没有文章标签。</p>
</template>

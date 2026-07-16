<script setup lang="ts">
import type { Post } from '../posts.data'

withDefaults(defineProps<{
  posts: Post[]
  featuredFirst?: boolean
}>(), {
  featuredFirst: false
})
</script>

<template>
  <div v-if="posts.length" class="post-rows">
    <a
      v-for="(post, index) in posts"
      :key="post.url"
      class="post-row"
      :class="{ featured: featuredFirst && index === 0 }"
      :href="post.url"
    >
      <time :datetime="post.date">{{ post.date }}</time>
      <div>
        <h3>{{ post.title }}</h3>
        <p>{{ post.summary }}</p>
        <div class="post-tags">
          <span v-for="tag in post.tags" :key="tag">{{ tag }}</span>
        </div>
      </div>
      <span aria-hidden="true">↗</span>
    </a>
  </div>
  <p v-else class="content-empty">暂时还没有公开文章。</p>
</template>

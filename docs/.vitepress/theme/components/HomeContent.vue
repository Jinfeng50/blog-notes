<script setup lang="ts">
import { computed } from 'vue'
import { data as posts } from '../posts.data'
import PostRows from './PostRows.vue'

const tagCount = computed(() => new Set(posts.flatMap((post) => post.tags)).size)
</script>

<template>
  <section class="home-lab">
    <div class="profile-card">
      <div>
        <p class="eyebrow">正在整理</p>
        <h2>把工程里的经验，写成以后能直接复用的笔记。</h2>
        <p>这里不会追求大而全，更关注真实问题的定位、修复、复盘和长期维护。</p>
      </div>
      <div class="profile-stats">
        <span><strong>{{ posts.length }}</strong> 篇笔记</span>
        <span><strong>{{ tagCount }}</strong> 个标签</span>
        <span><strong>持续</strong> 更新</span>
      </div>
    </div>

    <nav class="topic-strip" aria-label="内容索引">
      <a href="/notes/">全部笔记</a>
      <a href="/archive">时间归档</a>
      <a href="/tags">标签索引</a>
      <a href="/projects">项目实践</a>
      <a href="/about">关于本站</a>
    </nav>
  </section>

  <section class="home-posts">
    <div class="home-section-head">
      <p class="eyebrow">最新内容</p>
      <h2>最近发布</h2>
      <p>像技术日志一样记录上下文、命令、取舍和结论，方便以后快速回到现场。</p>
    </div>
    <PostRows :posts="posts" featured-first />
  </section>
</template>

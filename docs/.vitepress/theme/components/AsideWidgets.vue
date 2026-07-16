<script setup lang="ts">
import { useData, useRoute } from 'vitepress'
import { data as posts } from '../posts.data'

const route = useRoute()
const { page } = useData()
const now = new Date()
const year = now.getFullYear()
const month = now.getMonth()
const today = now.getDate()

const monthLabel = new Intl.DateTimeFormat('zh-CN', {
  month: 'long',
  year: 'numeric'
}).format(now)

const firstDay = new Date(year, month, 1).getDay()
const daysInMonth = new Date(year, month + 1, 0).getDate()
const calendarDays = [
  ...Array.from({ length: firstDay }, () => ''),
  ...Array.from({ length: daysInMonth }, (_, index) => String(index + 1))
]

const indexes = [
  { text: '全部笔记', link: '/notes/' },
  { text: '时间归档', link: '/archive' },
  { text: '标签索引', link: '/tags' },
  { text: '项目实践', link: '/projects' },
  { text: '关于本站', link: '/about' }
]

const latestPosts = posts.slice(0, 3)

const issueUrl = () => {
  const issueTitle = encodeURIComponent(route.path)
  return `https://github.com/Jinfeng50/blog-notes/issues?q=${issueTitle}`
}

const isArticlePage = () => route.path.startsWith('/notes/') && route.path !== '/notes/'
</script>

<template>
  <div class="aside-widgets">
    <section class="aside-widget">
      <h3>快速入口</h3>
      <a
        v-for="item in indexes"
        :key="item.link"
        class="aside-link"
        :href="item.link"
      >
        <span>{{ item.text }}</span>
      </a>
    </section>

    <section class="aside-widget">
      <h3>最新文章</h3>
      <a
        v-for="item in latestPosts"
        :key="item.url"
        class="aside-link aside-post"
        :href="item.url"
      >
        <span>{{ item.title }}</span>
        <small>{{ item.tags.slice(0, 2).join(' / ') }}</small>
      </a>
    </section>

    <section v-if="isArticlePage()" class="aside-widget">
      <h3>本文评论</h3>
      <a class="aside-link" :href="issueUrl()" target="_blank" rel="noreferrer">
        查看《{{ page.title }}》的讨论
      </a>
    </section>

    <section class="aside-widget">
      <h3>{{ monthLabel }}</h3>
      <div class="calendar-grid calendar-weekdays">
        <span v-for="day in ['日', '一', '二', '三', '四', '五', '六']" :key="day">{{ day }}</span>
      </div>
      <div class="calendar-grid">
        <span
          v-for="(day, index) in calendarDays"
          :key="`${day}-${index}`"
          :class="{ today: Number(day) === today }"
        >
          {{ day }}
        </span>
      </div>
    </section>
  </div>
</template>

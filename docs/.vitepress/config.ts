import { defineConfig } from 'vitepress'

export default defineConfig( {
  lang: 'zh-CN',
  base: '/',
  title: '金锋笔记',
  description: '技术笔记、想法和实践记录',

  cleanUrls: true,
  lastUpdated: true,
  markdown: {
    lineNumbers: true
  },

  head: [
    ['link', { rel: 'icon', href: '/favicon.svg' }]
  ],

  themeConfig: {
    logo: '/favicon.svg',

    nav: [
      { text: '笔记', link: '/notes/' },
      { text: '项目', link: '/projects' },
      { text: '关于', link: '/about' }
    ],

    sidebar: {
      '/notes/': [
        {
          text: '笔记',
          items: [
            { text: '全部笔记', link: '/notes/' },
            { text: 'Git', link: '/notes/git' },
            { text: 'Linux', link: '/notes/linux' },
            { text: 'AI', link: '/notes/ai' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/jinfeng50' }
    ],

    search: {
      provider: 'local'
    },

    outline: {
      level: [2, 3],
      label: '本文目录'
    },

    docFooter: {
      prev: '上一篇',
      next: '下一篇'
    },

    lastUpdated: {
      text: '最后更新',
      formatOptions: {
        dateStyle: 'medium',
        timeStyle: 'short'
      }
    }
  }
})

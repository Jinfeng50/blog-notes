import { defineConfig } from 'vitepress'

export default defineConfig( {
  base: '/',
  title: 'Jinfeng Notes',
  description: 'Personal technical notes and essays',

  cleanUrls: true,
  lastUpdated: true,

  head: [
    ['link', { rel: 'icon', href: '/favicon.svg' }]
  ],

  themeConfig: {
    logo: '/favicon.svg',

    nav: [
      { text: 'Notes', link: '/notes/' },
      { text: 'Projects', link: '/projects' },
      { text: 'About', link: '/about' }
    ],

    sidebar: {
      '/notes/': [
        {
          text: 'Notes',
          items: [
            { text: 'Index', link: '/notes/' },
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
      label: 'On this page'
    },

    docFooter: {
      prev: 'Previous',
      next: 'Next'
    },

    lastUpdated: {
      text: 'Updated at',
      formatOptions: {
        dateStyle: 'medium',
        timeStyle: 'short'
      }
    }
  }
})

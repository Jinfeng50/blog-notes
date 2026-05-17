import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import ArticleMeta from './components/ArticleMeta.vue'
import AsideWidgets from './components/AsideWidgets.vue'
import Comments from './components/Comments.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('ArticleMeta', ArticleMeta)
    app.component('AsideWidgets', AsideWidgets)
    app.component('Comments', Comments)
  },
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'doc-before': () => h(ArticleMeta),
      'aside-outline-after': () => h(AsideWidgets),
      'doc-after': () => h(Comments)
    })
  }
}

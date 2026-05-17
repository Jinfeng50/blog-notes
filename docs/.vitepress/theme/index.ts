import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import Comments from './components/Comments.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('Comments', Comments)
  },
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'doc-after': () => h(Comments)
    })
  }
}

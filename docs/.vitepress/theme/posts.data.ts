import { createContentLoader } from 'vitepress'

export interface Post {
  title: string
  summary: string
  tags: string[]
  date: string
  url: string
  wordCount: number
}

const normalizeDate = (value: unknown) => {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value ?? '').slice(0, 10)
}

const cleanUrl = (url: string) => url.replace(/\.html$/, '')

const countWords = (source: string) => {
  const body = source
    .replace(/^---[\s\S]*?---/, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/[`#>*_\[\]()|-]/g, ' ')
  const han = body.match(/[\u3400-\u9fff]/g)?.length ?? 0
  const words = body.match(/[A-Za-z0-9][A-Za-z0-9.+/-]*/g)?.length ?? 0
  return han + words
}

export default createContentLoader('notes/*.md', {
  includeSrc: true,
  transform(raw): Post[] {
    return raw
      .filter(({ url }) => cleanUrl(url) !== '/notes/')
      .map(({ url, frontmatter, src }) => ({
        title: String(frontmatter.title),
        summary: String(frontmatter.summary),
        tags: Array.isArray(frontmatter.tags) ? frontmatter.tags.map(String) : [],
        date: normalizeDate(frontmatter.date),
        url: cleanUrl(url),
        wordCount: countWords(src ?? '')
      }))
      .sort((a, b) => b.date.localeCompare(a.date))
  }
})

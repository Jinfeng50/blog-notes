import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = process.cwd()
const notesDir = join(root, 'docs', 'notes')
const requiredFields = ['title', 'summary', 'tags', 'date', 'comments']
const errors = []

const frontmatterOf = (source) => {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  return match?.[1] ?? ''
}

for (const name of readdirSync(notesDir).filter((file) => file.endsWith('.md') && file !== 'index.md')) {
  const file = join(notesDir, name)
  const source = readFileSync(file, 'utf8')
  const frontmatter = frontmatterOf(source)

  if (!frontmatter) {
    errors.push(`${relative(root, file)}: 缺少 frontmatter`)
    continue
  }

  for (const field of requiredFields) {
    const present = field === 'tags'
      ? /^tags:\s*\r?\n(?:\s+-\s+\S+\r?\n?)+/m.test(frontmatter)
      : new RegExp(`^${field}:\\s*\\S+`, 'm').test(frontmatter)
    if (!present) {
      errors.push(`${relative(root, file)}: 缺少 ${field}`)
    }
  }

  const date = frontmatter.match(/^date:\s*(.+)$/m)?.[1]?.trim()
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    errors.push(`${relative(root, file)}: date 必须使用 YYYY-MM-DD`)
  }

  const fileName = name.slice(0, -3)
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fileName)) {
    errors.push(`${relative(root, file)}: 文件名只能使用小写英文、数字和短横线`)
  }
}

if (!existsSync(join(root, 'docs', 'public', 'favicon.svg'))) {
  errors.push('docs/public/favicon.svg: 文件不存在')
}

if (existsSync(join(root, 'docs', 'public', 'sitemap.xml'))) {
  errors.push('docs/public/sitemap.xml: sitemap 已由 VitePress 自动生成，请勿手工维护')
}

if (errors.length) {
  console.error('内容检查失败：\n')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('内容检查通过。')

# Jinfeng 笔记

个人技术博客，使用 VitePress 构建并通过 GitHub Pages 发布到 <https://notes.chenjinfeng.com>。

## 本地开发

```bash
npm ci
npm run dev
```

## 发布前检查

```bash
npm run check
```

该命令会检查文章 frontmatter、文件命名、公共资源和站内链接，并执行生产构建。

## 内容约定

- 公开文章放在 `docs/notes/`。
- 尚未准备公开的草稿放在 `internal/`，该目录不会提交到 Git。
- 新文章从 `templates/article-template.md` 开始。
- 首页、笔记列表、归档、标签、侧栏文章和 sitemap 都根据公开文章自动生成。
- 完整发布步骤参见 [`PUBLISHING.md`](./PUBLISHING.md)。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 启动本地开发服务器 |
| `npm run check:content` | 检查文章元数据和资源约定 |
| `npm run build` | 检查内容并构建生产站点 |
| `npm run check` | 完整发布前检查 |
| `npm run preview` | 预览生产构建结果 |

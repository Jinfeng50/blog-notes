# 博客文章发布流程

这份文档是本仓库公开文章的标准发布流程。公开文章放在 `docs/notes/`，未完成或不准备公开的内容放在 `internal/`。

## 1. 同步仓库

开始写作前确认当前分支和工作区状态：

```bash
git status
git pull --ff-only origin main
npm ci
```

如果工作区已有未提交内容，先确认这些改动属于哪项工作，不要直接覆盖或删除。

## 2. 创建文章

从文章模板创建新文件：

```powershell
Copy-Item templates/article-template.md docs/notes/my-new-article.md
```

文件名只能使用小写英文、数字和短横线，例如：

```text
git-rebase-guide.md
linux-port-debug.md
pi05-libero-baseline.md
```

不要在文件名中使用空格、中文、下划线或特殊符号。文件名会成为文章 URL。

## 3. 填写 frontmatter

每篇公开文章必须包含：

```yaml
---
title: 清晰、具体的文章标题
summary: 一两句话说明文章解决的问题和读者能获得的内容。
tags:
  - 主题一
  - 主题二
date: 2026-07-16
comments: true
---
```

字段规则：

- `title`：页面标题和文章列表标题。
- `summary`：首页、归档和相关文章中的摘要。
- `tags`：建议 2 至 5 个，优先复用已有标签。
- `date`：首次公开日期，必须使用 `YYYY-MM-DD`。
- `comments`：是否显示 GitHub utterances 评论区。

发布后如只修改错别字或补充内容，通常保留原始 `date`。文章标题、摘要、标签或日期变化后，相关页面会在构建时自动更新。

## 4. 编写正文

建议按以下顺序组织技术文章：

1. 背景：为什么需要解决这个问题。
2. 结论：先给出最终结果和关键判断。
3. 环境：操作系统、运行时、依赖和版本。
4. 过程：命令、配置、实现步骤和决策依据。
5. 验证：如何确认结果正确。
6. 踩坑：现象、根因、修复和预防方法。
7. 参考：保留官方文档或原始资料链接。

命令必须标明适用环境。删除、覆盖、重置权限等高风险命令必须说明影响范围。不要写入 token、密钥、Cookie、内网地址、个人联系方式或客户数据。

## 5. 添加图片和视频

文章资源放在独立目录：

```text
docs/public/media/my-new-article/
```

Markdown 中使用站点绝对路径：

```md
![图片说明](/media/my-new-article/example.webp)
```

视频示例：

```html
<video controls muted playsinline preload="metadata" width="100%">
  <source src="/media/my-new-article/demo.mp4" type="video/mp4">
</video>
```

提交前压缩图片和视频，并检查截图中是否包含敏感信息。不要提交与文章无关的原始大文件。

## 6. 本地预览

启动开发服务器：

```bash
npm run dev
```

重点检查：

- 标题、摘要、日期和标签是否正确。
- 首页、全部笔记、归档和标签页是否出现新文章。
- 文章目录、代码块、表格、图片和视频是否正常。
- 深色模式和移动端宽度是否可读。
- 评论区是否只在需要评论的文章中显示。
- 所有站内和外部链接是否能打开。

这些入口不需要手工修改，都会根据文章 frontmatter 自动生成：

- 首页最新文章
- `/notes/` 全部笔记
- `/archive` 时间归档
- `/tags` 标签索引
- 侧栏最新文章
- 文末相关文章
- `sitemap.xml`

## 7. 运行发布检查

```bash
npm run check
```

该命令会检查：

- 公开文章是否包含全部必填 frontmatter。
- 日期和文件名格式是否正确。
- favicon 和 sitemap 配置是否符合约定。
- Markdown 和站内链接是否有效。
- VitePress 生产构建是否成功。

检查失败时不要推送。根据输出修正问题后重新运行，直到命令成功。

## 8. 审查改动

```bash
git status
git diff --check
git diff
```

确认只包含本次文章、相关媒体和必要配置。特别检查是否误提交：

- `internal/` 草稿。
- `.env`、密钥或登录信息。
- 构建产物 `docs/.vitepress/dist/`。
- 缓存和临时文件。
- 不必要的大型媒体文件。

## 9. 提交和推送

普通文章可以直接提交到 `main`：

```bash
git add docs/notes/my-new-article.md docs/public/media/my-new-article
git commit -m "docs: add my new article"
git push origin main
```

如果文章没有媒体目录，只添加文章文件。大规模重写或高风险教程建议使用独立分支和 Pull Request：

```bash
git switch -c docs/my-new-article
git add docs/notes/my-new-article.md
git commit -m "docs: add my new article"
git push -u origin docs/my-new-article
```

## 10. 检查部署

推送到 `main` 后，GitHub Actions 会自动执行：

```text
npm ci -> npm run build -> GitHub Pages deploy
```

在仓库的 Actions 页面确认 `Deploy VitePress site to Pages` 成功，然后打开：

```text
https://notes.chenjinfeng.com/notes/my-new-article
```

线上再次检查文章、媒体、评论、搜索和移动端显示。部署存在短暂缓存时，可以等待片刻后强制刷新。

## 11. 修改、重命名和删除

修改正文后重新执行：

```bash
npm run check
git diff
```

重命名文章会改变 URL。必须全仓库搜索旧路径，并评估外部链接是否需要保留跳转：

```bash
rg "old-article-name"
```

删除公开文章时删除 Markdown 和专属媒体目录即可。首页、索引、归档、标签、侧栏和 sitemap 会自动移除该文章，但仍应运行 `npm run check` 确认没有正文链接继续引用旧 URL。

## 12. 回滚线上问题

发布后出现严重问题时优先使用 `git revert`，保留完整历史：

```bash
git log --oneline
git revert <commit-hash>
git push origin main
```

不要对已经公开的 `main` 分支执行强制推送或随意重写历史。

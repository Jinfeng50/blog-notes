---
summary: 记录 Git 日常使用中最常见的撤销、远端查看和协作命令。
tags:
  - Git
  - 工程效率
  - 版本控制
---

# Git 工作流笔记

## 撤销最近一次提交

保留工作区改动：

```bash
git reset --soft HEAD~1
```

丢弃工作区改动：

```bash
git reset --hard HEAD~1
```

## 查看远端仓库

```bash
git remote -v
```

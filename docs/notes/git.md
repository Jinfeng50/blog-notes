---
summary: 记录 Git 日常使用中最常见的撤销、远端查看和协作命令。
tags:
  - Git
  - 工程效率
  - 版本控制
---

# Git Notes

## Undo last commit

Keep changes:

```bash
git reset --soft HEAD~1
```

Drop changes:

```bash
git reset --hard HEAD~1
```

## View remote

```bash
git remote -v
```

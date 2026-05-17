---
summary: 记录 Git 日常使用中最常见的撤销、远端查看和协作命令。
tags:
  - Git
  - 工程效率
  - 版本控制
---

# Git 工作流笔记

> 目标不是记住所有命令，而是在需要回滚、对齐远端或清理历史时能快速找到安全做法。

| 场景 | 推荐命令 | 说明 |
| --- | --- | --- |
| 保留改动撤销提交 | `git reset --soft HEAD~1` | 适合重新组织提交 |
| 丢弃最近提交 | `git reset --hard HEAD~1` | 会删除工作区改动，谨慎使用 |
| 查看远端 | `git remote -v` | 检查 fetch / push 地址 |

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

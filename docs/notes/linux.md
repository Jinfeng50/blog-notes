---
summary: 整理 Linux 排障中常用的端口检查、进程定位和快速处理命令。
tags:
  - Linux
  - 排障
  - 命令行
---

# Linux 排障笔记

## 检查端口

```bash
lsof -i :3000
```

## 结束进程

```bash
kill -9 PID
```

# Workflow Deploy Unblock Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 停用质量门禁的自动触发，并让 Cloudflare Pages 与 GitHub Pages 部署在主分支 push 时直接执行。

**Architecture:** 保留现有三个 workflow 文件，只调整触发器与少量事件上下文变量。部署流程本身不变，质量门禁保留为手动工作流以便需要时单独执行。

**Tech Stack:** GitHub Actions workflow YAML, Vite build, Cloudflare Pages, GitHub Pages

---

### Task 1: 停用 Quality Gate 自动触发

**Files:**
- Modify: `.github/workflows/quality-gate.yml`

**Step 1: 写出最小改动**

- 删除 `pull_request`
- 删除 `push`
- 删除 `schedule`
- 保留 `workflow_dispatch`

**Step 2: 校对触发范围**

确认文件只剩手动触发入口，没有隐含自动运行条件。

**Step 3: 保存变更**

不修改 job 内容，仅修改 `on:` 段。

### Task 2: 解除 Cloudflare 部署对 Quality Gate 的依赖

**Files:**
- Modify: `.github/workflows/deploy-cloudflare.yml`

**Step 1: 修改触发器**

- 删除 `workflow_run`
- 增加：

```yml
on:
  push:
    branches: [main, master]
  workflow_dispatch:
```

**Step 2: 删除旧条件**

- 删除仅针对 `workflow_run` 的 job `if`

**Step 3: 收敛事件变量**

- 将 `TARGET_SHA` 改为 `${{ github.sha }}`
- 将 `TARGET_BRANCH` 改为 `${{ github.ref_name }}`

### Task 3: 解除 GitHub Pages 部署对 Quality Gate 的依赖

**Files:**
- Modify: `.github/workflows/deploy-pages.yml`

**Step 1: 修改触发器**

- 删除 `workflow_run`
- 增加：

```yml
on:
  push:
    branches: [main, master]
  workflow_dispatch:
```

**Step 2: 删除旧条件**

- 删除仅针对 `workflow_run` 的 build job `if`

**Step 3: 收敛事件变量**

- 将 `TARGET_SHA` 改为 `${{ github.sha }}`

### Task 4: 验证 workflow 语法与依赖关系

**Files:**
- Verify: `.github/workflows/quality-gate.yml`
- Verify: `.github/workflows/deploy-cloudflare.yml`
- Verify: `.github/workflows/deploy-pages.yml`

**Step 1: 运行 YAML 解析校验**

使用 PowerShell 对三个 workflow 执行 `ConvertFrom-Yaml`。

**Step 2: 检查依赖是否已移除**

确认部署 workflow 中不再出现 `workflow_run` 和 `Quality Gate` 依赖。

**Step 3: 查看 git diff**

确认改动仅集中在触发器、条件和事件变量。

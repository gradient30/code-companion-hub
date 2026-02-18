# AI Helper 部署指南

> 本指南适用于将 AI Helper 部署到 **GitHub Pages** 或 **Cloudflare Pages**。  
> 项目已内置完整的 CI/CD 工作流，推送代码即可自动部署。

---

## 目录

- [前置条件](#前置条件)
- [方案一：GitHub Pages](#方案一github-pages)
- [方案二：Cloudflare Pages](#方案二cloudflare-pages)
- [环境变量说明](#环境变量说明)
- [常见问题](#常见问题)

---

## 前置条件

两种方案都需要：

1. 已将本项目连接到 GitHub 仓库（Lovable → Settings → GitHub → Connect）
2. 准备好以下两个值（来自项目根目录 `.env` 文件）：

   | 变量名 | 示例值 |
   |--------|--------|
   | `VITE_SUPABASE_URL` | `https://cllruxedtdvkljmggnxd.supabase.co` |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | `eyJhbGciOiJIUzI1NiIs...` |

   > 这两个是客户端公开变量（anon key），无需保密，但放入 GitHub Secrets 可避免明文出现在代码中。

---

## 方案一：GitHub Pages

### 步骤 1 — 确认仓库名

GitHub Pages 的访问地址格式为：

```
https://<你的用户名>.github.io/<仓库名>/
```

**⚠️ 重要**：工作流中已将 `VITE_BASE_URL` 设置为 `/ai-helper/`。  
如果你的 GitHub 仓库名**不是** `ai-helper`，必须修改以下两处：

**文件 1**：`.github/workflows/deploy-pages.yml` 第 35 行
```yaml
VITE_BASE_URL: /你的仓库名/   # ← 改为实际仓库名
```

**文件 2**：`public/404.html` 第 9 行
```javascript
var base = '/你的仓库名';   // ← 改为实际仓库名（不加结尾斜杠）
```

### 步骤 2 — 添加 GitHub Secrets

进入 GitHub 仓库页面：

```
仓库 → Settings → Secrets and variables → Actions → New repository secret
```

依次添加以下 2 个 Secret：

| Secret 名称 | 值 |
|-------------|-----|
| `VITE_SUPABASE_URL` | 你的 Supabase URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | 你的 Supabase anon key |

### 步骤 3 — 开启 GitHub Pages

```
仓库 → Settings → Pages → Build and deployment → Source → 选择 "GitHub Actions"
```

### 步骤 4 — 触发部署

推送任意代码到 `main` 或 `master` 分支，或在 GitHub 仓库页面手动触发：

```
仓库 → Actions → Deploy to GitHub Pages → Run workflow
```

### 验收检查

- [ ] Actions 运行成功（绿色 ✅）
- [ ] 访问 `https://<用户名>.github.io/<仓库名>/` 能正常打开
- [ ] 刷新非根路径（如 `/providers`）不出现 404
- [ ] 能正常登录（说明 Supabase 环境变量注入成功）

---

## 方案二：Cloudflare Pages

### 步骤 1 — 获取 Cloudflare API Token

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 右上角头像 → **My Profile** → **API Tokens** → **Create Token**
3. 使用模板 **"Edit Cloudflare Workers"** 或自定义，权限至少包含：
   - `Account` → `Cloudflare Pages` → `Edit`
4. 创建后复制 Token（**只显示一次**）

### 步骤 2 — 获取 Account ID

在 Cloudflare Dashboard 右侧栏可以找到 **Account ID**，复制备用。

### 步骤 3 — 在 Cloudflare Dashboard 创建 Pages 项目

```
Cloudflare Dashboard → Workers & Pages → Create → Pages → Direct Upload
```

- **Project name 填写**：`ai-helper`（必须与工作流中 `--project-name=ai-helper` 完全一致）
- 上传随意，后续 CI 会覆盖

### 步骤 4 — 添加 GitHub Secrets

进入 GitHub 仓库页面：

```
仓库 → Settings → Secrets and variables → Actions → New repository secret
```

依次添加以下 4 个 Secret：

| Secret 名称 | 值 | 来源 |
|-------------|-----|------|
| `CLOUDFLARE_API_TOKEN` | 步骤 1 获取的 Token | Cloudflare |
| `CLOUDFLARE_ACCOUNT_ID` | 步骤 2 获取的 Account ID | Cloudflare |
| `VITE_SUPABASE_URL` | 你的 Supabase URL | 项目 `.env` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | 你的 Supabase anon key | 项目 `.env` |

### 步骤 5 — 触发部署

推送代码到 `main` 或 `master` 分支，或手动触发：

```
仓库 → Actions → Deploy to Cloudflare Pages → Run workflow
```

### 步骤 6 — 绑定自定义域名（可选）

```
Cloudflare Dashboard → Workers & Pages → ai-helper → Custom domains → Add custom domain
```

### 验收检查

- [ ] Actions 运行成功（绿色 ✅）
- [ ] 访问 Cloudflare 分配的 `.pages.dev` 域名能正常打开
- [ ] 刷新任意路径不出现 404（Cloudflare 原生支持 SPA）
- [ ] 能正常登录（说明 Supabase 环境变量注入成功）

---

## 环境变量说明

### 为什么构建时需要注入 Supabase 变量？

本项目连接了 Lovable Cloud 后端。前端代码通过 `import.meta.env.VITE_SUPABASE_URL` 等变量在运行时连接后端。

Vite 在**构建阶段**将 `VITE_*` 变量静态替换到产物中，因此 CI 构建时必须提供这些变量，否则生产包中的值为 `undefined`，导致无法连接后端。

### 变量是否安全？

`VITE_SUPABASE_PUBLISHABLE_KEY` 是 Supabase **anon key**（公开匿名密钥），设计上可以暴露在前端。数据安全由 Supabase 的 Row Level Security (RLS) 策略保证，而非密钥本身。

放入 GitHub Secrets 仅是为了避免密钥明文出现在代码仓库中被 fork 的项目滥用。

---

## 常见问题

### Q: 两个工作流会同时触发吗？

是的，推送 `main` 分支时，两个工作流都会触发。如果只需要一种部署方式，可以删除另一个 workflow 文件。

### Q: GitHub Pages 部署后刷新页面出现 404？

检查：
1. `public/404.html` 中的 `base` 变量是否与仓库名一致
2. `deploy-pages.yml` 中 `VITE_BASE_URL` 是否与仓库名一致（含前后斜杠，如 `/ai-helper/`）

### Q: Cloudflare 部署失败，提示 project not found？

确认在 Cloudflare Dashboard 中已手动创建名为 `ai-helper` 的 Pages 项目（步骤 3），且名称与 workflow 中 `--project-name=ai-helper` 完全一致。

### Q: 登录后无法访问数据？

说明 Supabase 环境变量未正确注入。检查 GitHub Secrets 中是否正确添加了 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_PUBLISHABLE_KEY`，值从项目 `.env` 文件中获取。

### Q: 如何只部署到其中一个平台？

删除不需要的 workflow 文件即可：
- 只用 GitHub Pages：删除 `.github/workflows/deploy-cloudflare.yml`
- 只用 Cloudflare：删除 `.github/workflows/deploy-pages.yml`

---

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `vite.config.ts` | 修改 | 添加 `base: process.env.VITE_BASE_URL \|\| "/"` |
| `public/404.html` | 新建 | GitHub Pages SPA 路由修复（刷新不 404） |
| `index.html` | 修改 | 添加 SPA redirect 路径还原脚本 |
| `.github/workflows/deploy-pages.yml` | 新建 | GitHub Pages CI/CD 工作流 |
| `.github/workflows/deploy-cloudflare.yml` | 新建 | Cloudflare Pages CI/CD 工作流 |
| `DEPLOY_GUIDE.md` | 新建 | 本部署指南 |

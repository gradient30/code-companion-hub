
# AI Helper 部署方案：GitHub Pages + Cloudflare Pages

## 当前项目分析

### 关键发现

1. **项目名称**: `ai-helper`（品牌名，用于命名部署项目）
2. **包管理器**: 同时存在 `bun.lockb` 和 `package-lock.json`，两者都有。工作流需要用 `npm ci`（与参考一致）
3. **`vite.config.ts`**: 当前**没有** `base` 字段，GitHub Pages 部署必须加上动态 base
4. **Router**: 使用 `BrowserRouter`（客户端路由），这是 **SPA** 项目，GitHub Pages 需要额外处理 404 刷新问题（Cloudflare Pages 不需要）
5. **后端依赖**: 项目使用 Lovable Cloud（Supabase），认证 + 数据库均为云端服务，不影响静态部署
6. **Supabase 环境变量**: `.env` 文件中有 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_PUBLISHABLE_KEY`，这些在 CI 构建时必须注入，否则构建后无法连接后端

### SPA 路由刷新问题（重要）

GitHub Pages 不支持客户端路由，刷新非根路径（如 `/providers`）会 404。解决方法：在 `public/` 目录添加 `404.html`，将所有请求重定向到 `index.html`。Cloudflare Pages 原生支持 SPA，不需要此处理。

---

## 需要创建/修改的文件

### 文件一：`vite.config.ts`（修改）

在现有配置基础上加入动态 `base`，保留 `lovable-tagger`（开发时用）、`server` 配置等：

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  // 动态 base：GitHub Pages 需要 /repo-name/，Cloudflare 用 /
  base: process.env.VITE_BASE_URL || "/",
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
```

### 文件二：`public/404.html`（新建，GitHub Pages SPA 路由修复）

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script>
    // GitHub Pages SPA 重定向脚本
    var base = '/ai-helper'; // ← 与仓库名一致
    var l = window.location;
    var path = l.pathname.replace(base, '') || '/';
    l.replace(base + '/?p=' + encodeURIComponent(path) + l.search + l.hash);
  </script>
</head>
<body></body>
</html>
```

同时需要在 `index.html` 的 `<head>` 中添加一段 redirect 解析脚本（标准 GitHub Pages SPA 方案）。

### 文件三：`.github/workflows/deploy-pages.yml`（新建）

针对当前项目的关键修改：
- `VITE_BASE_URL: /ai-helper/`（仓库名需用户确认）
- 注入 Supabase 环境变量（`VITE_SUPABASE_URL`、`VITE_SUPABASE_PUBLISHABLE_KEY`）：这两个值作为 GitHub Secret 存入，否则构建后无法连接后端
- Node.js 20 + `npm ci`

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main, master]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - name: Build
        run: npm run build
        env:
          VITE_BASE_URL: /ai-helper/
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}
      - uses: actions/configure-pages@v4
        with:
          enablement: true
      - uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

### 文件四：`.github/workflows/deploy-cloudflare.yml`（新建）

针对当前项目的关键修改：
- `--project-name=ai-helper`
- 注入 Supabase 环境变量
- `VITE_BASE_URL: /`（Cloudflare 不需要子路径）

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main, master]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - name: Build
        run: npm run build
        env:
          VITE_BASE_URL: /
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}
      - name: Verify secrets
        run: |
          [ -z "${{ secrets.CLOUDFLARE_API_TOKEN }}" ] && echo "Missing CLOUDFLARE_API_TOKEN" && exit 1
          [ -z "${{ secrets.CLOUDFLARE_ACCOUNT_ID }}" ] && echo "Missing CLOUDFLARE_ACCOUNT_ID" && exit 1
          echo "Secrets OK."
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy dist --project-name=ai-helper
```

### 文件五：`DEPLOY_GUIDE.md`（新建，替换 README 中的部署说明）

完整的中文部署指南，包含所有手动步骤说明。

---

## 需要用户手动操作的内容

以下操作**无法由代码自动完成**，将在 `DEPLOY_GUIDE.md` 中详细说明：

### GitHub Pages 方案（4步）
1. 确认 GitHub 仓库名，如不是 `ai-helper` 需修改 workflow 中 `VITE_BASE_URL`
2. 仓库 → Settings → Secrets → 添加 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_PUBLISHABLE_KEY`（值从 Lovable Cloud 的 `.env` 文件获取）
3. 仓库 → Settings → Pages → Source 选 `GitHub Actions`
4. 推送代码触发部署

### Cloudflare Pages 方案（6步）
1. 获取 Cloudflare API Token（Cloudflare Dashboard → API Tokens）
2. 获取 Cloudflare Account ID
3. GitHub Secrets 添加 `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`
4. 同上添加 `VITE_SUPABASE_URL`、`VITE_SUPABASE_PUBLISHABLE_KEY`
5. Cloudflare Dashboard → Pages → Create project（Direct Upload）→ 项目名填 `ai-helper`
6. 推送代码触发部署

---

## 技术细节

### Supabase 环境变量说明

这是本项目与参考老项目最大的区别。本项目连接了 Lovable Cloud 后端，构建时必须有 Supabase 的连接信息（URL 和 Key）。两个值均以 `VITE_` 开头说明是客户端可见的公开变量（anon key），放入 GitHub Secrets 主要是避免明文写在 yml 文件中被 fork 的仓库暴露。

### 仓库名确认

部署 URL 格式为 `https://<username>.github.io/<repo-name>/`，`VITE_BASE_URL` 必须与仓库名完全一致（含大小写）。DEPLOY_GUIDE.md 中会提示用户检查并修改。

---

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `vite.config.ts` | 修改 | 添加 `base: process.env.VITE_BASE_URL \|\| "/"` |
| `public/404.html` | 新建 | GitHub Pages SPA 路由修复 |
| `index.html` | 修改 | 添加 GitHub Pages SPA redirect 解析脚本 |
| `.github/workflows/deploy-pages.yml` | 新建 | GitHub Pages 部署工作流 |
| `.github/workflows/deploy-cloudflare.yml` | 新建 | Cloudflare Pages 部署工作流 |
| `DEPLOY_GUIDE.md` | 新建 | 完整中文部署指南（含所有手动步骤） |

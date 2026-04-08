# Docs Refresh Workbench Design

## Background

`CliGuide`、`SkillsGuide`、`SetupGuide`、`Providers`、`McpServers` 依赖 `src/config/docs-catalog/*.ts` 中的静态文档基线。当前存在三个问题：

1. `SkillsGuide` 和 `SetupGuide` 的 4 个厂商切换按钮未统一成单行共享结构，`OpenCode` 会掉到下一行。
2. 技能帮助和环境配置内容更新依赖人工维护，缺少和“命令手册”同等级的可校验、可刷新流程。
3. 缺少抓取结果保留、差异比对、手动覆盖、删除过时项的工作区，无法持续审阅更新。

## Goals

- 为所有需要更新数据的页面提供统一的 `数据刷新` 工作流。
- 将 `Claude Code / Codex CLI / Gemini CLI / OpenCode` 四个厂商按钮统一为共享头部组件。
- 支持两种刷新来源：
  - 官方文档直抓
  - Firecrawl 手动抓取
- 支持抓取结果持久化、差异审阅、手动覆盖、删除过时数据。
- 让页面运行时显示“仓库基线 + 已发布覆盖层”后的当前有效数据。
- Firecrawl Key 通过 UI 配置并保存，按登录用户隔离。

## Non-Goals

- 第一版不直接回写 `src/config/docs-catalog/*.ts`。
- 第一版不做自动无人值守全量发布。
- 第一版不将所有帮助页面都改造成完整手册页，只给需要更新数据的页面接入统一刷新入口。

## Scope

### Pages

- `src/pages/CliGuide.tsx`
- `src/pages/SkillsGuide.tsx`
- `src/pages/SetupGuide.tsx`
- `src/pages/Providers.tsx`
- `src/pages/McpServers.tsx`

### Baseline Data Sources

- `src/config/docs-catalog/cli.ts`
- `src/config/docs-catalog/skills.ts`
- `src/config/docs-catalog/setup.ts`
- `src/config/docs-catalog/help.ts`
- `src/config/docs-catalog/types.ts`

## Architecture

系统分三层：

1. `Published Baseline`
   - 仓库中的 `docs-catalog` 静态数据。
   - 继续受 `npm run verify:guides` 约束。
2. `Refresh Workspace`
   - Supabase 中保存的用户私有抓取配置、抓取快照、差异、处理动作。
   - 保留所有历史运行，页面刷新后仍可继续处理。
3. `Published Overrides`
   - 发布后的覆盖层，运行时叠加到基线上，生成当前有效数据。

页面读取数据时不直接依赖抓取结果，而是统一走：

`baseline catalog + published overrides -> effective catalog`

这样可以同时保住构建期基线、运行期增量覆盖、以及审阅中的草稿数据。

## Data Model

### `doc_refresh_user_settings`

保存当前登录用户的 Firecrawl 配置。

- `user_id`
- `firecrawl_key_ciphertext`
- `firecrawl_key_mask`
- `firecrawl_last_verified_at`
- `created_at`
- `updated_at`

约束：

- 仅本人可读写。
- UI 只展示掩码和验证时间，不返回明文。

### `doc_refresh_runs`

保存一次刷新任务。

- `id`
- `user_id`
- `source_mode` (`official_fetch` | `firecrawl_manual`)
- `scope` (`cli` | `skills` | `setup` | `help`)
- `page_route`
- `vendor_ids`
- `status` (`queued` | `running` | `partial_success` | `success` | `failed`)
- `summary_counts`
- `started_at`
- `finished_at`
- `error_message`

### `doc_refresh_snapshots`

保存一次 run 的原始与标准化抓取结果。

- `id`
- `run_id`
- `scope`
- `vendor_id`
- `source_url`
- `raw_markdown`
- `normalized_payload`
- `content_hash`
- `created_at`

### `doc_refresh_diff_items`

保存差异记录与人工决策。

- `id`
- `run_id`
- `scope`
- `vendor_id`
- `entity_key`
- `diff_kind` (`added` | `modified` | `stale` | `similar`)
- `baseline_payload`
- `candidate_payload`
- `similarity_score`
- `similar_candidates`
- `review_action` (`replace_all` | `replace_similar` | `delete_old` | `skip`)
- `review_status` (`pending` | `applied` | `dismissed`)
- `resolved_at`

### `doc_catalog_overrides`

保存发布后的覆盖层。

- `id`
- `scope`
- `vendor_id`
- `entity_key`
- `override_type` (`upsert` | `delete`)
- `payload`
- `source_run_id`
- `applied_by`
- `created_at`

## Entity Keys

统一采用稳定 `entity_key`，避免不同来源的抓取结果无法对齐。

- CLI 命令：`cli:{vendor}:{category}:{command}`
- Skills / Setup 条目：`guide:{scope}:{vendor}:{category}:{title}`
- Providers / MCP 帮助元数据：`help:{page}:{field}`

## Refresh Pipeline

### Official Fetch

1. 用户在页面点击 `数据刷新`
2. 选择 `官方直抓`
3. Edge Function 根据页面 scope 和 vendor 拉取官方文档
4. 服务端标准化抓取结果
5. 生成 diff items
6. 保存 run、snapshot、diff
7. 页面显示抓取摘要和待审差异

### Firecrawl Manual Fetch

1. 用户先在 UI 中配置并保存 Firecrawl Key
2. 点击 `数据刷新`
3. 选择 `Firecrawl 手动抓取`
4. Edge Function 读取当前用户保存的 Firecrawl Key
5. 发起抓取、标准化、差异比对
6. 保存本次 run 全量数据
7. 页面恢复并展示最新 run 与上一次处理状态

## Diff Model

### `added`

抓取结果存在，当前有效数据不存在，且没有足够相似的旧项。

### `modified`

`entity_key` 相同，但描述、示例、代码块、验证链接、时间戳等字段存在差异。

### `similar`

没有同 key 条目，但在同 scope、同 vendor 下找到高相似旧项，用于执行“覆盖相似旧数据”。

### `stale`

当前有效数据存在，但本次抓取未发现且无可替代相似项。

## Review Actions

### 覆盖全部

对 `added` / `modified` 写入 `upsert override`。

### 覆盖相似旧数据

对旧条目写入 `delete override`，再对新条目写入 `upsert override`。

### 删除老数据

对 `stale` 条目写入 `delete override`。

### 暂不处理

只记录决策，不写覆盖层。

## UI Design

### Shared Vendor Tabs

新增共享 `VendorGuideTabs` 组件：

- 固定厂商顺序：`Claude Code / Codex CLI / Gemini CLI / OpenCode`
- 桌面端保持单行
- 窄屏改横向滚动，不换行
- 替换 `CliGuide`、`SkillsGuide`、`SetupGuide` 各自重复的 tabs 头部实现

### Shared Refresh Toolbar

新增共享 `DocRefreshToolbar` 组件，挂到所有需要更新数据的页面。

包含：

- `数据刷新`
- `Firecrawl 配置`
- `查看差异`
- 当前生效版本状态
- 最近抓取时间
- 待处理差异数量

### Firecrawl Config Dialog

新增 `FirecrawlConfigDialog`：

- 输入 Key
- 测试连接
- 保存
- 清除
- 展示掩码和最近验证时间

### Diff Workbench

新增 `DocDiffWorkbench`：

- 过滤条件：全部 / 新增 / 变更 / 过时 / 相似 / 已处理 / 未处理
- 差异卡片：当前版本、抓取版本、来源链接、字段差异高亮
- 支持逐条和批量处理

## Permissions

- `doc_refresh_user_settings`、`doc_refresh_runs`、`doc_refresh_snapshots`、`doc_refresh_diff_items` 全部按 `user_id` 做 RLS，仅本人可访问。
- `doc_catalog_overrides` 分为“草案应用”和“全站发布”两级权限。
- 第一版采用维护者角色发布覆盖层，普通用户只能在自己的工作区预览和处理差异。

## Error Handling

- Firecrawl Key 无效：配置弹窗直接失败，不创建 run。
- 抓取超时、403、429、5xx：run 标记为 `failed` 或 `partial_success`，保留已抓取快照。
- 标准化失败：保留原始 markdown，标记为待人工处理，不自动应用。
- 应用覆盖失败：必须事务化，禁止写出半套 override。
- 新 run 不覆盖旧 run；用户始终可回看旧差异。

## Testing Strategy

- 纯函数测试：标准化、相似度匹配、diff 生成、override merge。
- 组件测试：共享 tabs、toolbar、diff workbench、配置弹窗。
- 页面测试：目标页面均出现刷新入口；4 厂商头部保持统一。
- 权限验证：RLS 隔离 Firecrawl 配置和抓取工作区。
- 新增 `verify:docs-refresh` 校验脚本，用于检查 schema、页面接入和数据结构。

## Rollout

### Phase 1

- 抽共享 `VendorGuideTabs`
- 将 4 厂商按钮统一成一行
- 接入共享 `DocRefreshToolbar`

### Phase 2

- 上线 Firecrawl 配置
- 上线 run / snapshot / diff 持久化
- 支持差异审阅，但暂不全站发布

### Phase 3

- 上线 override 发布能力
- 页面运行时叠加 published overrides
- 补齐验证脚本与回归测试

## Open Decisions Already Fixed

- Firecrawl Key 采用用户级服务端保存，不使用浏览器本地长期存储。
- 所有需要更新数据的页面都要接入共享刷新能力，不限于 `SkillsGuide` 和 `SetupGuide`。
- 差异与处理动作必须跨刷新持久化，支持随时回来继续审阅。

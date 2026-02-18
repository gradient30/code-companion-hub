
# 重构导出系统：严格遵循各 CLI 官方格式

## 核心问题诊断

用户上传的导出文件清楚揭示了三大根本性错误：

### 错误一：「模块导出」输出的是原始数据库记录

当前「模块导出」直接把数据库记录序列化，包含大量无意义字段：
```json
{
  "id": "72c78b23-ebd7-42ec-b4b8-7916e549ccb7",       ← 应删除
  "user_id": "101e0418-...",                             ← 应删除
  "created_at": "2026-02-17T14:14:50.511274+00:00",     ← 应删除
  "updated_at": "2026-02-18T03:53:49.185242+00:00"      ← 应删除
}
```
这种格式只能用于数据库备份，无法被任何 CLI 工具读取。

### 错误二：应用级导出的格式错误

以 Claude Code 为例，当前生成的 `settings.json` 把 MCP Servers 和 Provider 配置混在一起，但实际上：
- **Claude Code MCP** 配置在 `~/.claude/settings.json` 的 `mcpServers` 字段（正确）
- **Claude Code API Key/Provider** 实际通过官方登录或环境变量 `ANTHROPIC_API_KEY` 配置，不是写入 settings.json 的 `apiKey` 字段（错误）
- **Codex 格式** 完全错误：Codex CLI 使用 `~/.codex/config.yaml`（YAML 格式），而非 JSON
- **Gemini CLI MCP** 配置在 `~/.gemini/settings.json` 的 `mcpServers` 字段，key 格式与 Claude 一致

### 错误三：Skills 导出完全缺失且格式错误

Claude Code Skills 真实目录结构：
```
~/.claude/skills/
└── <skill-name>/
    ├── SKILL.md          ← 必须（含 frontmatter）
    ├── prompt.md         ← 可选
    └── scripts/          ← 可选
        └── run.sh
```
`SKILL.md` 必须包含 YAML frontmatter：
```markdown
---
name: skill-name
description: 技能描述
version: "1.0"
author: author-name
tags: [tag1, tag2]
---

技能正文内容
```
当前完全没有生成此结构，只是把技能名称列表导出。

---

## 官方配置格式规范（基于官方文档）

### Claude Code

| 文件 | 路径 | 说明 |
|------|------|------|
| `settings.json` | `~/.claude/settings.json` | MCP + 全局设置 |
| `CLAUDE.md` | `~/.claude/CLAUDE.md` 或项目根 | 系统提示 |
| `skills/<name>/SKILL.md` | `~/.claude/skills/<name>/` | 技能定义文件 |

`settings.json` 标准格式：
```json
{
  "mcpServers": {
    "mcp-fetch": {
      "command": "npx",
      "args": ["-y", "@anthropics/mcp-fetch"]
    },
    "my-sse-server": {
      "type": "sse",
      "url": "https://example.com/mcp"
    }
  }
}
```

API Key 配置方式（不写入 settings.json）：
- 官方登录：`claude` 命令交互认证，无需配置文件
- 自定义：环境变量 `ANTHROPIC_API_KEY=xxx`，或 `ANTHROPIC_BASE_URL=xxx`
- 这些应生成 `.env` 或 `shell export` 片段，而非写入 settings.json

### Codex CLI

| 文件 | 路径 | 格式 |
|------|------|------|
| `config.yaml` | `~/.codex/config.yaml` | YAML |
| `AGENTS.md` | 项目根目录 | Markdown |

`config.yaml` 标准格式（YAML，非 JSON）：
```yaml
model: o4-mini
provider: openai
providers:
  openai:
    name: openai
    baseURL: https://api.openai.com/v1
    envKey: OPENAI_API_KEY
  custom:
    name: Custom Provider
    baseURL: https://custom.api.com/v1
    envKey: CUSTOM_API_KEY
```

Codex 的 MCP 配置是通过 `mcp_servers` 字段（JSON 格式放在 `~/.codex/mcp.json`）：
```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "some-mcp-server"]
    }
  }
}
```

### Gemini CLI

| 文件 | 路径 | 说明 |
|------|------|------|
| `settings.json` | `~/.gemini/settings.json` | MCP + 设置 |
| `GEMINI.md` | 项目根目录 | 系统提示 |

`settings.json` 标准格式：
```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "some-mcp-server"],
      "env": {}
    }
  }
}
```

Provider（API Key）通过环境变量 `GOOGLE_API_KEY` 或 `GEMINI_API_KEY`，不写入 settings.json。

---

## 重构方案

### 方案一：重构「应用级导出」为正确的多文件 ZIP 包

每个 CLI 工具点击导出时，生成一个 ZIP 压缩包，内含该工具所需的**所有**配置文件，文件名和格式完全符合官方要求：

**Claude Code ZIP 内容**：
```
claude-export-2026-02-18/
├── settings.json          ← MCP Servers（仅 enabled + claude 绑定）
├── CLAUDE.md              ← 激活的 Prompt（如有）
├── env.sh                 ← API Key export 命令片段（如有自定义 provider）
└── skills/
    ├── skill-a/
    │   └── SKILL.md       ← 已安装 skills 的标准 frontmatter 文件
    └── skill-b/
        └── SKILL.md
```

**Codex CLI ZIP 内容**：
```
codex-export-2026-02-18/
├── config.yaml            ← Provider 配置（YAML 格式）
├── mcp.json               ← MCP Servers（仅 enabled + codex 绑定）
└── AGENTS.md              ← 激活的 Prompt（如有）
```

**Gemini CLI ZIP 内容**：
```
gemini-export-2026-02-18/
├── settings.json          ← MCP Servers（仅 enabled + gemini 绑定）
├── GEMINI.md              ← 激活的 Prompt（如有）
└── env.sh                 ← API Key 片段（如有）
```

### 方案二：重构「模块导出」为「数据库备份导出」

模块导出改名为「数据备份」，明确说明这是用于**在本应用内还原数据**的备份格式，不是 CLI 配置文件。保留现有逻辑但清楚标注用途，同时将清洁的可用字段（去掉 `id`/`user_id`/时间戳）输出，方便跨账户迁移。

### 方案三：Skills 的 SKILL.md 生成规则

对于已安装（`installed: true`）的 Skills，从数据库的 `name` 和 `description` 字段生成标准 `SKILL.md`：

```markdown
---
name: anthropic_api_fundamentals
description: A series of notebook tutorials...
version: "1.0"
tags: []
---

# anthropic_api_fundamentals

A series of notebook tutorials...
```

注意：由于当前数据库中 Skills 只存储了 `name` 和 `description`（从 GitHub README 的第一行提取），缺少完整的技能内容/脚本。生成的 `SKILL.md` 会包含基础元数据和说明，但无法包含实际可执行的技能逻辑（那需要从 GitHub 实时拉取原始内容）。

**增强方案**：在导出时，对已安装的 Skills 尝试从 GitHub 拉取原始 `SKILL.md` 内容（如果存在），否则用 `name`/`description` 生成骨架文件。

---

## 文件变更清单

| 文件 | 操作 | 核心变更 |
|------|------|---------|
| `src/pages/Export.tsx` | **大幅重构** | 重写全部导出函数；应用导出改为多文件 ZIP；模块导出改为「数据备份」；Skills 生成 SKILL.md 目录结构 |
| `src/i18n/locales/zh.ts` | 修改 | 更新导出相关文案：「模块导出」→「数据备份」，增加各文件说明 |
| `src/i18n/locales/en.ts` | 修改 | 对应英文文案 |

**无需改动**：Providers.tsx、McpServers.tsx、Skills.tsx、Prompts.tsx（数据结构不变，只修改导出逻辑）

---

## 各应用导出格式详细规范

### Claude Code `settings.json`（标准 MCP 格式）

仅包含已启用且绑定 claude 的 MCP Servers：
```json
{
  "mcpServers": {
    "mcp-fetch": {
      "command": "npx",
      "args": ["-y", "@anthropics/mcp-fetch"]
    },
    "mcp-filesystem": {
      "command": "npx",
      "args": ["-y", "@anthropics/mcp-filesystem", "/path"]
    },
    "my-http-server": {
      "type": "http",
      "url": "https://example.com/mcp"
    }
  }
}
```

Stdio 服务器字段：`command`, `args`, `env`（仅当非空时包含）
HTTP/SSE 服务器字段：`type`, `url`

### Claude Code `env.sh`（API Key 环境变量）

仅当有启用的自定义 Provider（provider_type = "custom" 或 "packycode"）时生成：
```bash
#!/bin/bash
# CC Switch - Claude Code 环境变量配置
# 请将以下命令添加到 ~/.bashrc 或 ~/.zshrc

export ANTHROPIC_API_KEY="your-api-key"
export ANTHROPIC_BASE_URL="https://api.packycode.com"
```

官方登录（provider_type = "official"）不生成 env.sh。

### Claude Code `skills/<name>/SKILL.md`

每个已安装的 Skill 生成一个目录和 SKILL.md：
```markdown
---
name: anthropic_api_fundamentals
description: A series of notebook tutorials...
version: "1.0"
tags: []
---

# anthropic_api_fundamentals

A series of notebook tutorials that cover the essentials of working with Claude models...
```

### Codex `config.yaml`（YAML 格式）

```yaml
# CC Switch - Codex CLI 配置
# 放置路径: ~/.codex/config.yaml

model: o4-mini
provider: openai

providers:
  custom:
    name: Custom Provider
    baseURL: https://custom.api.com/v1
    envKey: OPENAI_API_KEY
```

仅当有启用的 codex Provider 且 provider_type 为 custom 时填充 providers 字段。

### Codex `mcp.json`（MCP 配置）

```json
{
  "mcpServers": {
    "mcp-fetch": {
      "command": "npx",
      "args": ["-y", "@anthropics/mcp-fetch"]
    }
  }
}
```

### Gemini `settings.json`

```json
{
  "mcpServers": {
    "mcp-fetch": {
      "command": "npx",
      "args": ["-y", "@anthropics/mcp-fetch"]
    }
  }
}
```

---

## UI 变更

导出页面「应用导出」卡片重新设计，为每个应用列出将生成的文件清单：

```
Claude Code                          [下载 ZIP]
  ✓ settings.json  → ~/.claude/settings.json
  ✓ CLAUDE.md      → ~/.claude/CLAUDE.md
  ✓ skills/        → ~/.claude/skills/
  ~ env.sh         → 按需添加到 .bashrc/.zshrc
```

同时 UI 上显示「预计包含 X 个 MCP、Y 个 Skills」的摘要信息，让用户在下载前知道内容。

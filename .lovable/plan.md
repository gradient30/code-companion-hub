

# 添加 CLI 命令参考手册页面

## 概述

新建一个独立的「命令手册」页面（`/cli-guide`），以精美的卡片 + 手风琴布局，完整收录 Claude Code、Codex CLI、Gemini CLI 三大工具的内置命令说明。所有描述使用中文，命令语法保留英文原文，确保与官方文档一致。

## 页面结构

页面顶部使用三个 Tab 切换工具，每个 Tab 内按功能分组展示命令：

```text
[Claude Code]  [Codex CLI]  [Gemini CLI]
+-------------------------------------------------+
| 搜索命令...                          [全部展开]  |
+-------------------------------------------------+
| > 会话管理（5 条命令）                            |
|   /help    显示帮助信息和所有可用命令              |
|   /clear   清除当前会话历史                       |
|   /compact 压缩会话以节省上下文窗口               |
|   ...                                            |
| > 配置与调试（4 条命令）                          |
|   /config  查看或修改配置设置                     |
|   /cost    显示当前会话的 Token 用量和费用         |
|   /doctor  检查 Claude Code 安装健康状态          |
|   ...                                            |
| > 工具与扩展（3 条命令）                          |
|   /mcp     管理 MCP 服务器                       |
|   /agents  管理自定义子代理                       |
|   ...                                            |
+-------------------------------------------------+
```

每条命令以行内展示：`命令名`（加代码高亮）+ 中文描述 + 可选的用法示例（折叠展开）。

## 三大工具命令清单（基于官方文档）

### Claude Code - 斜杠命令

分组：
- **会话管理**：`/help`, `/clear`, `/compact [instructions]`, `/init`, `/review`
- **配置与调试**：`/config`, `/cost`, `/doctor`, `/model`, `/allowed-tools`, `/hooks`
- **账户管理**：`/login`, `/logout`
- **工具与扩展**：`/mcp`, `/agents`, `/add-dir`
- **其他**：`/bug`, `/status`
- **快捷键**：Ctrl+C, Ctrl+D, Ctrl+L, Esc Esc, Shift+Tab, \+Enter
- **CLI 启动命令**：`claude`, `claude "query"`, `claude -p`, `claude --continue`, `claude --resume`

### Codex CLI - 命令与选项

分组：
- **启动与运行**：`codex`, `codex "query"`, `codex -q`, `codex --restore`
- **模型与提供者**：`--model/-m`, `--provider/-p`
- **审批模式**：`--approval-mode/-a`（suggest/auto-edit/full-auto）, `--full-auto`, `--auto-edit`
- **沙箱控制**：`--sandbox`（docker/none/workspace-write）
- **交互命令**：`/mode`, `/model`, `/approval`, `/status`, `/init`, `/new`, `/history`
- **输入与输出**：`--image/-i`, `--quiet/-q`
- **配置**：`~/.codex/config.toml` 主要字段

### Gemini CLI - 斜杠命令

分组：
- **会话管理**：`/help`, `/clear`, `/compress`, `/copy`, `/quit`
- **对话存档**：`/chat save`, `/chat resume`, `/chat list`, `/restore`
- **记忆与上下文**：`/memory show`, `/memory refresh`, `/memory add`
- **工具与扩展**：`/tools`, `/mcp`, `/extensions`, `/skills`
- **设置与主题**：`/settings`, `/theme`, `/auth`, `/editor`, `/terminal-setup`, `/ide`
- **统计与调试**：`/stats`, `/bug`, `/about`
- **@ 命令**：`@file`, `@directory`
- **! 命令**：`!shell-command`
- **CLI 启动选项**：`gemini`, `--model`, `--checkpointing`, `-p`

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/pages/CliGuide.tsx` | 新建 | 命令手册页面主组件（含全部命令数据定义 + 搜索 + 分组展示） |
| `src/App.tsx` | 修改 | 添加 `/cli-guide` 路由 |
| `src/components/AppSidebar.tsx` | 修改 | 添加「命令手册」导航项（使用 `Terminal` 图标） |
| `src/i18n/locales/zh.ts` | 修改 | 添加 `nav.cliGuide` 等翻译 |
| `src/i18n/locales/en.ts` | 修改 | 添加对应英文翻译 |

## 技术实现要点

### 命令数据结构

```typescript
interface CliCommand {
  command: string;        // 命令名，如 "/help"
  description: string;    // 中文描述
  usage?: string;         // 用法示例（可选）
  subcommands?: { command: string; description: string }[]; // 子命令
}

interface CommandGroup {
  category: string;       // 分组名，如 "会话管理"
  icon: LucideIcon;
  commands: CliCommand[];
}

interface CliTool {
  id: string;             // "claude" | "codex" | "gemini"
  name: string;
  icon: string;           // emoji 或 lucide 图标
  officialUrl: string;    // 官方文档链接
  groups: CommandGroup[];
}
```

### UI 组件使用

- **Tabs** 切换三大工具
- **Accordion** 按分组折叠/展开命令列表
- **Input** 搜索过滤命令
- **Badge** 标注命令类型（斜杠命令/CLI 参数/快捷键）
- **Tooltip** 显示完整用法示例
- **Card** 包裹每条命令

### 搜索功能

- 实时过滤：输入关键词后只显示匹配的命令（匹配命令名或描述）
- 自动展开包含匹配结果的分组

### 视觉设计

- 命令名使用 `font-mono` 等宽字体 + 代码背景色高亮
- 分组标题左侧带图标，右侧显示命令数量 Badge
- 每个工具 Tab 顶部显示官方文档链接
- 支持暗色主题


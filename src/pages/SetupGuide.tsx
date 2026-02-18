import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Search, ExternalLink, Terminal, Monitor, Download, Shield, Settings,
  CheckCircle, Play, Cpu, Bug, HelpCircle, Zap, Wrench, BarChart3,
  ChevronsUpDown, Copy, Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { LucideIcon } from "lucide-react";

// ─── Data types ───

interface SetupGuideItem {
  title: string;
  description: string;
  code?: string;
  badge?: "prereq" | "install" | "config" | "verify" | "command" | "scenario" | "optimize" | "debug" | "faq";
  table?: { headers: string[]; rows: string[][] };
}

interface SetupGuideGroup {
  category: string;
  icon: LucideIcon;
  items: SetupGuideItem[];
}

interface SetupGuideTool {
  id: string;
  name: string;
  officialUrl: string;
  groups: SetupGuideGroup[];
}

// ─── Badge config ───

const badgeConfig: Record<string, { label: string; className: string }> = {
  prereq: { label: "前置条件", className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30" },
  install: { label: "安装步骤", className: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30" },
  config: { label: "配置项", className: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30" },
  verify: { label: "验证命令", className: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30" },
  command: { label: "核心命令", className: "bg-primary/15 text-primary border-primary/30" },
  scenario: { label: "应用场景", className: "bg-accent/15 text-accent-foreground border-accent/30" },
  optimize: { label: "性能优化", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
  debug: { label: "问题排查", className: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30" },
  faq: { label: "常见问题", className: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30" },
};

// ─── Claude Code Data ───

const claudeGroups: SetupGuideGroup[] = [
  {
    category: "前置条件",
    icon: Shield,
    items: [
      { title: "Node.js（npm 安装方式）", description: "若使用 npm 安装 Claude Code，需要 Node.js 18.x 或更高版本。推荐原生安装方式（curl/WinGet）以自动更新。", code: "node --version\n# 应输出 v18.x.x 或更高", badge: "prereq" },
      { title: "Git（推荐安装）", description: "Git 用于版本控制集成，Claude Code 的 /review 命令依赖 Git diff 功能。虽然非必需，但强烈推荐安装。", code: "git --version", badge: "prereq" },
      { title: "操作系统要求", description: "原生支持 macOS、Linux 和 Windows。Windows 原生支持无需 WSL2，也可通过 WSL2 运行。", badge: "prereq", table: { headers: ["操作系统", "支持方式", "备注"], rows: [["macOS", "原生支持 + Homebrew", "推荐 macOS 12+"], ["Linux", "原生支持（curl）", "主流发行版均可"], ["Windows", "原生支持（PowerShell/CMD/WinGet）", "无需 WSL2"]] } },
    ],
  },
  {
    category: "安装步骤",
    icon: Download,
    items: [
      { title: "原生安装（推荐，自动更新）", description: "官方推荐的安装方式，安装后在后台自动保持最新版本，无需手动更新。", code: "# macOS / Linux / WSL\ncurl -fsSL https://claude.ai/install.sh | bash\n\n# Windows PowerShell\nirm https://claude.ai/install.ps1 | iex\n\n# Windows CMD\ncurl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd && del install.cmd", badge: "install" },
      { title: "Homebrew 安装（macOS/Linux）", description: "使用 Homebrew 安装 Claude Code（不自动更新，需手动执行 brew upgrade）。", code: "brew install --cask claude-code\n\n# 手动更新\nbrew upgrade claude-code", badge: "install" },
      { title: "WinGet 安装（Windows）", description: "使用 Windows 包管理器 WinGet 安装（不自动更新，需手动 upgrade）。", code: "winget install Anthropic.ClaudeCode\n\n# 手动更新\nwinget upgrade Anthropic.ClaudeCode", badge: "install" },
      { title: "npm 全局安装", description: "使用 npm 全局安装 Claude Code CLI（不自动更新）。", code: "npm install -g @anthropic-ai/claude-code\n\n# 更新\nnpm update -g @anthropic-ai/claude-code", badge: "install" },
      { title: "在项目中启动", description: "安装完成后，在任意项目目录中启动 Claude Code，首次运行会引导登录。", code: "cd your-project\nclaude\n# 首次运行会提示登录", badge: "install" },
    ],
  },
  {
    category: "API 密钥与认证",
    icon: Settings,
    items: [
      { title: "OAuth 登录（推荐）", description: "Claude Code 支持通过 /login 命令使用 Anthropic 账户 OAuth 登录，无需手动设置 API Key。Claude Max Plan 用户可直接通过此方式认证使用。", code: "claude\n# 首次启动自动引导登录，或执行：\n/login", badge: "config" },
      { title: "获取 Anthropic API Key", description: "访问 Anthropic Console (console.anthropic.com) 创建账户并生成 API Key。需要有效的付费账户才能使用 API 方式。", badge: "config" },
      { title: "通过 settings.json 配置 API Key", description: "将 API Key 写入 settings.json 的 env 字段（推荐方式，支持自定义 Base URL 接入第三方代理）。", code: "# ~/.claude/settings.json\n{\n  \"env\": {\n    \"ANTHROPIC_AUTH_TOKEN\": \"sk-ant-xxxxx\",\n    \"ANTHROPIC_BASE_URL\": \"https://api.example.com/\"\n  },\n  \"model\": \"claude-sonnet-4-5-20250929\",\n  \"permissions\": { \"allow\": [\"*\"], \"deny\": [] }\n}", badge: "config" },
      { title: "环境变量配置（备选）", description: "也可通过 Shell 环境变量设置 API Key，但 settings.json 方式优先级更高且更推荐。", code: "# Bash/Zsh (~/.bashrc 或 ~/.zshrc)\nexport ANTHROPIC_API_KEY=\"sk-ant-xxxxx\"\nsource ~/.bashrc", badge: "config" },
    ],
  },
  {
    category: "环境变量配置",
    icon: Settings,
    items: [
      { title: "常用环境变量一览", description: "Claude Code 支持多个环境变量（在 settings.json[\"env\"] 中定义或 Shell 中导出）。", badge: "config", table: { headers: ["变量名", "说明", "示例"], rows: [["ANTHROPIC_AUTH_TOKEN", "API 认证密钥", "sk-ant-xxxxx"], ["ANTHROPIC_BASE_URL", "自定义 API 端点（接入第三方代理）", "https://api.kimi.com/coding/"], ["ANTHROPIC_MODEL", "默认模型", "claude-sonnet-4-5-20250929"], ["ANTHROPIC_DEFAULT_SONNET_MODEL", "Sonnet 别名映射模型", "claude-sonnet-4-5-20250929"], ["ANTHROPIC_DEFAULT_HAIKU_MODEL", "Haiku 别名映射模型", "claude-haiku-4-20251002"], ["API_TIMEOUT_MS", "请求超时毫秒数", "3000000"], ["HTTP_PROXY", "HTTP 代理", "http://proxy:8080"]] } },
    ],
  },
  {
    category: "初始化验证",
    icon: CheckCircle,
    items: [
      { title: "检查版本号", description: "运行版本检查命令，确认 Claude Code 已正确安装。", code: "claude --version\n# 或\nclaude -v", badge: "verify" },
      { title: "启动交互模式", description: "直接运行 claude 命令进入交互模式，如果成功显示对话界面，说明环境配置正确。", code: "claude\n# 进入交互式对话界面", badge: "verify" },
    ],
  },
  {
    category: "核心命令示例",
    icon: Play,
    items: [
      { title: "交互模式", description: "直接运行 claude 进入交互对话，支持多轮对话和工具调用。", code: "claude", badge: "command" },
      { title: "一次性查询", description: "使用引号包裹问题，Claude 回答后自动退出。适合快速提问。", code: 'claude "解释这个函数的作用"', badge: "command" },
      { title: "非交互/管道模式", description: "使用 -p 参数以非交互方式运行，适合脚本化和自动化场景。", code: 'cat file.py | claude -p "审查这段代码"', badge: "command" },
      { title: "继续上次对话", description: "使用 -c 恢复当前目录最近一次对话的上下文。", code: "claude -c", badge: "command" },
      { title: "恢复指定会话", description: "使用 -r 按名称或 ID 恢复历史会话。", code: 'claude -r "auth-refactor" "继续这个 PR"', badge: "command" },
      { title: "更新 Claude Code", description: "原生安装自动后台更新；npm 安装需手动执行更新命令。", code: "claude update\n# 或 npm update -g @anthropic-ai/claude-code", badge: "command" },
    ],
  },
  {
    category: "典型应用场景",
    icon: Cpu,
    items: [
      { title: "代码审查", description: "使用 /review 命令自动审查当前 Git 变更，提供详细的代码改进建议。", code: "claude\n> /review", badge: "scenario" },
      { title: "项目初始化", description: "使用 /init 命令为项目生成 CLAUDE.md 文件，包含项目结构和上下文信息。", code: "claude\n> /init", badge: "scenario" },
      { title: "上下文压缩", description: "当对话过长时，使用 /compact 压缩历史以节省上下文窗口空间。", code: "claude\n> /compact", badge: "scenario" },
      { title: "多模型切换", description: "使用 /model 命令在对话中切换不同的 Claude 模型（sonnet/opus 等别名）。", code: 'claude\n> /model claude-opus-4-20250514\n# 或使用别名\n> /model opus', badge: "scenario" },
      { title: "Web/云端任务", description: "使用 --remote 在 claude.ai 云端创建会话执行任务，或 --teleport 将 Web 会话拉回本地终端。", code: 'claude --remote "修复登录 Bug"\nclaude --teleport', badge: "scenario" },
      { title: "Chrome 浏览器集成", description: "使用 --chrome 参数启用浏览器自动化功能，用于 Web 应用调试和测试。", code: "claude --chrome", badge: "scenario" },
    ],
  },
  {
    category: "性能优化",
    icon: BarChart3,
    items: [
      { title: "上下文窗口管理", description: "合理使用 /compact 命令压缩对话历史，避免上下文窗口溢出导致的性能下降和额外费用。建议在对话超过 50 轮后主动压缩。", badge: "optimize" },
      { title: "多目录加载", description: "使用 /add-dir 或 --add-dir 将相关目录添加到会话上下文中，让 Claude 能访问更多项目文件。", code: "claude --add-dir ../shared-lib ../packages", badge: "optimize" },
      { title: "并行子代理", description: "对于大型项目的复杂任务，Claude Code 支持通过 --agents 或 /agents 自动创建并行子代理来分解任务，提高处理效率。", code: "# 动态定义自代理\nclaude --agents '{\"reviewer\":{\"description\":\"Code reviewer\",\"prompt\":\"Review code quality\",\"tools\":[\"Read\",\"Grep\"]}}'", badge: "optimize" },
      { title: "费用控制", description: "使用 --max-budget-usd 限制 API 调用费用上限，使用 /cost 查看当前会话费用统计。", code: 'claude -p --max-budget-usd 5.00 "批量重构任务"', badge: "optimize" },
    ],
  },
  {
    category: "问题排查",
    icon: Bug,
    items: [
      { title: "认证失败", description: "检查 API Key 是否正确设置，确认账户是否有足够额度。可通过重新登录或重置 Key 解决。", code: "# 验证配置\ncat ~/.claude/settings.json\n\n# 重新登录\nclaude\n/login", badge: "debug" },
      { title: "网络代理配置", description: "在企业网络环境中，可能需要配置 HTTP 代理才能访问 Anthropic API。", code: "export HTTP_PROXY=http://proxy.company.com:8080\nexport HTTPS_PROXY=http://proxy.company.com:8080", badge: "debug" },
      { title: "/doctor 诊断", description: "运行内置诊断命令，自动检测常见配置问题并提供修复建议。", code: "claude\n> /doctor", badge: "debug" },
    ],
  },
  {
    category: "常见问题 FAQ",
    icon: HelpCircle,
    items: [
      { title: "支持哪些模型？", description: "Claude Code 支持 claude-sonnet-4-5-20250929（当前默认 Sonnet）、claude-opus-4-20250514、claude-haiku-4-20251002 等。使用 sonnet/opus/haiku 别名快速切换。具体可用模型取决于账户类型。", badge: "faq" },
      { title: "Claude Max Plan 有何优势？", description: "Max Plan 用户可直接通过 OAuth 登录使用 Claude Code，无需 API Key，按月订阅享受更高额度和优先访问。", badge: "faq" },
      { title: "费用如何计算？", description: "按 Token 使用量计费，包括输入和输出 Token。使用 /cost 命令可查看当前会话的费用统计。建议开启 Anthropic Console 的用量提醒。", badge: "faq" },
      { title: "如何在企业代理后使用？", description: "设置 HTTP_PROXY 和 HTTPS_PROXY 环境变量，或在 settings.json[\"env\"] 中配置代理相关变量。", badge: "faq" },
      { title: "如何重置配置？", description: "删除 ~/.claude/ 目录下的配置文件即可恢复默认设置。注意备份重要的自定义配置。", code: "rm -rf ~/.claude/settings.json\n# 注意：不要删除整个目录，会丢失会话历史", badge: "faq" },
    ],
  },
];

// ─── Codex CLI Data ───

const codexGroups: SetupGuideGroup[] = [
  {
    category: "前置条件",
    icon: Shield,
    items: [
      { title: "Node.js >= 22", description: "Codex CLI 要求 Node.js 22 或更高版本，比其他 CLI 工具的版本要求更高。", code: "node --version\n# 应输出 v22.x.x 或更高", badge: "prereq" },
      { title: "Git", description: "Git 用于版本控制集成和代码变更追踪，是 Codex CLI 的必要依赖。", code: "git --version", badge: "prereq" },
      { title: "操作系统与沙箱依赖", description: "原生支持 macOS 和 Linux。Windows 需要 WSL2。沙箱功能有额外依赖。", badge: "prereq", table: { headers: ["操作系统", "沙箱依赖", "备注"], rows: [["macOS", "Docker Desktop", "推荐安装以使用沙箱"], ["Linux", "bubblewrap (bwrap)", "apt install bubblewrap"], ["Windows", "WSL2 + 上述依赖", "不原生支持"]] } },
    ],
  },
  {
    category: "安装步骤",
    icon: Download,
    items: [
      { title: "全局安装 Codex CLI", description: "使用 npm 全局安装 OpenAI Codex CLI，安装完成后可使用 codex 命令。", code: "npm install -g @openai/codex", badge: "install" },
      { title: "首次运行配置", description: "首次运行 codex 时会启动配置向导，引导设置 API Key 和默认选项。", code: "codex", badge: "install" },
    ],
  },
  {
    category: "API 密钥与认证",
    icon: Settings,
    items: [
      { title: "获取 OpenAI API Key", description: "访问 OpenAI Platform (platform.openai.com) 创建并获取 API Key。需要有效的付费账户。", badge: "config" },
      { title: "设置 OPENAI_API_KEY", description: "将 API Key 设置为环境变量，Codex CLI 启动时自动读取认证。", code: "export OPENAI_API_KEY=\"sk-xxxxx\"", badge: "config" },
      { title: "多提供者密钥配置", description: "Codex CLI 支持多个 LLM 提供者，可同时配置 Gemini、Anthropic 等密钥。", code: "export GEMINI_API_KEY=\"AIza...\"\nexport ANTHROPIC_API_KEY=\"sk-ant-...\"", badge: "config" },
    ],
  },
  {
    category: "环境变量配置",
    icon: Settings,
    items: [
      { title: "Shell 环境变量", description: "在 Shell 配置文件中持久化 API Key 设置。", code: "# ~/.bashrc 或 ~/.zshrc\nexport OPENAI_API_KEY=\"sk-xxxxx\"", badge: "config" },
      { title: "config.toml 配置文件", description: "Codex CLI 支持通过 ~/.codex/config.toml 文件设置默认配置，避免每次手动指定参数。", code: "# ~/.codex/config.toml\nmodel = \"o4-mini\"\napproval_mode = \"suggest\"\n\n[history]\npersistence = \"save_all\"", badge: "config" },
    ],
  },
  {
    category: "初始化验证",
    icon: CheckCircle,
    items: [
      { title: "检查版本与帮助", description: "确认 Codex CLI 已正确安装并查看可用选项。", code: "codex --version\ncodex --help", badge: "verify" },
      { title: "简单查询测试", description: "发送一个简单查询来验证 API 连接和认证是否正常。", code: "codex \"hello, what can you do?\"", badge: "verify" },
    ],
  },
  {
    category: "核心命令示例",
    icon: Play,
    items: [
      { title: "交互模式", description: "直接运行 codex 进入交互式对话界面。", code: "codex", badge: "command" },
      { title: "一次性查询", description: "传入提示文本，Codex 执行后退出。", code: "codex \"重构这个文件以提高可读性\"", badge: "command" },
      { title: "审批模式选择", description: "通过 --approval-mode 控制 Codex 执行命令时的确认行为。", code: "# suggest - 建议变更，需确认（默认）\ncodex --approval-mode suggest\n\n# auto-edit - 自动编辑文件，命令需确认\ncodex --approval-mode auto-edit\n\n# full-auto - 完全自动执行\ncodex --approval-mode full-auto", badge: "command" },
      { title: "模型选择", description: "使用 --model 参数指定使用的 LLM 模型。", code: "codex --model o4-mini \"分析这个 bug\"", badge: "command" },
      { title: "沙箱控制", description: "使用 --sandbox 参数控制代码执行的隔离级别。", code: "# 启用沙箱（推荐用于 full-auto）\ncodex --sandbox\n\n# 禁用沙箱\ncodex --sandbox=false", badge: "command" },
    ],
  },
  {
    category: "典型应用场景",
    icon: Cpu,
    items: [
      { title: "Full-auto 批量重构", description: "使用 full-auto 模式让 Codex 自动完成大规模代码重构，结合沙箱确保安全。", code: "codex --approval-mode full-auto --sandbox \"将所有 var 声明改为 const/let\"", badge: "scenario" },
      { title: "沙箱安全执行", description: "在隔离的沙箱环境中执行不信任的代码操作，防止误操作影响系统。macOS 使用 Docker，Linux 使用 bubblewrap。", badge: "scenario" },
      { title: "多提供者切换", description: "Codex CLI 支持 OpenAI、Google Gemini、Anthropic 等多个 LLM 提供者，可在运行时灵活切换。", code: "codex --model gemini-2.5-pro \"分析项目架构\"", badge: "scenario" },
      { title: "图片输入分析", description: "Codex 支持在提示中传入图片文件进行多模态分析。", code: "codex \"分析这张截图中的 UI 问题\" --image screenshot.png", badge: "scenario" },
    ],
  },
  {
    category: "性能优化",
    icon: BarChart3,
    items: [
      { title: "--quiet 精简输出", description: "使用 --quiet 参数减少非必要输出，适合脚本化调用场景。", code: "codex --quiet \"修复 lint 错误\"", badge: "optimize" },
      { title: "预配置默认值", description: "在 config.toml 中设置常用参数默认值，避免每次重复输入。", code: "# ~/.codex/config.toml\nmodel = \"o4-mini\"\napproval_mode = \"auto-edit\"", badge: "optimize" },
      { title: "合理选择审批模式", description: "根据任务信任度选择合适的审批模式：suggest 用于敏感操作，auto-edit 用于日常开发，full-auto 用于批量自动化任务。", badge: "optimize" },
    ],
  },
  {
    category: "问题排查",
    icon: Bug,
    items: [
      { title: "Docker 沙箱启动失败", description: "macOS 上需要确保 Docker Desktop 已安装并正在运行。检查 Docker 服务状态。", code: "docker --version\ndocker ps  # 确认 Docker 正在运行", badge: "debug" },
      { title: "API 配额超限", description: "检查 OpenAI 账户的 API 配额和速率限制。升级计划或等待配额重置。", badge: "debug" },
      { title: "模型不可用", description: "确认所选模型在你的 API 计划中可用。部分模型需要特定的访问权限。", code: "# 尝试使用默认模型\ncodex --model o4-mini", badge: "debug" },
      { title: "权限问题", description: "全局安装时可能需要管理员权限。Linux 上避免使用 sudo npm install。", code: "# 推荐：配置 npm 全局目录\nnpm config set prefix ~/.npm-global\nexport PATH=~/.npm-global/bin:$PATH", badge: "debug" },
    ],
  },
  {
    category: "常见问题 FAQ",
    icon: HelpCircle,
    items: [
      { title: "支持哪些 LLM 提供者？", description: "Codex CLI 支持 OpenAI（默认）、Google Gemini、Anthropic Claude、Mistral、DeepSeek、Ollama 等多个提供者。通过设置对应的 API Key 和 --model 参数即可切换。", badge: "faq" },
      { title: "沙箱如何工作？", description: "macOS 上通过 Docker 容器隔离，Linux 上通过 bubblewrap 实现用户命名空间隔离。沙箱限制了文件系统和网络访问，防止误操作。", badge: "faq" },
      { title: "如何自定义指令？", description: "在项目根目录创建 AGENTS.md 文件，Codex CLI 启动时会自动读取其中的系统指令。也可在 ~/.codex/instructions.md 设置全局指令。", badge: "faq" },
      { title: "如何查看历史会话？", description: "Codex CLI 默认保存会话历史，可通过 config.toml 中的 [history] 配置管理。历史记录存储在 ~/.codex/ 目录下。", badge: "faq" },
    ],
  },
];

// ─── Gemini CLI Data ───

const geminiGroups: SetupGuideGroup[] = [
  {
    category: "前置条件",
    icon: Shield,
    items: [
      { title: "Node.js >= 18", description: "Gemini CLI 基于 Node.js 运行，需要 18.x 或更高版本。", code: "node --version", badge: "prereq" },
      { title: "Google 账户", description: "免费 Google 账户即可通过 OAuth 登录使用。免费层：60 次/分钟，1,000 次/天（Gemini 3 模型）。", badge: "prereq" },
    ],
  },
  {
    category: "安装步骤",
    icon: Download,
    items: [
      { title: "npx 运行（无需安装）", description: "无需全局安装，使用 npx 直接运行最新版 Gemini CLI。", code: "npx @google/gemini-cli", badge: "install" },
      { title: "npm 全局安装", description: "全局安装 Gemini CLI，安装后可直接使用 gemini 命令。", code: "npm install -g @google/gemini-cli\n\n# 安装稳定版\nnpm install -g @google/gemini-cli@latest\n\n# 安装预览版（每周二更新）\nnpm install -g @google/gemini-cli@preview", badge: "install" },
      { title: "Homebrew 安装（macOS/Linux）", description: "使用 Homebrew 安装 Gemini CLI，方便管理版本。", code: "brew install gemini-cli", badge: "install" },
    ],
  },
  {
    category: "API 密钥与认证",
    icon: Settings,
    items: [
      { title: "Google OAuth 登录（推荐，免费）", description: "首次运行时选择「Login with Google」，通过浏览器完成授权。免费层：60 次/分钟，1,000 次/天，默认使用 Gemini 3 模型。", code: "gemini\n# 启动后选择 Login with Google", badge: "config" },
      { title: "Gemini API Key（可选）", description: "从 Google AI Studio 获取 API Key，可精确控制模型选择和用量。", code: "# 访问 https://aistudio.google.com/apikey 获取\nexport GEMINI_API_KEY=\"AIza...\"\ngemini", badge: "config" },
      { title: "Vertex AI 企业认证", description: "企业用户通过 Google Cloud Vertex AI 使用 Gemini，支持更高配额和合规保障。", code: "export GOOGLE_API_KEY=\"YOUR_API_KEY\"\nexport GOOGLE_GENAI_USE_VERTEXAI=true\n# 如需指定项目\nexport GOOGLE_CLOUD_PROJECT=\"YOUR_PROJECT_ID\"\ngemini", badge: "config" },
    ],
  },
  {
    category: "初始化验证",
    icon: CheckCircle,
    items: [
      { title: "检查版本", description: "确认 Gemini CLI 已正确安装并查看版本号。", code: "gemini --version", badge: "verify" },
      { title: "启动交互模式", description: "直接运行 gemini 进入交互界面，输入 /help 查看可用命令。", code: "gemini\n> /help", badge: "verify" },
    ],
  },
  {
    category: "核心命令示例",
    icon: Play,
    items: [
      { title: "交互模式", description: "启动 Gemini CLI 交互对话（默认使用 Gemini 3 模型）。", code: "gemini", badge: "command" },
      { title: "模型选择", description: "使用 --model 参数指定 Gemini 模型版本。", code: "gemini --model gemini-2.5-pro\ngemini --model gemini-2.5-flash", badge: "command" },
      { title: "非交互模式", description: "使用 -p 参数执行一次性查询，支持 --output-format 指定输出格式。", code: 'gemini -p "解释 Docker 的工作原理"\ngemini -p "query" --output-format json', badge: "command" },
      { title: "多目录上下文", description: "使用 --include-directories 指定额外目录作为上下文。", code: "gemini --include-directories ../lib,../docs", badge: "command" },
    ],
  },
  {
    category: "问题排查",
    icon: Bug,
    items: [
      { title: "OAuth 授权失败", description: "检查浏览器是否正常弹出授权页面，确认 Google 账户状态正常且网络可访问 Google 服务。", badge: "debug" },
      { title: "API 配额限制", description: "免费层：60 次/分钟，1,000 次/天。升级到付费计划或使用 Vertex AI 可获更高限额。", badge: "debug" },
      { title: "代理设置", description: "在需要代理的网络环境中，配置 HTTP 代理环境变量。", code: "export HTTP_PROXY=http://proxy:8080\nexport HTTPS_PROXY=http://proxy:8080", badge: "debug" },
    ],
  },
  {
    category: "常见问题 FAQ",
    icon: HelpCircle,
    items: [
      { title: "免费额度是多少？", description: "Google OAuth 登录：60 次/分钟，1,000 次/天（使用 Gemini 3 模型）。API Key 免费层：1,000 次/天（Gemini 3 Flash 和 Pro 混合）。", badge: "faq" },
      { title: "如何切换模型？", description: "使用 --model 参数或在交互模式中使用 /model 命令切换，支持 gemini-2.5-pro、gemini-2.5-flash 等。", badge: "faq" },
      { title: "GEMINI.md 是什么？", description: "GEMINI.md 是项目级的自定义指令文件，放置在项目根目录。Gemini CLI 启动时会自动加载，用于设置项目特定的行为偏好和上下文。", badge: "faq" },
    ],
  },
];

// ─── Tool definitions ───

const setupTools: SetupGuideTool[] = [
  { id: "claude", name: "Claude Code", officialUrl: "https://docs.anthropic.com/en/docs/claude-code", groups: claudeGroups },
  { id: "codex", name: "Codex CLI", officialUrl: "https://github.com/openai/codex", groups: codexGroups },
  { id: "gemini", name: "Gemini CLI", officialUrl: "https://github.com/google-gemini/gemini-cli", groups: geminiGroups },
];

// ─── CopyButton component ───

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={handleCopy}>
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
    </Button>
  );
}

// ─── Item row component ───

function ItemRow({ item }: { item: SetupGuideItem }) {
  const badge = item.badge ? badgeConfig[item.badge] : null;
  return (
    <div className="px-4 py-3 space-y-2">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-foreground">{item.title}</span>
            {badge && (
              <Badge variant="outline" className={`text-[10px] h-5 ${badge.className}`}>
                {badge.label}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed whitespace-pre-line">{item.description}</p>
        </div>
      </div>
      {item.code && (
        <div className="relative rounded-md bg-muted/60 dark:bg-muted/30 border border-border">
          <div className="absolute right-1 top-1">
            <CopyButton text={item.code} />
          </div>
          <pre className="p-3 pr-10 text-xs font-mono text-foreground overflow-x-auto whitespace-pre">{item.code}</pre>
        </div>
      )}
      {item.table && (
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                {item.table.headers.map((h) => (
                  <TableHead key={h} className="text-xs h-8">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {item.table.rows.map((row, i) => (
                <TableRow key={i}>
                  {row.map((cell, j) => (
                    <TableCell key={j} className="text-xs py-1.5">{cell}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── Group section component ───

function GroupSection({ group, defaultOpen }: { group: SetupGuideGroup; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = group.icon;

  // sync with parent
  if (defaultOpen && !open) setOpen(true);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
      >
        <Icon className="h-4 w-4 text-primary shrink-0" />
        <span className="font-medium text-sm text-foreground">{group.category}</span>
        <Badge variant="secondary" className="ml-auto text-[10px] h-5">{group.items.length}</Badge>
        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </button>
      {open && (
        <div className="border-t border-border divide-y divide-border/50">
          {group.items.map((item) => (
            <ItemRow key={item.title} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page component ───

export default function SetupGuide() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("claude");
  const [allExpanded, setAllExpanded] = useState(false);

  const filteredTools = useMemo(() => {
    if (!search.trim()) return setupTools;
    const q = search.toLowerCase();
    return setupTools.map((tool) => ({
      ...tool,
      groups: tool.groups
        .map((g) => ({
          ...g,
          items: g.items.filter(
            (item) => item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
          ),
        }))
        .filter((g) => g.items.length > 0),
    }));
  }, [search]);

  const activeTool = filteredTools.find((t) => t.id === activeTab) ?? filteredTools[0];
  const originalTool = setupTools.find((t) => t.id === activeTab)!;

  const totalItems = originalTool.groups.reduce((sum, g) => sum + g.items.length, 0);
  const filteredItems = activeTool?.groups.reduce((sum, g) => sum + g.items.length, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("setupGuide.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("setupGuide.subtitle")}</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSearch(""); }}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="claude" className="gap-1.5">
            <Terminal className="h-3.5 w-3.5" />
            Claude Code
          </TabsTrigger>
          <TabsTrigger value="codex" className="gap-1.5">
            <Terminal className="h-3.5 w-3.5" />
            Codex CLI
          </TabsTrigger>
          <TabsTrigger value="gemini" className="gap-1.5">
            <Terminal className="h-3.5 w-3.5" />
            Gemini CLI
          </TabsTrigger>
        </TabsList>

        {setupTools.map((tool) => (
          <TabsContent key={tool.id} value={tool.id} className="space-y-4 mt-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("setupGuide.searchPlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setAllExpanded(!allExpanded)}>
                  {allExpanded ? t("setupGuide.collapseAll") : t("setupGuide.expandAll")}
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" asChild>
                      <a href={tool.officialUrl} target="_blank" rel="noopener noreferrer" className="gap-1.5">
                        <ExternalLink className="h-3.5 w-3.5" />
                        {t("setupGuide.officialDocs")}
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{tool.officialUrl}</TooltipContent>
                </Tooltip>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              {search
                ? `${t("setupGuide.showing")} ${filteredItems} / ${totalItems} ${t("setupGuide.items")}`
                : `${t("setupGuide.total")} ${totalItems} ${t("setupGuide.items")}`}
            </div>

            <div className="space-y-3">
              {activeTool?.groups.map((group) => (
                <GroupSection key={group.category} group={group} defaultOpen={allExpanded || !!search} />
              ))}
              {activeTool?.groups.length === 0 && (
                <Card className="p-8 text-center text-muted-foreground text-sm">
                  {t("setupGuide.noResults")}
                </Card>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

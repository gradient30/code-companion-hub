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
      { title: "Node.js >= 18", description: "Claude Code 基于 Node.js 运行，需要 18.x 或更高版本。推荐使用 LTS 版本以获得最佳稳定性。", code: "node --version\n# 应输出 v18.x.x 或更高", badge: "prereq" },
      { title: "Git（推荐安装）", description: "Git 用于版本控制集成，Claude Code 的 /review 命令依赖 Git diff 功能。虽然非必需，但强烈推荐安装。", code: "git --version", badge: "prereq" },
      { title: "操作系统要求", description: "原生支持 macOS 和 Linux。Windows 用户需要通过 WSL2（Windows Subsystem for Linux 2）来运行 Claude Code。", badge: "prereq", table: { headers: ["操作系统", "支持方式", "备注"], rows: [["macOS", "原生支持", "推荐 macOS 12+"], ["Linux", "原生支持", "主流发行版均可"], ["Windows", "WSL2", "需先安装 WSL2 环境"]] } },
    ],
  },
  {
    category: "安装步骤",
    icon: Download,
    items: [
      { title: "全局安装 Claude Code", description: "使用 npm 全局安装 Claude Code CLI 工具，安装完成后即可在终端中使用 claude 命令。", code: "npm install -g @anthropic-ai/claude-code", badge: "install" },
      { title: "使用 npx 临时运行", description: "如果不想全局安装，可以使用 npx 临时运行 Claude Code，适合快速体验或一次性使用。", code: "npx @anthropic-ai/claude-code", badge: "install" },
      { title: "版本更新", description: "定期更新到最新版本以获取新功能和修复。使用 npm update 命令或重新安装。", code: "npm update -g @anthropic-ai/claude-code", badge: "install" },
    ],
  },
  {
    category: "API 密钥与认证",
    icon: Settings,
    items: [
      { title: "获取 Anthropic API Key", description: "访问 Anthropic Console (console.anthropic.com) 创建账户并生成 API Key。需要有效的付费账户才能使用 API。", badge: "config" },
      { title: "设置 ANTHROPIC_API_KEY", description: "将 API Key 设置为环境变量，Claude Code 启动时会自动读取该变量进行认证。", code: "export ANTHROPIC_API_KEY=\"sk-ant-xxxxx\"", badge: "config" },
      { title: "OAuth 登录认证", description: "Claude Code 支持通过 /login 命令使用 Anthropic 账户 OAuth 登录，无需手动设置 API Key。Max Plan 用户也可通过此方式认证。", code: "claude /login", badge: "config" },
    ],
  },
  {
    category: "环境变量配置",
    icon: Settings,
    items: [
      { title: "macOS / Linux 环境变量", description: "将 API Key 添加到 Shell 配置文件中，确保每次启动终端时自动加载。", code: "# Bash 用户 (~/.bashrc)\necho 'export ANTHROPIC_API_KEY=\"sk-ant-xxxxx\"' >> ~/.bashrc\nsource ~/.bashrc\n\n# Zsh 用户 (~/.zshrc)\necho 'export ANTHROPIC_API_KEY=\"sk-ant-xxxxx\"' >> ~/.zshrc\nsource ~/.zshrc", badge: "config" },
      { title: "Windows (WSL2) 环境变量", description: "在 WSL2 的 Linux 环境中设置环境变量，或通过 Windows 环境变量设置。", code: "# WSL2 中设置\necho 'export ANTHROPIC_API_KEY=\"sk-ant-xxxxx\"' >> ~/.bashrc\nsource ~/.bashrc", badge: "config" },
      { title: "常用环境变量一览", description: "Claude Code 支持多个环境变量来控制行为。", badge: "config", table: { headers: ["变量名", "说明", "示例"], rows: [["ANTHROPIC_API_KEY", "API 认证密钥", "sk-ant-xxxxx"], ["CLAUDE_MODEL", "默认模型", "claude-sonnet-4-20250514"], ["ANTHROPIC_BASE_URL", "自定义 API 端点", "https://api.example.com"], ["HTTP_PROXY", "HTTP 代理", "http://proxy:8080"]] } },
    ],
  },
  {
    category: "初始化验证",
    icon: CheckCircle,
    items: [
      { title: "检查版本号", description: "运行版本检查命令，确认 Claude Code 已正确安装。", code: "claude --version\n# 预期输出: claude-code/x.x.x", badge: "verify" },
      { title: "启动交互模式", description: "直接运行 claude 命令进入交互模式，如果成功显示对话界面，说明环境配置正确。", code: "claude\n# 进入交互式对话界面", badge: "verify" },
    ],
  },
  {
    category: "核心命令示例",
    icon: Play,
    items: [
      { title: "交互模式", description: "直接运行 claude 进入交互对话，支持多轮对话和工具调用。", code: "claude", badge: "command" },
      { title: "一次性查询", description: "使用引号包裹问题，Claude 回答后自动退出。适合快速提问。", code: 'claude "解释这个函数的作用"', badge: "command" },
      { title: "管道模式", description: "使用 -p 参数以管道方式运行，适合脚本化和自动化场景。", code: 'cat file.py | claude -p "审查这段代码"', badge: "command" },
      { title: "继续上次对话", description: "使用 --continue 恢复最近一次对话的上下文继续交互。", code: "claude --continue", badge: "command" },
      { title: "恢复指定会话", description: "使用 --resume 命令选择并恢复历史会话。", code: "claude --resume", badge: "command" },
    ],
  },
  {
    category: "典型应用场景",
    icon: Cpu,
    items: [
      { title: "代码审查", description: "使用 /review 命令自动审查当前 Git 变更，提供详细的代码改进建议。", code: "# 在 Git 仓库中\nclaude\n> /review", badge: "scenario" },
      { title: "项目初始化", description: "使用 /init 命令为项目生成 CLAUDE.md 文件，包含项目结构和上下文信息。", code: "claude\n> /init", badge: "scenario" },
      { title: "上下文压缩", description: "当对话过长时，使用 /compact 压缩历史以节省上下文窗口空间。", code: "claude\n> /compact", badge: "scenario" },
      { title: "多模型切换", description: "使用 /model 命令在对话中切换不同的 Claude 模型。", code: "claude\n> /model claude-opus-4-20250514", badge: "scenario" },
    ],
  },
  {
    category: "性能优化",
    icon: BarChart3,
    items: [
      { title: "上下文窗口管理", description: "合理使用 /compact 命令压缩对话历史，避免上下文窗口溢出导致的性能下降和额外费用。建议在对话超过 50 轮后主动压缩。", badge: "optimize" },
      { title: "多目录加载", description: "使用 /add-dir 将相关目录添加到会话上下文中，让 Claude 能访问更多项目文件，提升代码理解的完整性。", code: "claude\n> /add-dir ../shared-lib", badge: "optimize" },
      { title: "并行子代理", description: "对于大型项目的复杂任务，Claude Code 支持自动创建并行子代理来分解任务，提高处理效率。可通过 /agents 命令管理。", badge: "optimize" },
    ],
  },
  {
    category: "问题排查",
    icon: Bug,
    items: [
      { title: "认证失败", description: "检查 API Key 是否正确设置，确认账户是否有足够额度。可通过重新登录或重置 Key 解决。", code: "# 验证 API Key\necho $ANTHROPIC_API_KEY\n\n# 重新登录\nclaude /login", badge: "debug" },
      { title: "Node.js 版本不兼容", description: "确保 Node.js 版本 >= 18。使用 nvm 管理多版本 Node.js 以避免冲突。", code: "# 安装 nvm 后\nnvm install 18\nnvm use 18", badge: "debug" },
      { title: "网络代理配置", description: "在企业网络环境中，可能需要配置 HTTP 代理才能访问 Anthropic API。", code: "export HTTP_PROXY=http://proxy.company.com:8080\nexport HTTPS_PROXY=http://proxy.company.com:8080", badge: "debug" },
      { title: "/doctor 诊断", description: "运行内置诊断命令，自动检测常见配置问题并提供修复建议。", code: "claude\n> /doctor", badge: "debug" },
    ],
  },
  {
    category: "常见问题 FAQ",
    icon: HelpCircle,
    items: [
      { title: "支持哪些模型？", description: "Claude Code 支持 claude-sonnet-4-20250514（默认）、claude-opus-4-20250514 等 Anthropic 模型。可通过 /model 命令切换。具体可用模型取决于账户类型。", badge: "faq" },
      { title: "费用如何计算？", description: "按 Token 使用量计费，包括输入和输出 Token。使用 /cost 命令可查看当前会话的费用统计。建议开启 Anthropic Console 的用量提醒。", badge: "faq" },
      { title: "如何在企业代理后使用？", description: "设置 HTTP_PROXY 和 HTTPS_PROXY 环境变量。部分企业可能需要额外配置 SSL 证书信任。", badge: "faq" },
      { title: "如何重置配置？", description: "删除 ~/.claude/ 目录下的配置文件即可恢复默认设置。注意备份重要的自定义配置。", code: "rm -rf ~/.claude/", badge: "faq" },
      { title: "如何查看日志？", description: "Claude Code 的日志文件存储在 ~/.claude/logs/ 目录下，可用于排查问题和查看详细的交互记录。", code: "ls ~/.claude/logs/", badge: "faq" },
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
      { title: "npm / npx", description: "确保 npm 已安装并可用，npx 用于快速运行 Gemini CLI。", code: "npm --version\nnpx --version", badge: "prereq" },
      { title: "Google 账户", description: "需要一个 Google 账户用于 OAuth 认证或获取 API Key。免费 Google 账户即可使用 Gemini API 的免费额度。", badge: "prereq" },
    ],
  },
  {
    category: "安装步骤",
    icon: Download,
    items: [
      { title: "使用 npx 运行（推荐）", description: "无需全局安装，使用 npx 直接运行 Gemini CLI，始终获取最新版本。", code: "npx https://github.com/google-gemini/gemini-cli", badge: "install" },
      { title: "全局安装", description: "如需频繁使用，可全局安装 Gemini CLI。", code: "npm install -g @anthropic-ai/gemini-cli\n# 或\nnpm install -g gemini-cli", badge: "install" },
    ],
  },
  {
    category: "API 密钥与认证",
    icon: Settings,
    items: [
      { title: "Google AI Studio 获取 API Key", description: "访问 Google AI Studio (aistudio.google.com) 创建 API Key。个人 Google 账户可获得免费使用额度。", badge: "config" },
      { title: "设置 GEMINI_API_KEY", description: "将 API Key 设置为环境变量。", code: "export GEMINI_API_KEY=\"AIza...\"", badge: "config" },
      { title: "Google OAuth 登录", description: "Gemini CLI 支持通过 Google 账户 OAuth 登录，无需手动设置 API Key。首次运行时会自动引导登录流程。", badge: "config" },
      { title: "Vertex AI 认证", description: "企业用户可通过 Google Cloud 的 Vertex AI 认证使用 Gemini，需配置 Google Cloud 项目和服务账号。", badge: "config" },
    ],
  },
  {
    category: "环境变量配置",
    icon: Settings,
    items: [
      { title: "Shell 环境变量设置", description: "在 Shell 配置文件中持久化 Gemini API Key。", code: "# ~/.bashrc 或 ~/.zshrc\nexport GEMINI_API_KEY=\"AIza...\"\nsource ~/.bashrc", badge: "config" },
      { title: "settings.json 配置", description: "Gemini CLI 使用 ~/.gemini/settings.json 存储配置，包括默认模型、主题等设置。", code: "# ~/.gemini/settings.json\n{\n  \"theme\": \"Default\",\n  \"selectedAuthType\": \"api-key\"\n}", badge: "config" },
    ],
  },
  {
    category: "初始化验证",
    icon: CheckCircle,
    items: [
      { title: "检查版本", description: "运行 gemini --version 确认安装成功。", code: "gemini --version", badge: "verify" },
      { title: "启动交互模式", description: "直接运行 gemini 进入交互界面，输入 /help 查看可用命令。", code: "gemini\n> /help", badge: "verify" },
    ],
  },
  {
    category: "核心命令示例",
    icon: Play,
    items: [
      { title: "交互模式", description: "直接运行 gemini 进入交互对话。", code: "gemini", badge: "command" },
      { title: "模型选择", description: "使用 --model 参数指定 Gemini 模型版本。", code: "gemini --model gemini-2.5-pro", badge: "command" },
      { title: "非交互模式", description: "使用 -p 参数执行一次性查询，适合脚本调用。", code: "gemini -p \"解释 Docker 的工作原理\"", badge: "command" },
      { title: "@file 引用文件", description: "使用 @ 符号引用文件内容作为上下文输入。", code: "gemini\n> @src/app.ts 分析这个文件的架构", badge: "command" },
      { title: "!command 执行 Shell", description: "在对话中使用 ! 前缀直接执行 Shell 命令。", code: "gemini\n> !ls -la\n> !git status", badge: "command" },
    ],
  },
  {
    category: "典型应用场景",
    icon: Cpu,
    items: [
      { title: "代码生成与重构", description: "利用 Gemini 的大上下文窗口处理大型代码库的生成和重构任务。", badge: "scenario" },
      { title: "文件分析（@file）", description: "使用 @file 功能分析代码文件、配置文件或文档，获取详细解读。", code: "gemini\n> @package.json 分析项目依赖", badge: "scenario" },
      { title: "检查点管理", description: "Gemini CLI 支持创建和恢复对话检查点，方便在不同方案间切换。", badge: "scenario" },
      { title: "MCP 工具集成", description: "通过配置 MCP 服务器，扩展 Gemini CLI 的能力，如数据库查询、网络搜索等。", badge: "scenario" },
    ],
  },
  {
    category: "性能优化",
    icon: BarChart3,
    items: [
      { title: "/compress 压缩上下文", description: "当对话过长时使用 /compress 命令压缩历史记录，释放上下文窗口空间。", code: "gemini\n> /compress", badge: "optimize" },
      { title: "--sandbox 沙箱模式", description: "使用沙箱模式隔离代码执行环境，提高安全性。", code: "gemini --sandbox", badge: "optimize" },
      { title: "Memory 系统利用", description: "Gemini CLI 的 Memory 系统（~/.gemini/memory/）可存储跨会话的知识和偏好，提升长期使用体验。", badge: "optimize" },
    ],
  },
  {
    category: "问题排查",
    icon: Bug,
    items: [
      { title: "OAuth 授权失败", description: "检查浏览器是否正常弹出授权页面。确认 Google 账户状态正常，网络可访问 Google 服务。", badge: "debug" },
      { title: "API 配额限制", description: "免费用户有每日请求次数限制。检查 Google AI Studio 控制台查看剩余配额。升级到付费计划以获得更高限额。", badge: "debug" },
      { title: "代理设置", description: "在需要代理的网络环境中，配置 HTTP 代理环境变量。", code: "export HTTP_PROXY=http://proxy:8080\nexport HTTPS_PROXY=http://proxy:8080", badge: "debug" },
      { title: "扩展加载错误", description: "如果 MCP 扩展加载失败，检查扩展配置文件和服务器连接状态。使用 /extensions 命令查看扩展状态。", badge: "debug" },
    ],
  },
  {
    category: "常见问题 FAQ",
    icon: HelpCircle,
    items: [
      { title: "免费额度是多少？", description: "个人 Google 账户通过 AI Studio 可获得免费的 API 调用额度，具体限制包括每分钟请求数和每日 Token 总量。详细限制请查阅 Google AI Studio 文档。", badge: "faq" },
      { title: "如何切换模型？", description: "使用 --model 参数或在交互模式中使用 /model 命令切换。支持 gemini-2.5-pro、gemini-2.5-flash 等系列模型。", badge: "faq" },
      { title: "如何使用 MCP？", description: "在 ~/.gemini/settings.json 中配置 MCP 服务器，或使用 /mcp 命令管理。Gemini CLI 完全兼容 MCP 协议。", badge: "faq" },
      { title: "如何管理会话历史？", description: "会话历史存储在 ~/.gemini/history/ 目录下。使用 /history 命令查看和管理历史记录。", badge: "faq" },
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

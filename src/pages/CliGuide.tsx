import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Search, ExternalLink, Terminal, MessageSquare, Settings, KeyRound, Wrench, Keyboard, Play, Cpu, ShieldCheck, Box, Monitor, BarChart3, Bug, BookOpen, FolderOpen, Brain, Palette, ChevronDown, ChevronRight, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import type { LucideIcon } from "lucide-react";

// ─── Data types ───

interface CliCommand {
  command: string;
  description: string;
  usage?: string;
  badge?: "slash" | "flag" | "shortcut" | "cli" | "interactive" | "at" | "shell";
  subcommands?: { command: string; description: string }[];
}

interface CommandGroup {
  category: string;
  icon: LucideIcon;
  commands: CliCommand[];
}

interface CliTool {
  id: string;
  name: string;
  officialUrl: string;
  groups: CommandGroup[];
}

// ─── Badge labels & styles ───

const badgeConfig: Record<string, { label: string; className: string }> = {
  slash: { label: "斜杠命令", className: "bg-primary/15 text-primary border-primary/30" },
  flag: { label: "CLI 参数", className: "bg-accent/15 text-accent border-accent/30" },
  shortcut: { label: "快捷键", className: "bg-success/15 text-[hsl(var(--success))] border-success/30" },
  cli: { label: "CLI 命令", className: "bg-warning/15 text-[hsl(var(--warning))] border-warning/30" },
  interactive: { label: "交互命令", className: "bg-primary/15 text-primary border-primary/30" },
  at: { label: "@ 命令", className: "bg-accent/15 text-accent border-accent/30" },
  shell: { label: "! 命令", className: "bg-warning/15 text-[hsl(var(--warning))] border-warning/30" },
};

// ─── Claude Code Data ───

const claudeData: CommandGroup[] = [
  {
    category: "会话管理",
    icon: MessageSquare,
    commands: [
      { command: "/help", description: "显示帮助信息和所有可用的斜杠命令列表", badge: "slash" },
      { command: "/clear", description: "清除当前会话的对话历史，开始新的对话上下文", badge: "slash" },
      { command: "/compact [instructions]", description: "压缩当前对话历史以节省上下文窗口空间。可提供可选的压缩指令来指导摘要方式", badge: "slash" },
      { command: "/init", description: "在当前项目目录中初始化 CLAUDE.md 文件，包含项目结构和常用命令等上下文信息", badge: "slash" },
      { command: "/review", description: "请求 Claude 审查当前 Git 差异中的代码变更，提供反馈和改进建议", badge: "slash" },
    ],
  },
  {
    category: "配置与调试",
    icon: Settings,
    commands: [
      { command: "/config", description: "查看或修改 Claude Code 的配置设置，包括全局和项目级配置", badge: "slash" },
      { command: "/cost", description: "显示当前会话的 Token 使用量和 API 费用统计信息", badge: "slash" },
      { command: "/doctor", description: "运行诊断检查，验证 Claude Code 的安装状态和环境配置是否正常", badge: "slash" },
      { command: "/model", description: "切换当前会话使用的 AI 模型（如 claude-sonnet-4-20250514, claude-opus-4-20250514 等）", badge: "slash" },
      { command: "/allowed-tools", description: "管理允许 Claude 使用的工具列表，控制哪些工具可以在会话中被调用", badge: "slash" },
      { command: "/hooks", description: "管理 Claude Code 的生命周期钩子，可在特定事件（如工具调用前后）执行自定义脚本", badge: "slash" },
    ],
  },
  {
    category: "账户管理",
    icon: KeyRound,
    commands: [
      { command: "/login", description: "登录到你的 Anthropic 账户或切换到其他账户", badge: "slash" },
      { command: "/logout", description: "退出当前登录的 Anthropic 账户", badge: "slash" },
    ],
  },
  {
    category: "工具与扩展",
    icon: Wrench,
    commands: [
      { command: "/mcp", description: "管理 MCP（Model Context Protocol）服务器的连接和配置", badge: "slash" },
      { command: "/agents", description: "管理和配置自定义子代理（Sub-agents），用于委派特定任务", badge: "slash" },
      { command: "/add-dir", description: "将额外的工作目录添加到当前会话的上下文中，让 Claude 可以访问更多文件", badge: "slash" },
    ],
  },
  {
    category: "其他命令",
    icon: Bug,
    commands: [
      { command: "/bug", description: "报告 Claude Code 的 Bug，自动收集会话信息和环境数据并提交反馈", badge: "slash" },
      { command: "/status", description: "显示当前会话状态信息，包括账户、模型、上下文窗口使用情况等", badge: "slash" },
    ],
  },
  {
    category: "键盘快捷键",
    icon: Keyboard,
    commands: [
      { command: "Ctrl + C", description: "中断 Claude 当前正在进行的响应或操作", badge: "shortcut" },
      { command: "Ctrl + D", description: "退出 Claude Code 会话（等同于发送 EOF 信号）", badge: "shortcut" },
      { command: "Ctrl + L", description: "清除终端屏幕显示，保留会话历史", badge: "shortcut" },
      { command: "Esc Esc", description: "连按两次 Escape 键，编辑上一条发送的消息内容", badge: "shortcut" },
      { command: "Shift + Tab", description: "切换到多行编辑模式，方便输入多行提示词", badge: "shortcut" },
      { command: "\\ + Enter", description: "在单行模式中强制插入换行符，而不发送消息", badge: "shortcut" },
    ],
  },
  {
    category: "CLI 启动命令",
    icon: Play,
    commands: [
      { command: "claude", description: "启动交互式 REPL 会话，进入对话模式与 Claude 实时交互", usage: "claude", badge: "cli" },
      { command: 'claude "query"', description: "以初始提示词启动新会话，Claude 会立即处理并回复", usage: 'claude "帮我分析这个项目的结构"', badge: "cli" },
      { command: "claude -p", description: "管道模式（Pipe Mode），从标准输入读取内容并输出结果到标准输出，适合脚本和自动化", usage: 'cat file.py | claude -p "审查这段代码"', badge: "cli" },
      { command: "claude --continue", description: "继续上一个会话的对话上下文，恢复之前的聊天记录", usage: "claude --continue", badge: "cli" },
      { command: "claude --resume", description: "恢复指定的历史会话，可通过交互式菜单选择要恢复的会话", usage: "claude --resume", badge: "cli" },
      { command: "claude config", description: "管理 Claude Code 配置项，支持查看和修改全局/项目级设置", usage: "claude config set --global theme dark", badge: "cli" },
      { command: "claude mcp", description: "在命令行中管理 MCP 服务器的添加、删除和列表操作", usage: "claude mcp add my-server -- npx my-mcp-server", badge: "cli" },
    ],
  },
];

// ─── Codex CLI Data ───

const codexData: CommandGroup[] = [
  {
    category: "启动与运行",
    icon: Play,
    commands: [
      { command: "codex", description: "启动 Codex CLI 交互式会话，进入对话模式", badge: "cli" },
      { command: 'codex "query"', description: "以初始提示词启动 Codex，立即开始处理任务", usage: 'codex "重构这个函数以提高性能"', badge: "cli" },
      { command: "codex -q / --quiet", description: "安静模式，仅输出最终代码补丁到标准输出，不显示交互界面。适合 CI/CD 管道", usage: "codex -q '修复所有 TypeScript 类型错误'", badge: "cli" },
      { command: "codex --restore", description: "恢复上一次会话，继续之前的对话和操作上下文", badge: "cli" },
    ],
  },
  {
    category: "模型与提供者",
    icon: Cpu,
    commands: [
      { command: "--model / -m", description: "指定使用的 AI 模型。默认为 o4-mini，支持所有 OpenAI 兼容模型", usage: "codex --model gpt-4o", badge: "flag" },
      { command: "--provider / -p", description: "指定模型提供者。支持 openai（默认）、gemini、anthropic、ollama、mistral 等多种提供者", usage: "codex --provider anthropic --model claude-sonnet-4-20250514", badge: "flag" },
    ],
  },
  {
    category: "审批模式",
    icon: ShieldCheck,
    commands: [
      { command: "--approval-mode / -a", description: "设置操作审批策略，控制 Codex 执行命令和修改文件时需要的审批级别", usage: "codex -a auto-edit", badge: "flag",
        subcommands: [
          { command: "suggest", description: "默认模式。所有文件修改和命令执行都需要用户逐一确认" },
          { command: "auto-edit", description: "自动应用文件编辑，但执行 Shell 命令仍需确认" },
          { command: "full-auto", description: "完全自主模式，文件修改和命令执行均自动完成（仅在沙箱中建议使用）" },
        ],
      },
      { command: "--full-auto", description: "等同于 --approval-mode full-auto 的快捷写法，启用完全自主模式", badge: "flag" },
      { command: "--auto-edit", description: "等同于 --approval-mode auto-edit 的快捷写法，启用自动编辑模式", badge: "flag" },
    ],
  },
  {
    category: "沙箱控制",
    icon: Box,
    commands: [
      { command: "--sandbox", description: "控制命令执行的沙箱隔离环境，平衡安全性和灵活性", badge: "flag",
        subcommands: [
          { command: "docker", description: "在 Docker 容器中执行命令，提供最高级别的隔离（macOS/Linux 上的 full-auto 默认模式）" },
          { command: "none", description: "不使用沙箱，命令直接在宿主系统中执行（需谨慎使用）" },
          { command: "workspace-write", description: "使用 macOS 原生沙箱，仅允许写入当前工作区目录" },
        ],
      },
    ],
  },
  {
    category: "交互命令",
    icon: Terminal,
    commands: [
      { command: "/mode", description: "在会话中切换审批模式（suggest / auto-edit / full-auto）", badge: "interactive" },
      { command: "/model", description: "切换当前使用的 AI 模型", badge: "interactive" },
      { command: "/approval", description: "快速切换审批模式的等级", badge: "interactive" },
      { command: "/status", description: "显示当前会话的模型、审批模式、沙箱等状态信息", badge: "interactive" },
      { command: "/init", description: "生成项目的 codex.md 配置文件，包含项目上下文和指令", badge: "interactive" },
      { command: "/new", description: "清除当前对话历史，开始一个全新的会话", badge: "interactive" },
      { command: "/history", description: "查看历史会话记录，可选择恢复某个历史会话", badge: "interactive" },
    ],
  },
  {
    category: "输入与输出",
    icon: Monitor,
    commands: [
      { command: "--image / -i", description: "将本地图片文件附加到提示中，支持多模态输入让模型分析图片内容", usage: 'codex -i screenshot.png "修复这个 UI 问题"', badge: "flag" },
      { command: "--quiet / -q", description: "安静模式，仅输出生成的代码补丁（unified diff 格式），不显示 TUI 界面", badge: "flag" },
    ],
  },
  {
    category: "配置文件",
    icon: Settings,
    commands: [
      { command: "~/.codex/config.toml", description: "Codex CLI 的全局配置文件，可设置默认模型、提供者和审批模式等", badge: "cli",
        subcommands: [
          { command: "model", description: "默认使用的模型名称（如 \"o4-mini\"）" },
          { command: "provider", description: "默认模型提供者（如 \"openai\"）" },
          { command: "approval_mode", description: "默认审批模式（suggest / auto-edit / full-auto）" },
          { command: "sandbox", description: "默认沙箱策略（docker / none / workspace-write）" },
        ],
      },
      { command: "codex.md", description: "项目级配置文件，放在项目根目录。包含项目说明、技术栈、编码规范等上下文信息供 Codex 参考", badge: "cli" },
    ],
  },
];

// ─── Gemini CLI Data ───

const geminiData: CommandGroup[] = [
  {
    category: "会话管理",
    icon: MessageSquare,
    commands: [
      { command: "/help", description: "显示所有可用的斜杠命令及其简要说明", badge: "slash" },
      { command: "/clear", description: "清除当前会话的聊天历史，重置对话上下文", badge: "slash" },
      { command: "/compress", description: "压缩当前对话上下文以释放 Token 空间，保留关键信息的同时减少上下文长度", badge: "slash" },
      { command: "/copy", description: "将 Gemini 的最后一条回复内容复制到系统剪贴板", badge: "slash" },
      { command: "/quit", description: "退出 Gemini CLI 会话，返回终端", badge: "slash" },
    ],
  },
  {
    category: "对话存档",
    icon: FolderOpen,
    commands: [
      { command: "/chat save [name]", description: "将当前对话保存为命名存档，方便后续恢复。若不指定名称则自动生成", usage: "/chat save my-project", badge: "slash" },
      { command: "/chat resume [name]", description: "恢复之前保存的对话存档，继续之前的工作", usage: "/chat resume my-project", badge: "slash" },
      { command: "/chat list", description: "列出所有已保存的对话存档及其创建时间", badge: "slash" },
      { command: "/restore", description: "恢复上一次的会话上下文（不依赖命名存档），适合意外退出后的快速恢复", badge: "slash" },
    ],
  },
  {
    category: "记忆与上下文",
    icon: Brain,
    commands: [
      { command: "/memory show", description: "显示 Gemini 当前存储的长期记忆内容，包括用户偏好和项目信息", badge: "slash" },
      { command: "/memory refresh", description: "刷新记忆存储，重新加载 GEMINI.md 和其他上下文文件中的记忆数据", badge: "slash" },
      { command: "/memory add", description: "手动向 Gemini 的长期记忆中添加新的信息条目", usage: '/memory add "本项目使用 TypeScript + React 技术栈"', badge: "slash" },
    ],
  },
  {
    category: "工具与扩展",
    icon: Wrench,
    commands: [
      { command: "/tools", description: "列出当前可用的所有工具及其状态（启用/禁用），支持切换工具开关", badge: "slash" },
      { command: "/mcp", description: "管理 MCP 服务器连接，查看已连接的服务器及其提供的工具", badge: "slash" },
      { command: "/extensions", description: "管理 Gemini CLI 扩展插件，查看已安装的扩展列表", badge: "slash" },
      { command: "/skills", description: "浏览和管理可用的技能包（Skills），用于增强 Gemini 的特定领域能力", badge: "slash" },
    ],
  },
  {
    category: "设置与主题",
    icon: Palette,
    commands: [
      { command: "/settings", description: "打开设置菜单，查看和修改 Gemini CLI 的各项配置", badge: "slash" },
      { command: "/theme", description: "切换 CLI 的颜色主题（支持多种内置主题）", badge: "slash" },
      { command: "/auth", description: "管理 Google 账户认证，查看登录状态或重新登录", badge: "slash" },
      { command: "/editor", description: "打开外部文本编辑器来编写长文本提示词，编辑完成后自动发送", badge: "slash" },
      { command: "/terminal-setup", description: "配置终端环境以获得最佳的 Gemini CLI 使用体验（字体、颜色等）", badge: "slash" },
      { command: "/ide", description: "配置和管理 IDE 集成，将 Gemini CLI 与你的代码编辑器关联", badge: "slash" },
    ],
  },
  {
    category: "统计与调试",
    icon: BarChart3,
    commands: [
      { command: "/stats", description: "显示当前会话的详细统计信息，包括 Token 用量、请求次数和费用估算", badge: "slash" },
      { command: "/bug", description: "报告 Gemini CLI 的 Bug，自动收集环境和会话信息以便调试", badge: "slash" },
      { command: "/about", description: "显示 Gemini CLI 的版本、构建信息和许可证详情", badge: "slash" },
    ],
  },
  {
    category: "@ 引用命令",
    icon: BookOpen,
    commands: [
      { command: "@<file_path>", description: "将指定文件的内容注入到当前提示中，让 Gemini 可以读取和分析文件", usage: "@src/main.ts", badge: "at" },
      { command: "@<directory_path>", description: "将指定目录中所有文件的内容注入到提示中，适合批量提供上下文", usage: "@src/components/", badge: "at" },
    ],
  },
  {
    category: "! Shell 命令",
    icon: Terminal,
    commands: [
      { command: "!<shell_command>", description: "直接在终端中执行 Shell 命令并将输出传递给 Gemini 作为上下文。无需离开对话即可运行命令", usage: "!git diff HEAD~3", badge: "shell" },
    ],
  },
  {
    category: "CLI 启动选项",
    icon: Play,
    commands: [
      { command: "gemini", description: "启动 Gemini CLI 交互式会话，进入对话模式", badge: "cli" },
      { command: "--model / -m", description: "指定使用的 Gemini 模型（如 gemini-2.5-pro, gemini-2.5-flash 等）", usage: "gemini -m gemini-2.5-pro", badge: "flag" },
      { command: "--checkpointing", description: "启用自动检查点功能，定期保存会话状态以防意外中断导致进度丢失", badge: "flag" },
      { command: "-p", description: "非交互式模式，处理单次提示后立即退出，适合脚本和自动化场景", usage: 'gemini -p "生成一个 README.md 模板"', badge: "flag" },
      { command: "--sandbox", description: "在沙箱环境中运行 Gemini CLI，限制文件系统和网络访问以提高安全性", badge: "flag" },
      { command: "--allowlist", description: "指定允许 Gemini 访问的目录白名单，细粒度控制文件系统权限", usage: "--allowlist ./src,./docs", badge: "flag" },
    ],
  },
];

// ─── All tools ───

const cliTools: CliTool[] = [
  { id: "claude", name: "Claude Code", officialUrl: "https://docs.anthropic.com/en/docs/claude-code/overview", groups: claudeData },
  { id: "codex", name: "Codex CLI", officialUrl: "https://github.com/openai/codex", groups: codexData },
  { id: "gemini", name: "Gemini CLI", officialUrl: "https://github.com/google-gemini/gemini-cli", groups: geminiData },
];

// ─── Components ───

function CommandRow({ cmd }: { cmd: CliCommand }) {
  const [open, setOpen] = useState(false);
  const hasSub = cmd.subcommands && cmd.subcommands.length > 0;
  const hasUsage = !!cmd.usage;
  const expandable = hasSub || hasUsage;

  return (
    <div className="group">
      <div
        className={`flex items-start gap-3 px-3 py-2.5 rounded-md transition-colors ${expandable ? "cursor-pointer hover:bg-muted/60" : ""}`}
        onClick={() => expandable && setOpen(!open)}
      >
        {expandable ? (
          <span className="mt-1 shrink-0 text-muted-foreground">
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </span>
        ) : (
          <span className="mt-1 shrink-0 w-3.5" />
        )}
        <code className="shrink-0 rounded bg-muted px-2 py-0.5 font-mono text-sm font-semibold text-foreground">
          {cmd.command}
        </code>
        {cmd.badge && (
          <Badge variant="outline" className={`shrink-0 text-[10px] px-1.5 py-0 h-5 ${badgeConfig[cmd.badge]?.className ?? ""}`}>
            {badgeConfig[cmd.badge]?.label}
          </Badge>
        )}
        <span className="text-sm text-muted-foreground leading-relaxed">{cmd.description}</span>
      </div>

      {open && (hasUsage || hasSub) && (
        <div className="ml-10 mb-2 space-y-1.5">
          {hasUsage && (
            <div className="rounded-md bg-muted/50 border border-border px-3 py-2">
              <span className="text-xs text-muted-foreground mr-2">用法示例：</span>
              <code className="text-xs font-mono text-foreground">{cmd.usage}</code>
            </div>
          )}
          {hasSub && cmd.subcommands!.map((sub) => (
            <div key={sub.command} className="flex items-start gap-2 px-3 py-1.5">
              <code className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">{sub.command}</code>
              <span className="text-xs text-muted-foreground">{sub.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GroupSection({ group, defaultOpen }: { group: CommandGroup; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = group.icon;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
      >
        <Icon className="h-4 w-4 text-primary shrink-0" />
        <span className="font-medium text-sm text-foreground">{group.category}</span>
        <Badge variant="secondary" className="ml-auto text-[10px] h-5">{group.commands.length}</Badge>
        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </button>
      {open && (
        <div className="border-t border-border divide-y divide-border/50">
          {group.commands.map((cmd) => (
            <CommandRow key={cmd.command} cmd={cmd} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CliGuide() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("claude");
  const [allExpanded, setAllExpanded] = useState(false);

  const filteredTools = useMemo(() => {
    if (!search.trim()) return cliTools;
    const q = search.toLowerCase();
    return cliTools.map((tool) => ({
      ...tool,
      groups: tool.groups
        .map((g) => ({
          ...g,
          commands: g.commands.filter(
            (c) => c.command.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
          ),
        }))
        .filter((g) => g.commands.length > 0),
    }));
  }, [search]);

  const activeTool = filteredTools.find((t) => t.id === activeTab) ?? filteredTools[0];
  const originalTool = cliTools.find((t) => t.id === activeTab)!;

  const totalCommands = originalTool.groups.reduce((sum, g) => sum + g.commands.length, 0);
  const filteredCommands = activeTool?.groups.reduce((sum, g) => sum + g.commands.length, 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("cliGuide.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("cliGuide.subtitle")}</p>
      </div>

      {/* Tabs */}
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

        {cliTools.map((tool) => (
          <TabsContent key={tool.id} value={tool.id} className="space-y-4 mt-4">
            {/* Official link + search + expand */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("cliGuide.searchPlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAllExpanded(!allExpanded)}
                >
                  {allExpanded ? t("cliGuide.collapseAll") : t("cliGuide.expandAll")}
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" asChild>
                      <a href={tool.officialUrl} target="_blank" rel="noopener noreferrer" className="gap-1.5">
                        <ExternalLink className="h-3.5 w-3.5" />
                        {t("cliGuide.officialDocs")}
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{tool.officialUrl}</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Stats */}
            <div className="text-xs text-muted-foreground">
              {search
                ? `${t("cliGuide.showing")} ${filteredCommands} / ${totalCommands} ${t("cliGuide.commands")}`
                : `${t("cliGuide.total")} ${totalCommands} ${t("cliGuide.commands")}`}
            </div>

            {/* Command groups */}
            <div className="space-y-3">
              {activeTool?.groups.map((group) => (
                <GroupSection key={group.category} group={group} defaultOpen={allExpanded || !!search} />
              ))}
              {activeTool?.groups.length === 0 && (
                <Card className="p-8 text-center text-muted-foreground text-sm">
                  {t("cliGuide.noResults")}
                </Card>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

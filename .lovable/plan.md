
# 添加「技能使用帮助」独立页面

## 概述

新建一个独立的「技能使用帮助」页面（`/skills-guide`），完整收录 Claude Code、Codex CLI、Gemini CLI 三大工具的 Agent Skills 系统详细使用说明与配置手册。页面采用 Tab 切换 + 手风琴分组 + 搜索过滤的交互模式，与现有 `/cli-guide` 页面风格保持一致。

## 内容规划（基于官方文档）

### Claude Code Skills

分为以下模块：

1. **概述** - Skills 是什么、核心优势（复用性、渐进式披露、组合能力）
2. **快速开始** - 创建第一个 Skill 的完整步骤（创建目录、编写 SKILL.md、测试调用）
3. **存放位置** - 企业级 / 个人级 / 项目级 / 插件级四种作用域及路径说明
4. **SKILL.md 结构** - Frontmatter 字段参考表（name、description、disable-model-invocation、allowed-tools、context、agent、model、hooks 等）
5. **内容类型** - 参考内容 vs 任务内容的区别与编写方式
6. **调用控制** - 用户调用 vs 模型调用的控制方式（disable-model-invocation、user-invocable）
7. **参数传递** - $ARGUMENTS、$ARGUMENTS[N]、$N 占位符用法
8. **高级模式** - 动态上下文注入（!`command`）、子代理执行（context: fork）、权限控制
9. **预置技能** - 官方预置的 Agent Skills（PowerPoint/Excel/Word/PDF）
10. **配置模板** - 完整可用的 SKILL.md 模板（含下载功能）

### Codex CLI Skills

1. **概述** - Skills 概念、渐进式披露机制、与开放标准的关系
2. **快速开始** - 使用 $skill-creator 创建技能、手动创建
3. **存放位置** - REPO / USER / ADMIN / SYSTEM 四级作用域及路径
4. **安装技能** - $skill-installer 使用方法
5. **启用与禁用** - config.toml 中 [[skills.config]] 配置
6. **调用方式** - 显式调用（/skills、$skill-name）与隐式调用
7. **可选元数据** - agents/openai.yaml 配置（UI 元数据、策略、工具依赖）
8. **最佳实践** - 单一职责、指令优先于脚本、明确输入输出
9. **配置模板** - 完整 SKILL.md + openai.yaml 模板

### Gemini CLI Skills

1. **概述** - Agent Skills 开放标准、与 GEMINI.md 的区别、核心优势
2. **技能发现层级** - 工作区(.gemini/skills/)、用户(~/.gemini/skills/)、扩展三级
3. **会话内管理** - /skills list、/skills link、/skills disable、/skills enable、/skills reload
4. **终端管理** - gemini skills list、gemini skills link、gemini skills install、gemini skills uninstall
5. **工作机制** - 发现 → 激活 → 确认 → 注入 → 执行的完整流程
6. **创建自定义技能** - SKILL.md 格式与目录结构
7. **配置模板** - 完整 SKILL.md 模板

## 页面交互设计

```text
+----------------------------------------------------------+
| 技能使用帮助                                              |
| 三大 CLI 工具 Agent Skills 详细使用说明与配置手册          |
+----------------------------------------------------------+
| [Claude Code]  [Codex CLI]  [Gemini CLI]                  |
+----------------------------------------------------------+
| 搜索技能说明...           [全部展开] [全部折叠]            |
| 显示 X / 共 Y 条                      [官方文档 ↗]       |
+----------------------------------------------------------+
| > 概述（1 条）                                            |
|   Skills 是什么、核心优势、渐进式披露机制                  |
| > 快速开始（3 条）                                        |
|   创建目录 → 编写 SKILL.md → 测试调用                     |
| > 存放位置（4 条）                                        |
|   企业级 / 个人 / 项目 / 插件 四种作用域                   |
| > 配置参考（8 条）                                        |
|   Frontmatter 字段详解：name, description, context...     |
| > 配置模板 ⬇                                             |
|   完整 SKILL.md 模板 [下载模板]                           |
+----------------------------------------------------------+
```

每个条目包含：
- 标题（代码高亮显示路径/命令/字段名）
- 中文详细描述
- 可选的用法示例（代码块展示）
- 可选的配置模板（支持下载按钮）

### 配置模板下载

每个工具提供可下载的配置模板文件：
- Claude Code: `SKILL.md` 模板（含完整 Frontmatter + 指令示例）
- Codex CLI: `SKILL.md` + `agents/openai.yaml` 模板
- Gemini CLI: `SKILL.md` 模板

下载功能使用 `file-saver` 库（已安装），生成 `.md` / `.yaml` 文件。

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/pages/SkillsGuide.tsx` | 新建 | 技能使用帮助页面（含全部数据定义 + 搜索 + 分组 + 模板下载） |
| `src/App.tsx` | 修改 | 添加 `/skills-guide` 路由 |
| `src/components/AppSidebar.tsx` | 修改 | 添加「技能帮助」导航项（使用 `GraduationCap` 图标） |
| `src/i18n/locales/zh.ts` | 修改 | 添加 `nav.skillsGuide` 及帮助页相关翻译 |
| `src/i18n/locales/en.ts` | 修改 | 添加对应英文翻译 |

### 无新增依赖

全部使用已有组件（Tabs、Accordion、Badge、Input、Button、Card、Tooltip）和已安装库（file-saver）。

## 技术实现

### 数据结构

```typescript
interface SkillGuideItem {
  title: string;           // 条目标题
  description: string;     // 中文详细描述
  code?: string;           // 代码示例
  badge?: "path" | "command" | "field" | "config" | "template";
  table?: { headers: string[]; rows: string[][] };  // 表格数据
}

interface SkillGuideGroup {
  category: string;        // 分组名
  icon: LucideIcon;
  items: SkillGuideItem[];
}

interface SkillGuideTool {
  id: string;
  name: string;
  officialUrl: string;
  groups: SkillGuideGroup[];
  templates: {             // 可下载模板
    filename: string;
    content: string;
    label: string;
  }[];
}
```

### 搜索功能

- 实时过滤：匹配标题或描述中的关键词
- 自动展开匹配分组
- 显示匹配/总数统计

### 视觉设计

- 与 `/cli-guide` 页面风格完全一致
- 代码块使用 `font-mono` + 背景色高亮
- Badge 区分条目类型（路径/命令/字段/配置/模板）
- 表格使用 Table 组件展示结构化参考数据
- 模板下载按钮使用 Download 图标
- 支持暗色主题

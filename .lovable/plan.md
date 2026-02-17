
# Providers / MCP Servers / Skills 综合优化计划

## 1. 表单必填/选填标识

### Providers
- **必填**: 名称, 类型, 应用类型
- **选填**: API Key, Base URL (官方类型自动填充)
- 在 Label 后添加红色 `*` 标识必填项，选填项添加灰色 "(选填)" 后缀

### MCP Servers
- **必填**: 名称, 传输类型
- **条件必填**: Command (stdio 模式), URL (http/sse 模式)
- **选填**: Arguments, 环境变量, 绑定应用

### Skills 仓库表单
- **必填**: 仓库所有者, 仓库名
- **选填**: 分支 (默认 main), 子目录, 是否默认

在保存按钮的 disabled 条件中同步校验必填项。

---

## 2. Skills 页面优化

### 2.1 列表/卡片视图切换
- 在 Skills 标签内顶部添加 `ToggleGroup`，支持 "卡片" 和 "列表" 两种视图
- 列表视图使用 `Table` 组件展示：名称、来源仓库、描述、安装状态、操作
- 使用 `localStorage` 持久化用户的视图偏好

### 2.2 技能筛选
- 添加搜索输入框，按名称和描述模糊匹配
- 添加 Select 下拉筛选：按仓库来源、按安装状态 (全部/已安装/未安装)

### 2.3 技能描述中文 Tips
- 使用 `Tooltip` 组件包裹技能卡片/列表的描述区域
- 在 Tooltip 中显示完整的中文说明

---

## 3. GitHub API 404 修复

`anthropics/claude-code` 仓库的 `skills` 目录不存在（GitHub API 返回 404）。

**修复方案**：
- 将默认仓库配置从 `{ subdirectory: "skills" }` 改为 `{ subdirectory: "" }`，扫描仓库根目录
- 或者移除此默认仓库预设，因为该路径实际不存在
- 在 `scanSkills` 函数中增加更友好的错误提示：当 404 时提示 "仓库路径不存在，请检查子目录配置"

---

## 4. 高 Stars 技能仓库预置

在 Skills 页面的 "添加仓库" 对话框中，将默认仓库预设扩展为分类展示。

### 仓库分类与预置列表

**总榜 Top 10** (综合高 Stars MCP/AI 相关仓库):
- `modelcontextprotocol/servers` - MCP 官方服务器集合
- `anthropics/courses` - Anthropic 官方课程
- `punkpeye/awesome-mcp-servers` - MCP 服务器合集
- `wong2/chatgpt-google-extension` - ChatGPT 浏览器扩展
- `anthropics/anthropic-cookbook` - Anthropic 实战示例
- `openai/openai-cookbook` - OpenAI 实战示例
- `microsoft/semantic-kernel` - 微软 AI 编排框架
- `langchain-ai/langchain` - LangChain 框架
- `run-llama/llama_index` - LlamaIndex 框架
- `lobehub/lobe-chat` - Lobe Chat 开源项目

**研发类**:
- `anthropics/anthropic-cookbook`, `openai/openai-cookbook`, `modelcontextprotocol/servers`, `microsoft/semantic-kernel`, `langchain-ai/langchain`, `run-llama/llama_index`, `sigoden/aichat`, `continuedev/continue`, `cline/cline`, `sourcegraph/cody`

**设计类**:
- `penpot/penpot`, `excalidraw/excalidraw`, `tldraw/tldraw`, `theatre-js/theatre`, `rive-app/rive-wasm`, `imgly/cesdk-web-examples`, `BuilderIO/figma-html`, `tokens-studio/figma-plugin`, `jina-ai/reader`, `markdoc/markdoc`

**办公类**:
- `lobehub/lobe-chat`, `ChatGPTNextWeb/ChatGPT-Next-Web`, `langgenius/dify`, `n8n-io/n8n`, `FlowiseAI/Flowise`, `makeplane/plane`, `AppFlowy-IO/AppFlowy`, `twentyhq/twenty`, `hoppscotch/hoppscotch`, `nocodb/nocodb`

**QA 测试类**:
- `microsoft/playwright`, `puppeteer/puppeteer`, `cypress-io/cypress`, `SeleniumHQ/selenium`, `grafana/k6`, `locustio/locust`, `postmanlabs/httpbin`, `mockoon/mockoon`, `stoplightio/prism`, `karatelabs/karate`

**文档处理类**:
- `jina-ai/reader`, `unstructuredai/unstructured`, `DS4SD/docling`, `VikParuchuri/marker`, `opendatalab/MinerU`, `Stirling-Tools/Stirling-PDF`, `gotenberg/gotenberg`, `pandoc/pandoc`, `azimutt/azimutt`, `mermaid-js/mermaid`

### UI 实现
- 在添加仓库对话框中使用 `Tabs` 按分类组织预置仓库
- 每个分类 Tab 下以按钮列表展示，点击一键添加
- 按钮显示 `owner/repo` 格式

---

## 技术实现细节

### 修改文件清单

| 文件 | 改动 |
|------|------|
| `src/pages/Providers.tsx` | Label 添加必填标识 |
| `src/pages/McpServers.tsx` | Label 添加必填标识 |
| `src/pages/Skills.tsx` | 视图切换、筛选、Tips、仓库预置分类、404 修复 |
| `src/i18n/locales/zh.ts` | 新增筛选/视图切换/分类相关中文翻译 |
| `src/i18n/locales/en.ts` | 对应英文翻译 |

### 依赖
- 使用已有的 `Table`, `ToggleGroup`, `Tooltip`, `Tabs`, `Select` 组件
- 无需新增依赖


# 基于真实本地文件的导出格式偏差评估与修正

## 三份上传文件揭示的真实偏差

### 文件一：`%userprofile%\.claude.json`（注意：是根目录的 .claude.json，不是 settings.json）

真实结构发现：
- `.claude.json` 是 Claude Code 的**运行时状态文件**（启动次数、tips历史、MCP servers 连接状态等），**不是用户需要手动配置的文件**，不应导出此文件

### 文件二：`%userprofile%\.claude\settings.json`（这才是真正的配置文件）

用户真实的 settings.json：
```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "sk-...",
    "ANTHROPIC_BASE_URL": "https://api.kimi.com/coding/",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "kimi-for-coding",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "kimi-for-coding",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "kimi-for-coding",
    "ANTHROPIC_MODEL": "kimi-for-coding",
    "API_TIMEOUT_MS": "3000000",
    "CLAUDE_CODE_AUTO_APPROVE": "true",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1"
  },
  "model": "kimi-for-coding",
  "permissions": {
    "allow": ["*"],
    "deny": []
  }
}
```

**关键发现**：
1. Claude Code 的 Provider（API Key、Base URL、Model）**直接写入 `settings.json` 的 `env` 字段**，而非通过 `env.sh` 环境变量！
2. 文件包含 `$schema` 字段（JSON Schema 引用）
3. 包含 `model` 字段（指定默认模型）
4. 包含 `permissions` 字段
5. **我们当前生成的 `settings.json` 只有 `mcpServers`，完全缺少 `env` / `model` / `permissions` 字段**
6. **我们生成的 `env.sh` 是错误的方式**——用户实际上把这些环境变量放在 `settings.json["env"]` 里，不是 shell 脚本

### 文件三：`%userprofile%\.codex\config.toml`（注意：是 TOML 格式，不是 YAML！）

用户真实的 config.toml：
```toml
model = "gpt-5.3-codex"
model_reasoning_effort = "xhigh"
personality = "pragmatic"

[mcp_servers.playwright]
type = "stdio"
command = "npx"
args = ["@playwright/mcp@latest"]

[mcp_servers.context7]
type = "stdio"
command = "npx"
args = ["-y", "@upstash/context7-mcp@latest"]
description = "Context7 上下文增强"

[mcp_servers.chrome_devtools]
url = "http://localhost:3000/mcp"
...

[mcp_servers.openaiDeveloperDocs]
url = "https://developers.openai.com/mcp"
```

**关键发现**：
1. **格式是 TOML，不是 YAML！** 当前实现生成 `config.yaml` 完全错误
2. **文件名是 `config.toml`，不是 `config.yaml`**
3. **MCP Servers 直接在 `config.toml` 里用 `[mcp_servers.name]` 表格格式定义，不是单独的 `mcp.json`！**
4. HTTP 类型服务器只有 `url` 字段（无 `type` 字段），Stdio 类型有 `type`、`command`、`args`、可选 `description`
5. 支持 `enabled_tools`、`disabled_tools`、`startup_timeout_sec`、`tool_timeout_sec`、`enabled` 字段
6. 顶层有 `model`、`model_reasoning_effort`、`personality` 字段

---

## 当前实现与真实格式偏差总结

| 项目 | 当前实现（错误） | 真实格式（正确） |
|------|-----------------|-----------------|
| Claude `settings.json` 内容 | 仅 `mcpServers` | `$schema` + `env`（含 API Key/URL/Model）+ `model` + `permissions` + `mcpServers` |
| Claude Provider 输出方式 | 生成 `env.sh` | 写入 `settings.json["env"]` |
| Codex 文件名 | `config.yaml` | `config.toml` |
| Codex 文件格式 | YAML | **TOML** |
| Codex MCP 位置 | 单独 `mcp.json` | **内嵌在 `config.toml` 的 `[mcp_servers.name]` 表格中** |
| Codex MCP 字段名 | `mcpServers` | `mcp_servers`（下划线） |
| Claude MCP 导出路径 | 放在 `settings.json` 中 | 正确 ✓ |

---

## 修正方案

### 修正一：Claude Code `settings.json` 重构

新的 `settings.json` 必须合并 MCP 和 Provider 配置：

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "<api_key>",
    "ANTHROPIC_BASE_URL": "<base_url>",
    "ANTHROPIC_MODEL": "<model>",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "<model>",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "<model>",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "<model>"
  },
  "model": "<model-id>",
  "permissions": {
    "allow": ["*"],
    "deny": []
  },
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "some-mcp"]
    }
  }
}
```

逻辑：
- 如果有启用的自定义 Provider（provider_type != "official"），填充 `env` 和 `model` 字段
- `env` 中的 `ANTHROPIC_AUTH_TOKEN` 对应 api_key，`ANTHROPIC_BASE_URL` 对应 base_url
- 从 Provider 的 `model_config` 提取 model 名称（如有），否则留空
- **删除 `env.sh`** 生成逻辑（这不是 Claude 的正确配置方式）
- MCP Servers 保留在 `mcpServers` 字段

### 修正二：Codex `config.toml` 重构（TOML 格式）

从 `config.yaml` 改为 `config.toml`，格式完全重写：

```toml
# CC Switch - Codex CLI 配置
# 放置路径: ~/.codex/config.toml

model = "o4-mini"
provider = "openai"

[mcp_servers.server-name]
type = "stdio"
command = "npx"
args = ["-y", "some-mcp-server"]

[mcp_servers.http-server]
url = "https://example.com/mcp"
```

关键规则：
- 顶层字段：`model`、`provider`（可选）
- Stdio MCP：`[mcp_servers.<name>]` 下 `type = "stdio"`、`command`、`args`
- HTTP MCP：`[mcp_servers.<name>]` 下只需 `url`（无需 type 字段）
- **删除单独的 `mcp.json`**，MCP 内嵌在 `config.toml`
- **删除 `config.yaml`**（格式错误）

### 修正三：导出页面 UI 文件路径更新

将 Codex 导出卡片中的文件列表从：
- `config.yaml` → `~/.codex/config.yaml` ❌
- `mcp.json` → `~/.codex/mcp.json` ❌

改为：
- `config.toml` → `~/.codex/config.toml` ✓（含 MCP Servers）

---

## 技术实现细节

### TOML 生成

项目中没有安装 TOML 序列化库，需要手动拼接字符串（TOML 格式简单，手写生成函数可靠）：

```typescript
function generateCodexConfigToml(providers: any[], mcps: any[]): string {
  const lines: string[] = [
    "# CC Switch - Codex CLI 配置",
    "# 放置路径: ~/.codex/config.toml",
    "",
    'model = "o4-mini"',
  ];
  
  // MCP Servers (stdio)
  mcps.forEach((m) => {
    lines.push("");
    lines.push(`[mcp_servers.${m.name}]`);
    if (m.transport_type === "stdio") {
      lines.push(`type = "stdio"`);
      lines.push(`command = "${m.command}"`);
      const args = (Array.isArray(m.args) ? m.args : []).map((a: string) => `"${a}"`).join(", ");
      lines.push(`args = [${args}]`);
    } else {
      lines.push(`url = "${m.url}"`);
    }
  });
  
  return lines.join("\n") + "\n";
}
```

### Claude settings.json 合并逻辑

```typescript
function buildClaudeSettingsJson(mcps: any[], providers: any[]): object {
  const result: any = {
    "$schema": "https://json.schemastore.org/claude-code-settings.json",
  };
  
  const customProvider = providers.find(p => p.provider_type !== "official" && p.enabled);
  if (customProvider) {
    result.env = {};
    if (customProvider.api_key) result.env["ANTHROPIC_AUTH_TOKEN"] = customProvider.api_key;
    if (customProvider.base_url) result.env["ANTHROPIC_BASE_URL"] = customProvider.base_url;
    // model from model_config if available
  }
  
  result.permissions = { allow: ["*"], deny: [] };
  
  const mcpServersObj = buildMcpServersObject(mcps);
  if (Object.keys(mcpServersObj).length > 0) {
    result.mcpServers = mcpServersObj;
  }
  
  return result;
}
```

---

## 文件变更清单

| 文件 | 操作 | 核心变更 |
|------|------|---------|
| `src/pages/Export.tsx` | 修改 | 1) 重写 `exportClaude`：settings.json 合并 Provider env 字段，删除 env.sh；2) 重写 `exportCodex`：改为生成 TOML 格式 config.toml，删除 mcp.json；3) 更新 `appCards` 中 Codex 文件路径说明 |
| `src/i18n/locales/zh.ts` | 修改 | 更新 Codex 路径说明文案 `config.toml` |
| `src/i18n/locales/en.ts` | 修改 | 对应英文文案 |

**无数据库变更，无新增依赖**（TOML 手动拼接字符串）

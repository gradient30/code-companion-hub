import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Pencil, Trash2, Server, Loader2, Wifi, Terminal, Radio, Activity, CheckCircle2, XCircle, Info, FolderOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTranslation } from "react-i18next";
import { HelpDialog } from "@/components/HelpDialog";
import type { Tables } from "@/integrations/supabase/types";

type McpServer = Tables<"mcp_servers">;

const TRANSPORT_TYPES = [
  { value: "stdio", label: "Stdio", icon: Terminal },
  { value: "http", label: "HTTP", icon: Wifi },
  { value: "sse", label: "SSE", icon: Radio },
] as const;

const APP_OPTIONS = ["claude", "codex", "gemini", "opencode"] as const;

type McpTemplate = { name: string; transport_type: string; command: string; args: string[]; desc: string };

const MCP_PRESETS: Record<string, { label: string; items: McpTemplate[] }> = {
  browser: {
    label: "🌐 浏览器与测试",
    items: [
      { name: "playwright", transport_type: "stdio", command: "npx", args: ["@playwright/mcp@latest"], desc: "浏览器自动化与端到端测试" },
      { name: "puppeteer", transport_type: "stdio", command: "npx", args: ["-y", "@modelcontextprotocol/server-puppeteer"], desc: "Chrome 自动化与网页爬取" },
    ],
  },
  search: {
    label: "🔍 搜索与网络",
    items: [
      { name: "mcp-fetch", transport_type: "stdio", command: "npx", args: ["-y", "@anthropics/mcp-fetch"], desc: "网络请求与网页抓取" },
      { name: "brave-search", transport_type: "stdio", command: "npx", args: ["-y", "@modelcontextprotocol/server-brave-search"], desc: "Brave 实时网络搜索" },
      { name: "context7", transport_type: "stdio", command: "npx", args: ["-y", "@upstash/context7-mcp@latest"], desc: "上下文增强，实时获取最新文档" },
    ],
  },
  data: {
    label: "💾 数据与存储",
    items: [
      { name: "sqlite", transport_type: "stdio", command: "npx", args: ["-y", "@modelcontextprotocol/server-sqlite", "--db-path", "/path/to/db"], desc: "SQLite 数据库操作" },
      { name: "postgres", transport_type: "stdio", command: "npx", args: ["-y", "@modelcontextprotocol/server-postgres", "postgresql://localhost/mydb"], desc: "PostgreSQL 数据库连接" },
      { name: "mcp-memory", transport_type: "stdio", command: "npx", args: ["-y", "@anthropics/mcp-memory"], desc: "跨对话持久化记忆存储" },
      { name: "mcp-filesystem", transport_type: "stdio", command: "npx", args: ["-y", "@anthropics/mcp-filesystem", "/path"], desc: "本地文件系统读写" },
    ],
  },
  devtools: {
    label: "🛠️ 开发工具",
    items: [
      { name: "github", transport_type: "stdio", command: "npx", args: ["-y", "@modelcontextprotocol/server-github"], desc: "GitHub 仓库/Issue/PR 操作" },
      { name: "sequential-thinking", transport_type: "stdio", command: "npx", args: ["-y", "@modelcontextprotocol/server-sequential-thinking"], desc: "增强逐步推理能力" },
      { name: "everything", transport_type: "stdio", command: "npx", args: ["-y", "@modelcontextprotocol/server-everything"], desc: "MCP 全功能测试服务" },
    ],
  },
  collab: {
    label: "💬 协作与通信",
    items: [
      { name: "slack", transport_type: "stdio", command: "npx", args: ["-y", "@modelcontextprotocol/server-slack"], desc: "Slack 消息与频道管理" },
    ],
  },
};

const MCP_PRESET_KEYS = Object.keys(MCP_PRESETS);

interface EnvEntry { key: string; value: string }

function McpServerForm({
  initial,
  onSave,
  saving,
}: {
  initial?: Partial<McpServer>;
  onSave: (data: Partial<McpServer>) => void;
  saving: boolean;
}) {
  const initBindings = Array.isArray(initial?.app_bindings) ? (initial.app_bindings as string[]) : ["claude"];
  const initArgs = Array.isArray(initial?.args) ? (initial.args as string[]) : [];
  const initEnv = initial?.env && typeof initial.env === "object" && !Array.isArray(initial.env)
    ? Object.entries(initial.env as Record<string, string>).map(([key, value]) => ({ key, value }))
    : [];

  const [form, setForm] = useState({
    name: initial?.name || "",
    transport_type: initial?.transport_type || "stdio",
    command: initial?.command || "",
    url: initial?.url || "",
    enabled: initial?.enabled ?? true,
  });
  const [appBindings, setAppBindings] = useState<string[]>(initBindings);
  const [args, setArgs] = useState<string>(initArgs.join(" "));
  const [envEntries, setEnvEntries] = useState<EnvEntry[]>(initEnv.length > 0 ? initEnv : [{ key: "", value: "" }]);

  const toggleBinding = (app: string) => {
    setAppBindings((prev) =>
      prev.includes(app) ? prev.filter((a) => a !== app) : [...prev, app]
    );
  };

  const updateEnv = (index: number, field: "key" | "value", val: string) => {
    setEnvEntries((prev) => prev.map((e, i) => (i === index ? { ...e, [field]: val } : e)));
  };

  const handleSave = () => {
    const envObj: Record<string, string> = {};
    envEntries.forEach((e) => { if (e.key.trim()) envObj[e.key.trim()] = e.value; });
    const argsArr = args.trim() ? args.trim().split(/\s+/) : [];
    onSave({
      name: form.name,
      transport_type: form.transport_type,
      command: form.transport_type === "stdio" ? form.command : null,
      url: form.transport_type !== "stdio" ? form.url : null,
      args: argsArr as unknown as McpServer["args"],
      env: envObj as unknown as McpServer["env"],
      app_bindings: appBindings as unknown as McpServer["app_bindings"],
      enabled: form.enabled,
    });
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="space-y-2">
        <Label>名称 <span className="text-destructive">*</span></Label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="MCP Server 名称" maxLength={100} />
      </div>
      <div className="space-y-2">
        <Label>传输类型 <span className="text-destructive">*</span></Label>
        <Select value={form.transport_type} onValueChange={(v) => setForm({ ...form, transport_type: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {TRANSPORT_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {form.transport_type === "stdio" ? (
        <>
          <div className="space-y-2">
            <Label>Command <span className="text-destructive">*</span></Label>
            <Input value={form.command} onChange={(e) => setForm({ ...form, command: e.target.value })} placeholder="npx" maxLength={500} />
          </div>
          <div className="space-y-2">
            <Label>Arguments <span className="text-xs text-muted-foreground ml-1">(选填，空格分隔)</span></Label>
            <Input value={args} onChange={(e) => setArgs(e.target.value)} placeholder="-y @anthropics/mcp-fetch" maxLength={1000} />
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <Label>URL <span className="text-destructive">*</span></Label>
          <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="http://localhost:3000/mcp" maxLength={500} />
        </div>
      )}

      <div className="space-y-2">
        <Label>环境变量 <span className="text-xs text-muted-foreground ml-1">(选填)</span></Label>
        {envEntries.map((entry, i) => (
          <div key={i} className="flex gap-2">
            <Input value={entry.key} onChange={(e) => updateEnv(i, "key", e.target.value)} placeholder="KEY" className="flex-1" maxLength={100} />
            <Input value={entry.value} onChange={(e) => updateEnv(i, "value", e.target.value)} placeholder="value" className="flex-1" maxLength={500} />
            {envEntries.length > 1 && (
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setEnvEntries((prev) => prev.filter((_, j) => j !== i))}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setEnvEntries([...envEntries, { key: "", value: "" }])}>
          <Plus className="mr-1 h-3 w-3" />添加变量
        </Button>
      </div>

      <div className="space-y-2">
        <Label>绑定应用 <span className="text-xs text-muted-foreground ml-1">(选填)</span></Label>
        <div className="flex flex-wrap gap-3">
          {APP_OPTIONS.map((app) => (
            <label key={app} className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={appBindings.includes(app)} onCheckedChange={() => toggleBinding(app)} />
              <span className="text-sm capitalize">{app}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Label>启用</Label>
        <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
      </div>

      <Button className="w-full" onClick={handleSave} disabled={saving || !form.name.trim() || (form.transport_type === "stdio" ? !form.command.trim() : !form.url.trim())}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        保存
      </Button>
    </div>
  );
}

export default function McpServers() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<McpServer | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string; latency_ms?: number }>>({});

  const testConnection = async (server: McpServer) => {
    setTestingId(server.id);
    setTestResults((prev) => ({ ...prev, [server.id]: undefined as any }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-connection`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            type: "mcp_server",
            transport_type: server.transport_type,
            command: server.command,
            url: server.url,
            args: Array.isArray(server.args) ? server.args : [],
          }),
        }
      );
      const result = await resp.json();
      setTestResults((prev) => ({ ...prev, [server.id]: result }));
      toast({
        title: result.success ? "测试通过" : "测试失败",
        description: result.message + (result.latency_ms ? ` (${result.latency_ms}ms)` : ""),
        variant: result.success ? "default" : "destructive",
      });
    } catch (e: any) {
      const result = { success: false, message: e.message };
      setTestResults((prev) => ({ ...prev, [server.id]: result }));
      toast({ title: "测试失败", description: e.message, variant: "destructive" });
    } finally {
      setTestingId(null);
    }
  };

  const { data: servers = [], isLoading } = useQuery({
    queryKey: ["mcp_servers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mcp_servers").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return data as McpServer[];
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<McpServer>) => {
      const { error } = await supabase.from("mcp_servers").insert({ ...data, user_id: user!.id, name: data.name! });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["mcp_servers"] }); setDialogOpen(false); toast({ title: "创建成功" }); },
    onError: (e) => toast({ title: "创建失败", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<McpServer> & { id: string }) => {
      const { error } = await supabase.from("mcp_servers").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["mcp_servers"] }); setEditingServer(null); toast({ title: "更新成功" }); },
    onError: (e) => toast({ title: "更新失败", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mcp_servers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["mcp_servers"] }); toast({ title: "删除成功" }); },
    onError: (e) => toast({ title: "删除失败", description: e.message, variant: "destructive" }),
  });

  const toggleEnabled = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase.from("mcp_servers").update({ enabled }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mcp_servers"] }),
  });

  const applyTemplate = (tpl: McpTemplate) => {
    createMutation.mutate({
      name: tpl.name,
      transport_type: tpl.transport_type,
      command: tpl.command,
      args: tpl.args as unknown as McpServer["args"],
    });
  };

  const getTransportIcon = (type: string) => {
    const t = TRANSPORT_TYPES.find((tt) => tt.value === type);
    return t ? t.icon : Terminal;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-2xl font-bold">{t("mcp.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("mcp.subtitle")}</p>
          </div>
          <HelpDialog sections={[
            { title: t("helpMcp.what"), content: t("helpMcp.whatDesc"), tip: t("helpMcp.whatTip") },
            { title: t("helpMcp.transport"), content: t("helpMcp.transportDesc"), tip: t("helpMcp.transportTip") },
            { title: t("helpMcp.templates"), content: t("helpMcp.templatesDesc"), tip: t("helpMcp.templatesTip") },
            { title: t("helpMcp.env"), content: t("helpMcp.envDesc"), tip: t("helpMcp.envTip") },
            { title: t("helpMcp.bindings"), content: t("helpMcp.bindingsDesc"), tip: t("helpMcp.bindingsTip") },
          ]} />
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />新增 MCP Server</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>新增 MCP Server</DialogTitle></DialogHeader>
            <Tabs defaultValue="browser" className="mb-4">
              <TabsList className="flex-wrap h-auto gap-1">
                {MCP_PRESET_KEYS.map((key) => (
                  <TabsTrigger key={key} value={key} className="text-xs">{MCP_PRESETS[key].label}</TabsTrigger>
                ))}
              </TabsList>
              {MCP_PRESET_KEYS.map((key) => (
                <TabsContent key={key} value={key} className="mt-2">
                  <div className="grid grid-cols-2 gap-1.5">
                    {MCP_PRESETS[key].items.map((tpl) => (
                      <TooltipProvider key={tpl.name} delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="sm" className="justify-start text-xs" onClick={() => applyTemplate(tpl)}>
                              {tpl.name}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom"><p className="text-xs max-w-[200px]">{tpl.desc}</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
            <McpServerForm onSave={(data) => createMutation.mutate(data)} saving={createMutation.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Local Deployment Banner */}
      <Alert className="border-primary/30 bg-primary/5">
        <Info className="h-4 w-4 text-primary" />
        <AlertTitle className="text-sm font-semibold">本地部署说明</AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          <p className="text-sm text-muted-foreground">
            配置已实时备份到云端。Web 端无法直接修改本地文件系统（浏览器安全限制），需通过「导出配置」将文件手动放置到本地路径才能生效：
          </p>
          <ul className="text-xs text-muted-foreground space-y-1 ml-1">
            <li><code className="bg-muted px-1 rounded">Claude Code</code> → <code className="bg-muted px-1 rounded">~/.claude/settings.json</code></li>
            <li><code className="bg-muted px-1 rounded">Codex CLI</code> → <code className="bg-muted px-1 rounded">~/.codex/config.json</code></li>
            <li><code className="bg-muted px-1 rounded">Gemini CLI</code> → <code className="bg-muted px-1 rounded">~/.gemini/settings.json</code></li>
            <li><code className="bg-muted px-1 rounded">OpenCode</code> → <code className="bg-muted px-1 rounded">~/.config/opencode/config.json</code></li>
          </ul>
          <Button size="sm" variant="outline" className="mt-1 h-7 text-xs" onClick={() => navigate("/export")}>
            <FolderOpen className="mr-1.5 h-3 w-3" />前往导出配置
          </Button>
        </AlertDescription>
      </Alert>

      {servers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Server className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-lg font-medium text-muted-foreground">暂无 MCP Server</p>
            <p className="text-sm text-muted-foreground/60">点击「新增 MCP Server」开始配置</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {servers.map((server) => {
            const Icon = getTransportIcon(server.transport_type);
            const bindings = Array.isArray(server.app_bindings) ? (server.app_bindings as string[]) : [];
            return (
              <Card key={server.id} className={`transition-opacity ${!server.enabled ? "opacity-50" : ""}`}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 rounded-md bg-muted p-1.5">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{server.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{server.transport_type}</p>
                    </div>
                  </div>
                  <Switch
                    checked={server.enabled}
                    onCheckedChange={(v) => toggleEnabled.mutate({ id: server.id, enabled: v })}
                  />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {server.transport_type === "stdio" ? (
                      <p className="truncate text-xs text-muted-foreground font-mono">
                        {server.command} {Array.isArray(server.args) ? (server.args as string[]).join(" ") : ""}
                      </p>
                    ) : (
                      <p className="truncate text-xs text-muted-foreground">{server.url}</p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {bindings.map((app) => (
                        <Badge key={app} variant="secondary" className="text-[10px] capitalize">{app}</Badge>
                      ))}
                    </div>
                    <div className="flex gap-1 pt-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={testingId === server.id}
                        onClick={() => testConnection(server)}
                        title="测试连接"
                      >
                        {testingId === server.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : testResults[server.id]?.success === true ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        ) : testResults[server.id]?.success === false ? (
                          <XCircle className="h-3 w-3 text-destructive" />
                        ) : (
                          <Activity className="h-3 w-3" />
                        )}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingServer(server)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(server.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!editingServer} onOpenChange={(open) => !open && setEditingServer(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>编辑 MCP Server</DialogTitle></DialogHeader>
          {editingServer && (
            <McpServerForm
              initial={editingServer}
              onSave={(data) => updateMutation.mutate({ id: editingServer.id, ...data })}
              saving={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

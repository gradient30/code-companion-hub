import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Download, Upload, Link2, Package, Database, FileArchive, Copy, Loader2, CheckCircle2, FileCode, FileText, Settings } from "lucide-react";
import { HelpDialog } from "@/components/HelpDialog";
import { useTranslation } from "react-i18next";
import JSZip from "jszip";
import { saveAs } from "file-saver";

// ─── helpers ────────────────────────────────────────────────────────────────

/** Build mcpServers object (Claude / Gemini / Codex format) */
function buildMcpServersObject(mcps: any[]): Record<string, any> {
  const result: Record<string, any> = {};
  mcps.forEach((m) => {
    if (m.transport_type === "stdio") {
      const entry: any = { command: m.command, args: Array.isArray(m.args) ? m.args : [] };
      if (m.env && typeof m.env === "object" && Object.keys(m.env).length > 0) {
        entry.env = m.env;
      }
      result[m.name] = entry;
    } else {
      // http / sse
      const entry: any = { type: m.transport_type, url: m.url };
      result[m.name] = entry;
    }
  });
  return result;
}

/** Generate SKILL.md content from skill record */
function generateSkillMd(skill: { name: string; description: string | null }): string {
  const description = skill.description || "";
  return `---
name: ${skill.name}
description: ${description}
version: "1.0"
tags: []
---

# ${skill.name}

${description}
`;
}

/** Build Claude Code settings.json — merges MCP + Provider env fields */
function buildClaudeSettingsJson(mcps: any[], providers: any[]): object {
  const result: any = {
    $schema: "https://json.schemastore.org/claude-code-settings.json",
  };

  // Custom (non-official) enabled provider → write into env block
  const customProvider = providers.find((p) => p.provider_type !== "official" && p.enabled);
  if (customProvider) {
    result.env = {} as Record<string, string>;
    if (customProvider.api_key) result.env["ANTHROPIC_AUTH_TOKEN"] = customProvider.api_key;
    if (customProvider.base_url) result.env["ANTHROPIC_BASE_URL"] = customProvider.base_url;
    // Extract model from model_config if present
    const modelId =
      customProvider.model_config &&
      typeof customProvider.model_config === "object" &&
      (customProvider.model_config as any).model;
    if (modelId) {
      result.env["ANTHROPIC_MODEL"] = modelId;
      result.env["ANTHROPIC_DEFAULT_SONNET_MODEL"] = modelId;
      result.env["ANTHROPIC_DEFAULT_HAIKU_MODEL"] = modelId;
      result.env["ANTHROPIC_DEFAULT_OPUS_MODEL"] = modelId;
      result.model = modelId;
    }
  }

  result.permissions = { allow: ["*"], deny: [] };

  const mcpServersObj = buildMcpServersObject(mcps);
  if (Object.keys(mcpServersObj).length > 0) {
    result.mcpServers = mcpServersObj;
  }

  return result;
}

/** Generate Codex config.toml — TOML format, MCP inline as [mcp_servers.name] */
function generateCodexConfigToml(providers: any[], mcps: any[]): string {
  const lines: string[] = [
    "# CC Switch - Codex CLI 配置",
    "# 放置路径: ~/.codex/config.toml",
    "",
  ];

  // Top-level model / provider from enabled custom provider
  const customProvider = providers.find((p) => p.provider_type !== "official" && p.enabled);
  const modelId =
    customProvider?.model_config &&
    typeof customProvider.model_config === "object" &&
    (customProvider.model_config as any).model;

  lines.push(`model = "${modelId || "o4-mini"}"`);
  if (customProvider?.api_key) {
    lines.push(`api_key = "${customProvider.api_key}"`);
  }
  if (customProvider?.base_url) {
    lines.push(`provider_base_url = "${customProvider.base_url}"`);
  }

  // MCP Servers — embedded as [mcp_servers.<name>] tables
  mcps.forEach((m) => {
    lines.push("");
    // Sanitize key: TOML keys cannot have spaces or special chars
    const key = m.name.replace(/[^a-zA-Z0-9_-]/g, "_");
    lines.push(`[mcp_servers.${key}]`);
    if (m.transport_type === "stdio") {
      lines.push(`type = "stdio"`);
      if (m.command) lines.push(`command = "${m.command}"`);
      const args = (Array.isArray(m.args) ? m.args : [])
        .map((a: string) => `"${String(a).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`)
        .join(", ");
      lines.push(`args = [${args}]`);
    } else {
      // http / sse — only url, no type field (per real config.toml spec)
      lines.push(`url = "${m.url}"`);
    }
    if (m.env && typeof m.env === "object" && Object.keys(m.env).length > 0) {
      Object.entries(m.env).forEach(([k, v]) => {
        lines.push(`env.${k} = "${String(v).replace(/"/g, '\\"')}"`);
      });
    }
  });

  return lines.join("\n") + "\n";
}

// ─── component ───────────────────────────────────────────────────────────────

export default function Export() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [exporting, setExporting] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [deepLink, setDeepLink] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: providers = [] } = useQuery({
    queryKey: ["providers"],
    queryFn: async () => {
      const { data } = await supabase.from("providers").select("*").order("sort_order");
      return data || [];
    },
    enabled: !!user,
  });

  const { data: mcpServers = [] } = useQuery({
    queryKey: ["mcp_servers"],
    queryFn: async () => {
      const { data } = await supabase.from("mcp_servers").select("*").order("created_at");
      return data || [];
    },
    enabled: !!user,
  });

  const { data: prompts = [] } = useQuery({
    queryKey: ["prompts"],
    queryFn: async () => {
      const { data } = await supabase.from("prompts").select("*").order("created_at");
      return data || [];
    },
    enabled: !!user,
  });

  const { data: skills = [] } = useQuery({
    queryKey: ["skills"],
    queryFn: async () => {
      const { data } = await supabase.from("skills").select("*").order("name");
      return data || [];
    },
    enabled: !!user,
  });

  const { data: skillsRepos = [] } = useQuery({
    queryKey: ["skills_repos"],
    queryFn: async () => {
      const { data } = await supabase.from("skills_repos").select("*").order("created_at");
      return data || [];
    },
    enabled: !!user,
  });

  // ── Derived counts ──────────────────────────────────────────────────────────

  const getAppStats = (appType: string) => {
    const enabledMcps = mcpServers.filter(
      (m: any) => m.enabled && Array.isArray(m.app_bindings) && (m.app_bindings as string[]).includes(appType)
    );
    const installedSkills = skills.filter((s: any) => s.installed);
    const enabledProviders = providers.filter((p: any) => p.enabled && p.app_type === appType);
    return { enabledMcps, installedSkills, enabledProviders };
  };

  // ── Claude Code ZIP Export ──────────────────────────────────────────────────

  const exportClaude = async () => {
    setExporting("claude");
    try {
      const date = new Date().toISOString().slice(0, 10);
      const zip = new JSZip();
      const folder = zip.folder(`claude-export-${date}`)!;

      const { enabledMcps, installedSkills, enabledProviders } = getAppStats("claude");

      // settings.json — MCP + Provider env merged per official spec
      folder.file(
        "settings.json",
        JSON.stringify(buildClaudeSettingsJson(enabledMcps, enabledProviders), null, 2)
      );

      // CLAUDE.md — active prompt targeting CLAUDE.md
      const claudePrompt = prompts.find((p: any) => p.is_active && p.target_file === "CLAUDE.md");
      if (claudePrompt) {
        folder.file("CLAUDE.md", claudePrompt.content || "");
      }

      // skills/<name>/SKILL.md
      if (installedSkills.length > 0) {
        const skillsFolder = folder.folder("skills")!;
        installedSkills.forEach((skill: any) => {
          const skillFolder = skillsFolder.folder(skill.name)!;
          skillFolder.file("SKILL.md", generateSkillMd(skill));
        });
      }

      const blob = await zip.generateAsync({ type: "blob" });
      saveAs(blob, `claude-export-${date}.zip`);
      toast({
        title: t("export.exportSuccess"),
        description: `settings.json${claudePrompt ? " · CLAUDE.md" : ""}${installedSkills.length > 0 ? ` · skills/ (${installedSkills.length})` : ""}`,
      });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    } finally {
      setExporting(null);
    }
  };

  // ── Codex ZIP Export ────────────────────────────────────────────────────────

  const exportCodex = async () => {
    setExporting("codex");
    try {
      const date = new Date().toISOString().slice(0, 10);
      const zip = new JSZip();
      const folder = zip.folder(`codex-export-${date}`)!;

      const { enabledMcps, enabledProviders } = getAppStats("codex");

      // config.toml — Provider + MCP Servers in TOML format (official ~/.codex/config.toml spec)
      folder.file("config.toml", generateCodexConfigToml(enabledProviders, enabledMcps));

      // AGENTS.md — active prompt
      const agentsPrompt = prompts.find((p: any) => p.is_active && p.target_file === "AGENTS.md");
      if (agentsPrompt) {
        folder.file("AGENTS.md", agentsPrompt.content || "");
      }

      const blob = await zip.generateAsync({ type: "blob" });
      saveAs(blob, `codex-export-${date}.zip`);
      toast({
        title: t("export.exportSuccess"),
        description: `config.toml${agentsPrompt ? " · AGENTS.md" : ""}`,
      });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    } finally {
      setExporting(null);
    }
  };

  // ── Gemini ZIP Export ───────────────────────────────────────────────────────

  const exportGemini = async () => {
    setExporting("gemini");
    try {
      const date = new Date().toISOString().slice(0, 10);
      const zip = new JSZip();
      const folder = zip.folder(`gemini-export-${date}`)!;

      const { enabledMcps } = getAppStats("gemini");

      // settings.json — MCP Servers (Gemini API key via GOOGLE_API_KEY env var, not in file)
      const mcpServersObj = buildMcpServersObject(enabledMcps);
      folder.file("settings.json", JSON.stringify({ mcpServers: mcpServersObj }, null, 2));

      // GEMINI.md — active prompt
      const geminiPrompt = prompts.find((p: any) => p.is_active && p.target_file === "GEMINI.md");
      if (geminiPrompt) {
        folder.file("GEMINI.md", geminiPrompt.content || "");
      }

      const blob = await zip.generateAsync({ type: "blob" });
      saveAs(blob, `gemini-export-${date}.zip`);
      toast({
        title: t("export.exportSuccess"),
        description: `settings.json${geminiPrompt ? " · GEMINI.md" : ""}`,
      });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    } finally {
      setExporting(null);
    }
  };

  // ── OpenCode ZIP Export ─────────────────────────────────────────────────────

  const exportOpenCode = async () => {
    setExporting("opencode");
    try {
      const date = new Date().toISOString().slice(0, 10);
      const zip = new JSZip();
      const folder = zip.folder(`opencode-export-${date}`)!;

      const { enabledMcps } = getAppStats("opencode");

      const mcpServersObj = buildMcpServersObject(enabledMcps);
      folder.file("config.json", JSON.stringify({ mcpServers: mcpServersObj }, null, 2));

      const ocPrompt = prompts.find((p: any) => p.is_active && p.target_file === "OPENCODE.md");
      if (ocPrompt) {
        folder.file("OPENCODE.md", ocPrompt.content || "");
      }

      const blob = await zip.generateAsync({ type: "blob" });
      saveAs(blob, `opencode-export-${date}.zip`);
      toast({ title: t("export.exportSuccess") });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    } finally {
      setExporting(null);
    }
  };

  // ── Data Backup Export (Module) ─────────────────────────────────────────────

  const handleDataBackup = async () => {
    setExporting("backup");
    try {
      const zip = new JSZip();

      // Strip internal DB fields, keep only meaningful user data
      const cleanProviders = providers.map(({ id, user_id, created_at, updated_at, ...rest }: any) => rest);
      const cleanMcps = mcpServers.map(({ id, user_id, created_at, updated_at, ...rest }: any) => rest);
      const cleanPrompts = prompts.map(({ id, user_id, created_at, updated_at, ...rest }: any) => rest);
      const cleanSkills = skills.map(({ id, user_id, created_at, updated_at, repo_id, ...rest }: any) => rest);
      const cleanRepos = skillsRepos.map(({ id, user_id, created_at, updated_at, ...rest }: any) => rest);

      zip.file("providers.json", JSON.stringify(cleanProviders, null, 2));
      zip.file("mcp_servers.json", JSON.stringify(cleanMcps, null, 2));
      zip.file("prompts.json", JSON.stringify(cleanPrompts, null, 2));
      zip.file("skills.json", JSON.stringify(cleanSkills, null, 2));
      zip.file("skills_repos.json", JSON.stringify(cleanRepos, null, 2));

      const blob = await zip.generateAsync({ type: "blob" });
      saveAs(blob, `cc-switch-backup-${new Date().toISOString().slice(0, 10)}.zip`);
      toast({ title: t("export.exportSuccess"), description: t("export.backupDesc") });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    } finally {
      setExporting(null);
    }
  };

  // ── Module single export ────────────────────────────────────────────────────

  const handleModuleExport = (module: string, data: any[]) => {
    const clean = data.map(({ id, user_id, created_at, updated_at, ...rest }: any) => rest);
    const blob = new Blob([JSON.stringify(clean, null, 2)], { type: "application/json" });
    saveAs(blob, `cc-switch-${module}-${new Date().toISOString().slice(0, 10)}.json`);
    toast({ title: t("export.exportSuccess") });
  };

  // ── Import ──────────────────────────────────────────────────────────────────

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      let count = 0;

      if (Array.isArray(data)) {
        const sample = data[0];
        if (!sample) throw new Error("空数据");

        if ("provider_type" in sample) {
          for (const item of data) {
            const { id, created_at, updated_at, ...rest } = item;
            const { error } = await supabase.from("providers").insert({ ...rest, user_id: user!.id });
            if (!error) count++;
          }
        } else if ("transport_type" in sample) {
          for (const item of data) {
            const { id, created_at, updated_at, ...rest } = item;
            const { error } = await supabase.from("mcp_servers").insert({ ...rest, user_id: user!.id });
            if (!error) count++;
          }
        } else if ("target_file" in sample) {
          for (const item of data) {
            const { id, created_at, updated_at, ...rest } = item;
            const { error } = await supabase.from("prompts").insert({ ...rest, user_id: user!.id });
            if (!error) count++;
          }
        }
      }

      toast({ title: t("export.importSuccess").replace("{count}", String(count)) });
    } catch (e: any) {
      toast({ title: t("export.importFailed"), description: e.message, variant: "destructive" });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Deep Link ───────────────────────────────────────────────────────────────

  const generateDeepLink = () => {
    const enabledProviders = providers.filter((p: any) => p.enabled);
    const payload = enabledProviders.map((p: any) => ({
      name: p.name,
      provider_type: p.provider_type,
      base_url: p.base_url,
      app_type: p.app_type,
    }));
    const encoded = btoa(encodeURIComponent(JSON.stringify(payload)));
    const link = `${window.location.origin}/import?data=${encoded}`;
    setDeepLink(link);
  };

  const copyDeepLink = () => {
    navigator.clipboard.writeText(deepLink);
    toast({ title: t("export.linkCopied") });
  };

  // ── App card definition ─────────────────────────────────────────────────────

  const appCards = [
    {
      key: "claude" as const,
      label: "Claude Code",
      onExport: exportClaude,
      files: [
        { name: "settings.json", path: "~/.claude/settings.json", icon: <Settings className="h-3 w-3" />, desc: "MCP + Provider env" },
        { name: "CLAUDE.md", path: "~/.claude/CLAUDE.md", icon: <FileText className="h-3 w-3" />, desc: "系统提示词", optional: true },
        { name: "skills/<name>/SKILL.md", path: "~/.claude/skills/", icon: <FileCode className="h-3 w-3" />, desc: "已安装 Skills", optional: true },
      ],
      stats: () => {
        const s = getAppStats("claude");
        return `${s.enabledMcps.length} MCP · ${s.installedSkills.length} Skills`;
      },
    },
    {
      key: "codex" as const,
      label: "Codex CLI",
      onExport: exportCodex,
      files: [
        { name: "config.toml", path: "~/.codex/config.toml", icon: <Settings className="h-3 w-3" />, desc: "Provider + MCP Servers（TOML）" },
        { name: "AGENTS.md", path: "项目根目录", icon: <FileText className="h-3 w-3" />, desc: "系统提示词", optional: true },
      ],
      stats: () => {
        const s = getAppStats("codex");
        return `${s.enabledMcps.length} MCP · ${s.enabledProviders.length} Providers`;
      },
    },
    {
      key: "gemini" as const,
      label: "Gemini CLI",
      onExport: exportGemini,
      files: [
        { name: "settings.json", path: "~/.gemini/settings.json", icon: <Settings className="h-3 w-3" />, desc: "MCP Servers" },
        { name: "GEMINI.md", path: "项目根目录", icon: <FileText className="h-3 w-3" />, desc: "系统提示词", optional: true },
      ],
      stats: () => {
        const s = getAppStats("gemini");
        return `${s.enabledMcps.length} MCP`;
      },
    },
    {
      key: "opencode" as const,
      label: "OpenCode",
      onExport: exportOpenCode,
      files: [
        { name: "config.json", path: "~/.config/opencode/config.json", icon: <Settings className="h-3 w-3" />, desc: "MCP Servers" },
        { name: "OPENCODE.md", path: "项目根目录", icon: <FileText className="h-3 w-3" />, desc: "系统提示词", optional: true },
      ],
      stats: () => {
        const s = getAppStats("opencode");
        return `${s.enabledMcps.length} MCP`;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold">{t("export.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("export.subtitle")}</p>
        </div>
        <HelpDialog sections={[
          { title: t("helpExport.what"), content: t("helpExport.whatDesc"), tip: t("helpExport.whatTip") },
          { title: t("helpExport.app"), content: t("helpExport.appDesc"), tip: t("helpExport.appTip") },
          { title: t("helpExport.backup"), content: t("helpExport.backupDesc"), tip: t("helpExport.backupTip") },
          { title: t("helpExport.import"), content: t("helpExport.importDesc"), tip: t("helpExport.importTip") },
          { title: t("helpExport.deepLink"), content: t("helpExport.deepLinkDesc"), tip: t("helpExport.deepLinkTip") },
        ]} />
      </div>

      <Tabs defaultValue="export">
        <TabsList>
          <TabsTrigger value="export" className="gap-1"><Download className="h-3.5 w-3.5" />{t("common.export")}</TabsTrigger>
          <TabsTrigger value="import" className="gap-1"><Upload className="h-3.5 w-3.5" />{t("common.import")}</TabsTrigger>
          <TabsTrigger value="deeplink" className="gap-1"><Link2 className="h-3.5 w-3.5" />Deep Link</TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="mt-4 space-y-4">

          {/* ── App Export (ZIP) ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileArchive className="h-4 w-4" />
                {t("export.appExport")}
              </CardTitle>
              <CardDescription>{t("export.appExportDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {appCards.map(({ key, label, onExport, files, stats }) => (
                  <div key={key} className="rounded-lg border p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{label}</p>
                        <p className="text-xs text-muted-foreground">{stats()}</p>
                      </div>
                      <Button
                        variant="default"
                        size="sm"
                        className="h-8 text-xs gap-1.5"
                        disabled={exporting !== null}
                        onClick={onExport}
                      >
                        {exporting === key
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <Download className="h-3 w-3" />}
                        下载 ZIP
                      </Button>
                    </div>

                    {/* File list */}
                    <div className="space-y-1.5">
                      {files.map((f) => (
                        <div key={f.name} className="flex items-start gap-2">
                          <CheckCircle2 className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${f.optional ? "text-muted-foreground/50" : "text-primary"}`} />
                          <div className="min-w-0">
                            <span className="text-xs font-mono font-medium">{f.name}</span>
                            <span className="text-xs text-muted-foreground mx-1">→</span>
                            <span className="text-xs text-muted-foreground font-mono">{f.path}</span>
                            {f.optional && <Badge variant="outline" className="ml-1 text-[10px] h-4 px-1">按需</Badge>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground border-t pt-3">
                💡 {t("export.appExportHint")}
              </p>
            </CardContent>
          </Card>

          {/* ── Data Backup ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4" />
                {t("export.dataBackup")}
              </CardTitle>
              <CardDescription>{t("export.dataBackupDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Full backup button */}
              <Button onClick={handleDataBackup} disabled={exporting !== null} variant="outline">
                {exporting === "backup"
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <Package className="mr-2 h-4 w-4" />}
                {t("export.fullBackup")}
              </Button>

              {/* Per-module export */}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => handleModuleExport("providers", providers)}>
                  Providers ({providers.length})
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleModuleExport("mcp-servers", mcpServers)}>
                  MCP Servers ({mcpServers.length})
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleModuleExport("prompts", prompts)}>
                  Prompts ({prompts.length})
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleModuleExport("skills", skills)}>
                  Skills ({skills.length})
                </Button>
              </div>

              <p className="text-xs text-muted-foreground border-t pt-2">
                ⚠️ {t("export.backupWarning")}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Upload className="h-4 w-4" />{t("export.import")}</CardTitle>
              <CardDescription>{t("export.importDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
              <Button onClick={() => fileInputRef.current?.click()} disabled={importing}>
                {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {t("export.selectFile")}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">{t("export.importHint")}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deeplink" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Link2 className="h-4 w-4" />{t("export.deepLink")}</CardTitle>
              <CardDescription>{t("export.deepLinkDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={generateDeepLink}>
                <Link2 className="mr-2 h-4 w-4" />{t("export.generateLink")}
              </Button>
              {deepLink && (
                <div className="flex gap-2">
                  <Input value={deepLink} readOnly className="font-mono text-xs" />
                  <Button variant="outline" size="icon" onClick={copyDeepLink}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

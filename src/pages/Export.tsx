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
import { Download, Upload, Link2, Package, FileJson, Copy, Loader2 } from "lucide-react";
import { HelpDialog } from "@/components/HelpDialog";
import { useTranslation } from "react-i18next";
import JSZip from "jszip";
import { saveAs } from "file-saver";

export default function Export() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);
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

  // Full export as ZIP
  const handleFullExport = async () => {
    setExporting(true);
    try {
      const zip = new JSZip();
      zip.file("providers.json", JSON.stringify(providers, null, 2));
      zip.file("mcp_servers.json", JSON.stringify(mcpServers, null, 2));
      zip.file("prompts.json", JSON.stringify(prompts, null, 2));
      zip.file("skills.json", JSON.stringify(skills, null, 2));
      zip.file("skills_repos.json", JSON.stringify(skillsRepos, null, 2));

      const blob = await zip.generateAsync({ type: "blob" });
      saveAs(blob, `cc-switch-export-${new Date().toISOString().slice(0, 10)}.zip`);
      toast({ title: t("export.exportSuccess") });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  // Module export
  const handleModuleExport = (module: string, data: any) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    saveAs(blob, `cc-switch-${module}-${new Date().toISOString().slice(0, 10)}.json`);
    toast({ title: t("export.exportSuccess") });
  };

  // App-specific export
  const handleAppExport = (appType: string) => {
    const enabledProviders = providers.filter((p: any) => p.enabled && p.app_type === appType);
    const enabledMcps = mcpServers.filter((m: any) => m.enabled && Array.isArray(m.app_bindings) && (m.app_bindings as string[]).includes(appType));
    const activePrompts = prompts.filter((p: any) => p.is_active);

    if (appType === "claude") {
      // Claude Code settings.json format
      const mcpConfig: Record<string, any> = {};
      enabledMcps.forEach((m: any) => {
        const entry: any = {};
        if (m.transport_type === "stdio") {
          entry.command = m.command;
          entry.args = Array.isArray(m.args) ? m.args : [];
          if (m.env && Object.keys(m.env as object).length > 0) entry.env = m.env;
        } else {
          entry.url = m.url;
          entry.transport = m.transport_type;
        }
        mcpConfig[m.name] = entry;
      });

      const config: any = { mcpServers: mcpConfig };
      if (enabledProviders.length > 0) {
        const p = enabledProviders[0];
        if (p.api_key) config.apiKey = p.api_key;
        if (p.base_url) config.apiBaseUrl = p.base_url;
      }

      const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
      saveAs(blob, "settings.json");

      // Also export CLAUDE.md if active
      const claudePrompt = activePrompts.find((p: any) => p.target_file === "CLAUDE.md");
      if (claudePrompt) {
        const mdBlob = new Blob([claudePrompt.content || ""], { type: "text/markdown" });
        saveAs(mdBlob, "CLAUDE.md");
      }
    } else if (appType === "codex") {
      // Codex config
      const config: any = {};
      if (enabledProviders.length > 0) {
        const p = enabledProviders[0];
        if (p.api_key) config.api_key = p.api_key;
        if (p.base_url) config.api_base_url = p.base_url;
      }
      config.mcp_servers = enabledMcps.map((m: any) => ({
        name: m.name,
        transport: m.transport_type,
        ...(m.transport_type === "stdio" ? { command: m.command, args: m.args } : { url: m.url }),
      }));

      const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
      saveAs(blob, "codex-config.json");

      const agentsPrompt = activePrompts.find((p: any) => p.target_file === "AGENTS.md");
      if (agentsPrompt) {
        const mdBlob = new Blob([agentsPrompt.content || ""], { type: "text/markdown" });
        saveAs(mdBlob, "AGENTS.md");
      }
    } else if (appType === "gemini") {
      const config: any = { mcpServers: {} };
      enabledMcps.forEach((m: any) => {
        config.mcpServers[m.name] = m.transport_type === "stdio"
          ? { command: m.command, args: m.args || [] }
          : { url: m.url };
      });

      const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
      saveAs(blob, "gemini-settings.json");

      const geminiPrompt = activePrompts.find((p: any) => p.target_file === "GEMINI.md");
      if (geminiPrompt) {
        const mdBlob = new Blob([geminiPrompt.content || ""], { type: "text/markdown" });
        saveAs(mdBlob, "GEMINI.md");
      }
    } else if (appType === "opencode") {
      const config: any = { mcpServers: {} };
      enabledMcps.forEach((m: any) => {
        config.mcpServers[m.name] = m.transport_type === "stdio"
          ? { command: m.command, args: m.args || [] }
          : { url: m.url };
      });

      const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
      saveAs(blob, "opencode-config.json");

      const ocPrompt = activePrompts.find((p: any) => p.target_file === "OPENCODE.md");
      if (ocPrompt) {
        const mdBlob = new Blob([ocPrompt.content || ""], { type: "text/markdown" });
        saveAs(mdBlob, "OPENCODE.md");
      }
    }

    toast({ title: t("export.exportSuccess") });
  };

  // Import from JSON
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      let count = 0;

      if (Array.isArray(data)) {
        // Detect type by fields
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

  // Deep Link generation
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold">{t("export.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("export.subtitle")}</p>
        </div>
        <HelpDialog sections={[
          { title: t("helpExport.what"), content: t("helpExport.whatDesc"), tip: t("helpExport.whatTip") },
          { title: t("helpExport.full"), content: t("helpExport.fullDesc") },
          { title: t("helpExport.module"), content: t("helpExport.moduleDesc"), tip: t("helpExport.moduleTip") },
          { title: t("helpExport.app"), content: t("helpExport.appDesc"), tip: t("helpExport.appTip") },
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
          {/* Full Export */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" />{t("export.fullExport")}</CardTitle>
              <CardDescription>{t("export.fullExportDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleFullExport} disabled={exporting}>
                {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                {t("export.fullExport")}
              </Button>
            </CardContent>
          </Card>

          {/* Module Export */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><FileJson className="h-4 w-4" />{t("export.moduleExport")}</CardTitle>
              <CardDescription>{t("export.moduleExportDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
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
            </CardContent>
          </Card>

          {/* App Export */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("export.appExport")}</CardTitle>
              <CardDescription>{t("export.appExportDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {([
                  { key: "claude", label: t("export.claudeExport"), path: "~/.claude/settings.json", extra: "+ CLAUDE.md" },
                  { key: "codex", label: t("export.codexExport"), path: "~/.codex/config.json", extra: "+ AGENTS.md" },
                  { key: "gemini", label: t("export.geminiExport"), path: "~/.gemini/settings.json", extra: "+ GEMINI.md" },
                  { key: "opencode", label: t("export.opencodeExport"), path: "~/.config/opencode/config.json", extra: "+ OPENCODE.md" },
                ] as const).map(({ key, label, path, extra }) => (
                  <div key={key} className="flex flex-col gap-1.5 rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">{key}</span>
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleAppExport(key)}>
                        <Download className="mr-1 h-3 w-3" />{label}
                      </Button>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">
                        放置路径：<code className="bg-muted px-1 rounded">{path}</code>
                      </p>
                      <p className="text-xs text-muted-foreground/70">{extra}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground border-t pt-3">
                💡 下载后将文件放到对应路径，CLI 工具下次启动时会自动读取。
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
              <p className="text-xs text-muted-foreground mt-2">支持导入 Providers、MCP Servers、Prompts 的 JSON 格式文件</p>
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

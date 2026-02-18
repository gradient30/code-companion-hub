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
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Copy, Zap, Loader2, Activity, CheckCircle2, XCircle, Info, FolderOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTranslation } from "react-i18next";
import { HelpDialog } from "@/components/HelpDialog";
import type { Tables } from "@/integrations/supabase/types";

type Provider = Tables<"providers">;

const PROVIDER_PRESETS = [
  { name: "Official Login", provider_type: "official", base_url: "", app_type: "claude" },
  { name: "PackyCode", provider_type: "packycode", base_url: "https://api.packycode.com", app_type: "claude" },
  { name: "Custom", provider_type: "custom", base_url: "", app_type: "claude" },
];

const APP_TYPES = ["claude", "codex", "gemini", "opencode"] as const;

const OFFICIAL_BASE_URLS: Record<string, string> = {
  claude: "https://api.anthropic.com",
  codex: "https://api.openai.com/v1",
  gemini: "https://generativelanguage.googleapis.com",
  opencode: "https://api.openai.com/v1",
};

const PACKYCODE_BASE_URL = "https://api.packycode.com";

function getAutoBaseUrl(providerType: string, appType: string): string {
  if (providerType === "official") return OFFICIAL_BASE_URLS[appType] || "";
  if (providerType === "packycode") return PACKYCODE_BASE_URL;
  return "";
}

function ProviderForm({
  initial,
  onSave,
  saving,
}: {
  initial?: Partial<Provider>;
  onSave: (data: Partial<Provider>) => void;
  saving: boolean;
}) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState({
    name: initial?.name || "",
    provider_type: initial?.provider_type || "custom",
    api_key: initial?.api_key || "",
    base_url: initial?.base_url || "",
    app_type: initial?.app_type || "claude",
    enabled: initial?.enabled ?? true,
  });

  const isAutoUrl = form.provider_type === "official" || form.provider_type === "packycode";

  const handleProviderTypeChange = (v: string) => {
    const newUrl = v === "custom" ? "" : getAutoBaseUrl(v, form.app_type);
    setForm({ ...form, provider_type: v, base_url: newUrl });
  };

  const handleAppTypeChange = (v: string) => {
    const newUrl = isAutoUrl ? getAutoBaseUrl(form.provider_type, v) : form.base_url;
    setForm({ ...form, app_type: v, base_url: newUrl });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>名称 <span className="text-destructive">*</span></Label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Provider 名称" maxLength={100} />
      </div>
      <div className="space-y-2">
        <Label>类型 <span className="text-destructive">*</span></Label>
        <Select value={form.provider_type} onValueChange={handleProviderTypeChange}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="official">官方登录</SelectItem>
            <SelectItem value="packycode">PackyCode</SelectItem>
            <SelectItem value="custom">自定义</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>应用 <span className="text-destructive">*</span></Label>
        <Select value={form.app_type} onValueChange={handleAppTypeChange}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {APP_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>API Key <span className="text-xs text-muted-foreground ml-1">(选填)</span></Label>
        <Input type="password" value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} placeholder="sk-..." maxLength={500} />
      </div>
      <div className="space-y-2">
        <Label>Base URL {isAutoUrl ? <span className="text-xs text-muted-foreground ml-1">(自动填充)</span> : <span className="text-xs text-muted-foreground ml-1">(选填)</span>}</Label>
        <Input value={form.base_url} onChange={(e) => setForm({ ...form, base_url: e.target.value })} placeholder="https://api.example.com" maxLength={500} disabled={isAutoUrl} className={isAutoUrl ? "opacity-70" : ""} />
      </div>
      <div className="flex items-center justify-between">
        <Label>启用</Label>
        <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
      </div>
      <Button className="w-full" onClick={() => onSave(form)} disabled={saving || !form.name.trim()}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        保存
      </Button>
    </div>
  );
}

export default function Providers() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string; latency_ms?: number }>>({});

  const testConnection = async (provider: Provider) => {
    setTestingId(provider.id);
    setTestResults((prev) => ({ ...prev, [provider.id]: undefined as any }));
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
            type: "provider",
            provider_type: provider.provider_type,
            base_url: provider.base_url,
            api_key: provider.api_key,
            app_type: provider.app_type,
          }),
        }
      );
      const result = await resp.json();
      setTestResults((prev) => ({ ...prev, [provider.id]: result }));
      toast({
        title: result.success ? "连接成功" : "连接失败",
        description: result.message + (result.latency_ms ? ` (${result.latency_ms}ms)` : ""),
        variant: result.success ? "default" : "destructive",
      });
    } catch (e: any) {
      const result = { success: false, message: e.message };
      setTestResults((prev) => ({ ...prev, [provider.id]: result }));
      toast({ title: "测试失败", description: e.message, variant: "destructive" });
    } finally {
      setTestingId(null);
    }
  };

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ["providers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Provider[];
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Provider>) => {
      const { error } = await supabase.from("providers").insert({
        ...data,
        user_id: user!.id,
        name: data.name!,
        sort_order: providers.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providers"] });
      setDialogOpen(false);
      toast({ title: "创建成功" });
    },
    onError: (e) => toast({ title: "创建失败", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Provider> & { id: string }) => {
      const { error } = await supabase.from("providers").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providers"] });
      setEditingProvider(null);
      toast({ title: "更新成功" });
    },
    onError: (e) => toast({ title: "更新失败", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("providers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providers"] });
      toast({ title: "删除成功" });
    },
    onError: (e) => toast({ title: "删除失败", description: e.message, variant: "destructive" }),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (provider: Provider) => {
      const { id, created_at, updated_at, ...rest } = provider;
      const { error } = await supabase.from("providers").insert({
        ...rest,
        name: `${rest.name} (副本)`,
        sort_order: providers.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providers"] });
      toast({ title: "复制成功" });
    },
    onError: (e) => toast({ title: "复制失败", description: e.message, variant: "destructive" }),
  });

  const applyPreset = (preset: typeof PROVIDER_PRESETS[0]) => {
    createMutation.mutate({
      name: preset.name,
      provider_type: preset.provider_type,
      base_url: preset.base_url,
      app_type: preset.app_type,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-2xl font-bold">{t("providers.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("providers.subtitle")}</p>
          </div>
          <HelpDialog sections={[
            { title: t("helpProviders.what"), content: t("helpProviders.whatDesc"), tip: t("helpProviders.whatTip") },
            { title: t("helpProviders.types"), content: t("helpProviders.typesDesc"), tip: t("helpProviders.typesTip") },
            { title: t("helpProviders.howTo"), content: t("helpProviders.howToDesc") },
            { title: t("helpProviders.test"), content: t("helpProviders.testDesc"), tip: t("helpProviders.testTip") },
          ]} />
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />新增 Provider</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新增 Provider</DialogTitle>
            </DialogHeader>
            <div className="mb-4 flex gap-2">
              {PROVIDER_PRESETS.map((p) => (
                <Button key={p.provider_type} variant="outline" size="sm" onClick={() => applyPreset(p)}>
                  {p.name}
                </Button>
              ))}
            </div>
            <ProviderForm onSave={(data) => createMutation.mutate(data)} saving={createMutation.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Local Deployment Banner */}
      <Alert className="border-primary/30 bg-primary/5">
        <Info className="h-4 w-4 text-primary" />
        <AlertTitle className="text-sm font-semibold">本地部署说明</AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          <p className="text-sm text-muted-foreground">
            Provider 配置已实时备份到云端。要应用到本地 CLI，需导出配置文件并放置到对应路径：
          </p>
          <ul className="text-xs text-muted-foreground space-y-1 ml-1">
            <li><code className="bg-muted px-1 rounded">Claude Code</code> → <code className="bg-muted px-1 rounded">~/.claude/settings.json</code></li>
            <li><code className="bg-muted px-1 rounded">Codex CLI</code> → <code className="bg-muted px-1 rounded">~/.codex/config.json</code></li>
            <li><code className="bg-muted px-1 rounded">Gemini CLI</code> → <code className="bg-muted px-1 rounded">~/.gemini/settings.json</code></li>
          </ul>
          <Button size="sm" variant="outline" className="mt-1 h-7 text-xs" onClick={() => navigate("/export")}>
            <FolderOpen className="mr-1.5 h-3 w-3" />前往导出配置
          </Button>
        </AlertDescription>
      </Alert>

      {providers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Zap className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-lg font-medium text-muted-foreground">暂无 Provider</p>
            <p className="text-sm text-muted-foreground/60">点击「新增 Provider」开始配置</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((provider) => (
            <Card key={provider.id} className={`transition-opacity ${!provider.enabled ? "opacity-50" : ""}`}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-base">{provider.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {provider.app_type} · {provider.provider_type}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={testingId === provider.id}
                    onClick={() => testConnection(provider)}
                    title="测试连接"
                  >
                    {testingId === provider.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : testResults[provider.id]?.success === true ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    ) : testResults[provider.id]?.success === false ? (
                      <XCircle className="h-3.5 w-3.5 text-destructive" />
                    ) : (
                      <Activity className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingProvider(provider)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => duplicateMutation.mutate(provider)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(provider.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {provider.base_url && <p className="truncate">URL: {provider.base_url}</p>}
                  <p>API Key: {provider.api_key ? "••••••" + provider.api_key.slice(-4) : "未设置"}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingProvider} onOpenChange={(open) => !open && setEditingProvider(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑 Provider</DialogTitle>
          </DialogHeader>
          {editingProvider && (
            <ProviderForm
              initial={editingProvider}
              onSave={(data) => updateMutation.mutate({ id: editingProvider.id, ...data })}
              saving={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

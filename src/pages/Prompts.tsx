import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, FileText, Loader2, Eye, Code, CheckCircle2, Sparkles, ListChecks } from "lucide-react";
import { useTranslation } from "react-i18next";
import { HelpDialog } from "@/components/HelpDialog";
import PromptOptimizer from "@/components/PromptOptimizer";
import type { Tables } from "@/integrations/supabase/types";

type Prompt = Tables<"prompts">;

const TARGET_FILES = [
  { value: "CLAUDE.md", label: "CLAUDE.md", app: "Claude Code" },
  { value: "AGENTS.md", label: "AGENTS.md", app: "Codex" },
  { value: "GEMINI.md", label: "GEMINI.md", app: "Gemini CLI" },
  { value: "OPENCODE.md", label: "OPENCODE.md", app: "OpenCode" },
] as const;

function PromptForm({
  initial,
  onSave,
  saving,
}: {
  initial?: Partial<Prompt>;
  onSave: (data: Partial<Prompt>) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    name: initial?.name || "",
    target_file: initial?.target_file || "CLAUDE.md",
    content: initial?.content || "",
    is_active: initial?.is_active ?? false,
  });
  const [previewTab, setPreviewTab] = useState<string>("edit");

  return (
    <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
      <div className="space-y-2">
        <Label>名称</Label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="提示词名称" maxLength={100} />
      </div>
      <div className="space-y-2">
        <Label>目标文件</Label>
        <Select value={form.target_file} onValueChange={(v) => setForm({ ...form, target_file: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {TARGET_FILES.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label} <span className="text-muted-foreground ml-1">({f.app})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>内容（Markdown）</Label>
        <Tabs value={previewTab} onValueChange={setPreviewTab}>
          <TabsList className="h-8">
            <TabsTrigger value="edit" className="text-xs gap-1"><Code className="h-3 w-3" />编辑</TabsTrigger>
            <TabsTrigger value="preview" className="text-xs gap-1"><Eye className="h-3 w-3" />预览</TabsTrigger>
          </TabsList>
          <TabsContent value="edit" className="mt-2">
            <Textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="# 系统提示词&#10;&#10;在这里编写 Markdown 格式的提示词..."
              className="min-h-[250px] font-mono text-sm"
              maxLength={50000}
            />
          </TabsContent>
          <TabsContent value="preview" className="mt-2">
            <div className="min-h-[250px] rounded-md border bg-muted/30 p-4 text-sm whitespace-pre-wrap break-words">
              {form.content || <span className="text-muted-foreground italic">暂无内容</span>}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <div className="flex items-center justify-between">
        <Label>设为激活</Label>
        <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
      </div>
      <Button className="w-full" onClick={() => onSave(form)} disabled={saving || !form.name.trim()}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        保存
      </Button>
    </div>
  );
}

function PromptsManagement() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);

  const { data: prompts = [], isLoading } = useQuery({
    queryKey: ["prompts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("prompts").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Prompt[];
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Prompt>) => {
      const { error } = await supabase.from("prompts").insert({ ...data, user_id: user!.id, name: data.name! });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["prompts"] }); setDialogOpen(false); toast({ title: "创建成功" }); },
    onError: (e) => toast({ title: "创建失败", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Prompt> & { id: string }) => {
      const { error } = await supabase.from("prompts").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["prompts"] }); setEditingPrompt(null); toast({ title: "更新成功" }); },
    onError: (e) => toast({ title: "更新失败", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("prompts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["prompts"] }); toast({ title: "删除成功" }); },
    onError: (e) => toast({ title: "删除失败", description: e.message, variant: "destructive" }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("prompts").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["prompts"] }),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />新增 Prompt</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>新增 Prompt</DialogTitle></DialogHeader>
            <PromptForm onSave={(data) => createMutation.mutate(data)} saving={createMutation.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      {prompts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-lg font-medium text-muted-foreground">暂无 Prompt</p>
            <p className="text-sm text-muted-foreground/60">点击「新增 Prompt」开始创建提示词预设</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {prompts.map((prompt) => {
            const targetInfo = TARGET_FILES.find((f) => f.value === prompt.target_file);
            return (
              <Card key={prompt.id} className={`transition-opacity ${!prompt.is_active ? "opacity-60" : ""}`}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{prompt.name}</CardTitle>
                        {prompt.is_active && (
                          <Badge variant="default" className="text-[10px] gap-1">
                            <CheckCircle2 className="h-2.5 w-2.5" />激活
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px]">{prompt.target_file}</Badge>
                        {targetInfo && <span className="text-xs text-muted-foreground">{targetInfo.app}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={prompt.is_active}
                      onCheckedChange={(v) => toggleActive.mutate({ id: prompt.id, is_active: v })}
                    />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingPrompt(prompt)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(prompt.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap font-mono">
                    {prompt.content || "（无内容）"}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!editingPrompt} onOpenChange={(open) => !open && setEditingPrompt(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>编辑 Prompt</DialogTitle></DialogHeader>
          {editingPrompt && (
            <PromptForm
              initial={editingPrompt}
              onSave={(data) => updateMutation.mutate({ id: editingPrompt.id, ...data })}
              saving={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Prompts() {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === "zh";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold">{t("prompts.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("prompts.subtitle")}</p>
        </div>
        <HelpDialog sections={[
          { title: t("helpPrompts.what"), content: t("helpPrompts.whatDesc") },
          { title: t("helpPrompts.target"), content: t("helpPrompts.targetDesc") },
          { title: t("helpPrompts.editor"), content: t("helpPrompts.editorDesc") },
          { title: t("helpPrompts.active"), content: t("helpPrompts.activeDesc") },
        ]} />
      </div>

      <Tabs defaultValue="management">
        <TabsList>
          <TabsTrigger value="management" className="gap-1.5">
            <ListChecks className="h-3.5 w-3.5" />
            {isZh ? "Prompts 管理" : "Prompts Management"}
          </TabsTrigger>
          <TabsTrigger value="optimizer" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            {isZh ? "提示词优化器" : "Prompt Optimizer"}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="management">
          <PromptsManagement />
        </TabsContent>
        <TabsContent value="optimizer">
          <PromptOptimizer />
        </TabsContent>
      </Tabs>
    </div>
  );
}

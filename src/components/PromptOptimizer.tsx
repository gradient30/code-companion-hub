import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  Loader2, Sparkles, BarChart3, RefreshCw, Copy, Save, Trash2, ChevronRight,
  BookOpen, Lightbulb, Palette
} from "lucide-react";
import { useTranslation } from "react-i18next";

const OPTIMIZE_TEMPLATES = [
  { value: "general", label: "通用优化", labelEn: "General", icon: Sparkles },
  { value: "academic", label: "学术严谨", labelEn: "Academic", icon: BookOpen },
  { value: "creative", label: "创意开放", labelEn: "Creative", icon: Palette },
] as const;

const TARGET_FILES = [
  { value: "CLAUDE.md", label: "CLAUDE.md", app: "Claude Code" },
  { value: "AGENTS.md", label: "AGENTS.md", app: "Codex" },
  { value: "GEMINI.md", label: "GEMINI.md", app: "Gemini CLI" },
  { value: "OPENCODE.md", label: "OPENCODE.md", app: "OpenCode" },
] as const;

type HistoryItem = {
  id: string;
  original_prompt: string;
  optimized_prompt: string;
  template: string;
  mode: string;
  action: string;
  feedback: string | null;
  analysis: string | null;
  created_at: string;
};

export default function PromptOptimizer() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const isZh = i18n.language === "zh";

  const [mode, setMode] = useState<"system" | "user">("system");
  const [originalPrompt, setOriginalPrompt] = useState("");
  const [optimizedPrompt, setOptimizedPrompt] = useState("");
  const [template, setTemplate] = useState("general");
  const [feedback, setFeedback] = useState("");
  const [analysisResult, setAnalysisResult] = useState("");
  const [showIterate, setShowIterate] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveTarget, setSaveTarget] = useState("CLAUDE.md");

  // Fetch history
  const { data: history = [] } = useQuery({
    queryKey: ["prompt-optimize-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prompt_optimize_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as HistoryItem[];
    },
    enabled: !!user,
  });

  // Optimize mutation
  const optimizeMutation = useMutation({
    mutationFn: async (params: {
      action: string;
      prompt: string;
      optimizedPrompt?: string;
      template?: string;
      mode?: string;
      feedback?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("optimize-prompt", {
        body: params,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { result: string; analysis?: string };
    },
    onSuccess: (data, variables) => {
      if (variables.action === "evaluate") {
        setAnalysisResult(data.analysis || data.result);
        toast({ title: isZh ? "分析完成" : "Analysis complete" });
      } else {
        setOptimizedPrompt(data.result);
        setShowIterate(true);
        toast({ title: isZh ? "优化完成" : "Optimization complete" });
      }
      queryClient.invalidateQueries({ queryKey: ["prompt-optimize-history"] });
    },
    onError: (e) => {
      toast({
        title: isZh ? "操作失败" : "Operation failed",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  // Save as prompt mutation
  const saveAsPromptMutation = useMutation({
    mutationFn: async (params: { name: string; content: string; target_file: string }) => {
      const { error } = await supabase.from("prompts").insert({
        user_id: user!.id,
        name: params.name,
        content: params.content,
        target_file: params.target_file,
        is_active: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setSaveDialogOpen(false);
      setSaveName("");
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
      toast({ title: isZh ? "已保存为 Prompt" : "Saved as Prompt" });
    },
    onError: (e) => {
      toast({ title: isZh ? "保存失败" : "Save failed", description: e.message, variant: "destructive" });
    },
  });

  // Clear history
  const clearHistoryMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("prompt_optimize_history")
        .delete()
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompt-optimize-history"] });
      toast({ title: isZh ? "历史已清除" : "History cleared" });
    },
  });

  const handleOptimize = () => {
    if (!originalPrompt.trim()) return;
    optimizeMutation.mutate({
      action: "optimize",
      prompt: originalPrompt,
      template,
      mode,
    });
  };

  const handleEvaluate = () => {
    if (!originalPrompt.trim()) return;
    optimizeMutation.mutate({
      action: "evaluate",
      prompt: originalPrompt,
      mode,
    });
  };

  const handleIterate = () => {
    if (!optimizedPrompt.trim() || !feedback.trim()) return;
    optimizeMutation.mutate({
      action: "iterate",
      prompt: originalPrompt,
      optimizedPrompt,
      feedback,
      mode,
    });
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(optimizedPrompt);
    toast({ title: isZh ? "已复制" : "Copied" });
  };

  const isPending = optimizeMutation.isPending;

  const getActionLabel = (action: string) => {
    const map: Record<string, string> = isZh
      ? { optimize: "优化", iterate: "迭代", evaluate: "分析" }
      : { optimize: "Optimize", iterate: "Iterate", evaluate: "Evaluate" };
    return map[action] || action;
  };

  const getTemplateLabel = (tpl: string) => {
    if (tpl.includes("general")) return isZh ? "通用" : "General";
    if (tpl.includes("academic")) return isZh ? "学术" : "Academic";
    if (tpl.includes("creative")) return isZh ? "创意" : "Creative";
    if (tpl.includes("iterate")) return isZh ? "迭代" : "Iterate";
    if (tpl.includes("evaluate")) return isZh ? "分析" : "Evaluate";
    if (tpl.includes("user")) return isZh ? "用户" : "User";
    return tpl;
  };

  return (
    <div className="space-y-6">
      {/* Mode switch */}
      <Tabs value={mode} onValueChange={(v) => setMode(v as "system" | "user")}>
        <TabsList>
          <TabsTrigger value="system" className="gap-1">
            <Sparkles className="h-3.5 w-3.5" />
            {isZh ? "系统提示词优化" : "System Prompt"}
          </TabsTrigger>
          <TabsTrigger value="user" className="gap-1">
            <Lightbulb className="h-3.5 w-3.5" />
            {isZh ? "用户提示词优化" : "User Prompt"}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Original prompt input */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{isZh ? "原始提示词" : "Original Prompt"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={originalPrompt}
            onChange={(e) => setOriginalPrompt(e.target.value)}
            placeholder={isZh ? "在这里输入需要优化的提示词..." : "Enter the prompt to optimize..."}
            className="min-h-[160px] font-mono text-sm"
            maxLength={50000}
          />
          <div className="flex items-center gap-3 flex-wrap">
            {mode === "system" && (
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground whitespace-nowrap">
                  {isZh ? "优化模板" : "Template"}:
                </Label>
                <Select value={template} onValueChange={setTemplate}>
                  <SelectTrigger className="w-[140px] h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPTIMIZE_TEMPLATES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <span className="flex items-center gap-1.5">
                          <t.icon className="h-3.5 w-3.5" />
                          {isZh ? t.label : t.labelEn}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleEvaluate}
                disabled={isPending || !originalPrompt.trim()}
              >
                {isPending && optimizeMutation.variables?.action === "evaluate" ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
                )}
                {isZh ? "分析" : "Analyze"}
              </Button>
              <Button
                size="sm"
                onClick={handleOptimize}
                disabled={isPending || !originalPrompt.trim()}
              >
                {isPending && optimizeMutation.variables?.action === "optimize" ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                )}
                {isZh ? "优化" : "Optimize"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis result */}
      {analysisResult && (
        <Card className="border-accent">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                {isZh ? "分析报告" : "Analysis Report"}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setAnalysisResult("")}>
                ✕
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm whitespace-pre-wrap bg-muted/30 rounded-md p-4 font-mono">
              {analysisResult}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Optimized result */}
      {optimizedPrompt && (
        <Card className="border-accent">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {isZh ? "优化结果" : "Optimized Result"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={optimizedPrompt}
              onChange={(e) => setOptimizedPrompt(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                {isZh ? "复制" : "Copy"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSaveName("");
                  setSaveDialogOpen(true);
                }}
              >
                <Save className="mr-1.5 h-3.5 w-3.5" />
                {isZh ? "保存为 Prompt" : "Save as Prompt"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowIterate(!showIterate)}
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                {isZh ? "继续迭代" : "Iterate"}
              </Button>
            </div>

            {/* Iterate section */}
            {showIterate && (
              <div className="space-y-3 border-t pt-4">
                <Label className="text-sm font-medium">
                  {isZh ? "迭代反馈（描述改进方向）" : "Iteration feedback"}
                </Label>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder={
                    isZh
                      ? "例如：请增加错误处理的说明、语气更正式一些..."
                      : "e.g., Add error handling instructions, make tone more formal..."
                  }
                  className="min-h-[80px] text-sm"
                />
                <Button
                  size="sm"
                  onClick={handleIterate}
                  disabled={isPending || !feedback.trim()}
                >
                  {isPending && optimizeMutation.variables?.action === "iterate" ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {isZh ? "提交迭代" : "Submit Iteration"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* History */}
      {history.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{isZh ? "优化历史" : "History"}</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive h-7"
                onClick={() => clearHistoryMutation.mutate()}
              >
                <Trash2 className="mr-1 h-3 w-3" />
                {isZh ? "清除" : "Clear"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 rounded-md p-2 transition-colors"
                  onClick={() => {
                    setOriginalPrompt(item.original_prompt);
                    if (item.action !== "evaluate") {
                      setOptimizedPrompt(item.optimized_prompt);
                    }
                    if (item.analysis) setAnalysisResult(item.analysis);
                  }}
                >
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    v{history.length - idx}
                  </Badge>
                  <Badge
                    variant={item.action === "evaluate" ? "secondary" : "default"}
                    className="text-[10px] shrink-0"
                  >
                    {getActionLabel(item.action)}
                  </Badge>
                  <span className="text-muted-foreground shrink-0">
                    {getTemplateLabel(item.template)}
                  </span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="truncate text-muted-foreground">
                    {item.original_prompt.slice(0, 60)}...
                  </span>
                  <span className="ml-auto text-muted-foreground/60 shrink-0">
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save as Prompt dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isZh ? "保存为 Prompt" : "Save as Prompt"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{isZh ? "名称" : "Name"}</Label>
              <Input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder={isZh ? "提示词名称" : "Prompt name"}
              />
            </div>
            <div className="space-y-2">
              <Label>{isZh ? "目标文件" : "Target File"}</Label>
              <Select value={saveTarget} onValueChange={setSaveTarget}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TARGET_FILES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label} ({f.app})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              disabled={!saveName.trim() || saveAsPromptMutation.isPending}
              onClick={() =>
                saveAsPromptMutation.mutate({
                  name: saveName,
                  content: optimizedPrompt,
                  target_file: saveTarget,
                })
              }
            >
              {saveAsPromptMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isZh ? "保存" : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

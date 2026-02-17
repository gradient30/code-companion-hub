import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, BookOpen, Loader2, GitBranch, RefreshCw, Pencil, FolderGit2, LayoutGrid, List, Search, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { HelpDialog } from "@/components/HelpDialog";
import type { Tables } from "@/integrations/supabase/types";

type SkillsRepo = Tables<"skills_repos">;
type Skill = Tables<"skills">;

const PRESET_REPOS = {
  skills: [
    { owner: "ComposioHQ", repo: "awesome-claude-skills", branch: "master", desc: "Claude Skills 大合集（943 个技能）" },
    { owner: "anthropics", repo: "skills", desc: "Anthropic 官方技能仓库（17 个技能）" },
    { owner: "JimLiu", repo: "baoyu-skills", desc: "宝玉技能包（16 个技能）" },
    { owner: "cexll", repo: "myclaude", branch: "master", desc: "个人 Claude 技能集（13 个技能）" },
  ],
  dev: [
    { owner: "anthropics", repo: "anthropic-cookbook", desc: "Anthropic 实战示例" },
    { owner: "openai", repo: "openai-cookbook", desc: "OpenAI 实战示例" },
    { owner: "modelcontextprotocol", repo: "servers", desc: "MCP 官方服务器集合" },
    { owner: "microsoft", repo: "semantic-kernel", desc: "AI 编排框架" },
    { owner: "langchain-ai", repo: "langchain", desc: "LangChain 框架" },
    { owner: "run-llama", repo: "llama_index", desc: "LlamaIndex 数据框架" },
    { owner: "sigoden", repo: "aichat", desc: "全能 AI CLI 工具" },
    { owner: "continuedev", repo: "continue", desc: "Continue IDE AI 插件" },
    { owner: "cline", repo: "cline", desc: "Cline AI 编码助手" },
    { owner: "sourcegraph", repo: "cody", desc: "Cody AI 代码助手" },
  ],
  design: [
    { owner: "penpot", repo: "penpot", desc: "开源设计平台" },
    { owner: "excalidraw", repo: "excalidraw", desc: "手绘风格白板" },
    { owner: "tldraw", repo: "tldraw", desc: "在线白板引擎" },
    { owner: "theatre-js", repo: "theatre", desc: "动画编辑器" },
    { owner: "rive-app", repo: "rive-wasm", desc: "Rive 动画运行时" },
    { owner: "imgly", repo: "cesdk-web-examples", desc: "创意设计 SDK" },
    { owner: "BuilderIO", repo: "figma-html", desc: "Figma → HTML" },
    { owner: "tokens-studio", repo: "figma-plugin", desc: "设计 Token 插件" },
    { owner: "jina-ai", repo: "reader", desc: "网页内容提取" },
    { owner: "markdoc", repo: "markdoc", desc: "文档标记语言" },
  ],
  office: [
    { owner: "lobehub", repo: "lobe-chat", desc: "Lobe Chat" },
    { owner: "ChatGPTNextWeb", repo: "ChatGPT-Next-Web", desc: "ChatGPT Next Web" },
    { owner: "langgenius", repo: "dify", desc: "Dify AI 平台" },
    { owner: "n8n-io", repo: "n8n", desc: "工作流自动化" },
    { owner: "FlowiseAI", repo: "Flowise", desc: "可视化 AI 流" },
    { owner: "makeplane", repo: "plane", desc: "项目管理" },
    { owner: "AppFlowy-IO", repo: "AppFlowy", desc: "开源 Notion 替代" },
    { owner: "twentyhq", repo: "twenty", desc: "开源 CRM" },
    { owner: "hoppscotch", repo: "hoppscotch", desc: "API 调试工具" },
    { owner: "nocodb", repo: "nocodb", desc: "开源 Airtable 替代" },
  ],
  qa: [
    { owner: "microsoft", repo: "playwright", desc: "端到端测试框架" },
    { owner: "puppeteer", repo: "puppeteer", desc: "浏览器自动化" },
    { owner: "cypress-io", repo: "cypress", desc: "前端测试框架" },
    { owner: "SeleniumHQ", repo: "selenium", desc: "浏览器自动化" },
    { owner: "grafana", repo: "k6", desc: "负载测试工具" },
    { owner: "locustio", repo: "locust", desc: "性能测试框架" },
    { owner: "postmanlabs", repo: "httpbin", desc: "HTTP 测试服务" },
    { owner: "mockoon", repo: "mockoon", desc: "Mock API 工具" },
    { owner: "stoplightio", repo: "prism", desc: "API Mock 服务" },
    { owner: "karatelabs", repo: "karate", desc: "API 测试框架" },
  ],
  docs: [
    { owner: "jina-ai", repo: "reader", desc: "网页内容提取" },
    { owner: "Unstructured-IO", repo: "unstructured", desc: "非结构化数据处理" },
    { owner: "DS4SD", repo: "docling", desc: "文档解析引擎" },
    { owner: "VikParuchuri", repo: "marker", desc: "PDF → Markdown" },
    { owner: "opendatalab", repo: "MinerU", desc: "文档数据挖掘" },
    { owner: "Stirling-Tools", repo: "Stirling-PDF", desc: "PDF 处理工具" },
    { owner: "gotenberg", repo: "gotenberg", desc: "文档转换 API" },
    { owner: "jgm", repo: "pandoc", desc: "通用文档转换" },
    { owner: "azimutt", repo: "azimutt", desc: "数据库可视化" },
    { owner: "mermaid-js", repo: "mermaid", desc: "图表生成引擎" },
  ],
};

const PRESET_TABS = [
  { key: "skills", label: "🎯 Skills 仓库" },
  { key: "dev", label: "💻 研发类" },
  { key: "design", label: "🎨 设计类" },
  { key: "office", label: "📋 办公类" },
  { key: "qa", label: "🧪 QA 测试" },
  { key: "docs", label: "📄 文档处理" },
] as const;

// Skill 中文说明 Tooltip
const SKILL_TIPS: Record<string, string> = {
  "mcp-fetch": "为 AI 提供网络请求能力，可以访问外部 API 和网页内容",
  "mcp-filesystem": "让 AI 能够读写本地文件系统中的文件",
  "mcp-memory": "为 AI 提供持久化记忆存储，跨对话保持上下文",
  "playwright": "浏览器自动化测试工具，支持截图、表单操作等",
  "context7": "上下文增强服务，提升 AI 对项目代码的理解能力",
  "github": "GitHub API 集成，支持仓库管理、Issue、PR 等操作",
  "puppeteer": "Chrome 浏览器自动化，网页爬取、截图、PDF 生成",
  "brave-search": "Brave 搜索引擎集成，为 AI 提供实时网络搜索",
  "sequential-thinking": "增强 AI 的逐步思考和推理能力",
  "sqlite": "SQLite 数据库操作，支持本地数据库查询和管理",
  "postgres": "PostgreSQL 数据库连接与查询",
  "slack": "Slack 消息发送和频道管理集成",
};

function RepoForm({
  initial,
  onSave,
  saving,
}: {
  initial?: Partial<SkillsRepo>;
  onSave: (data: Partial<SkillsRepo>) => void;
  saving: boolean;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    owner: initial?.owner || "",
    repo: initial?.repo || "",
    branch: initial?.branch || "main",
    subdirectory: initial?.subdirectory || "",
    is_default: initial?.is_default ?? false,
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t("skills.repoOwner")} <span className="text-destructive">*</span></Label>
        <Input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} placeholder="anthropics" maxLength={100} />
      </div>
      <div className="space-y-2">
        <Label>{t("skills.repoName")} <span className="text-destructive">*</span></Label>
        <Input value={form.repo} onChange={(e) => setForm({ ...form, repo: e.target.value })} placeholder="claude-code" maxLength={100} />
      </div>
      <div className="space-y-2">
        <Label>{t("skills.branch")} <span className="text-xs text-muted-foreground ml-1">(选填)</span></Label>
        <Input value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} placeholder="main" maxLength={50} />
      </div>
      <div className="space-y-2">
        <Label>{t("skills.subdirectory")} <span className="text-xs text-muted-foreground ml-1">(选填)</span></Label>
        <Input value={form.subdirectory} onChange={(e) => setForm({ ...form, subdirectory: e.target.value })} placeholder="skills" maxLength={200} />
      </div>
      <div className="flex items-center justify-between">
        <Label>{t("skills.isDefault")} <span className="text-xs text-muted-foreground ml-1">(选填)</span></Label>
        <Switch checked={form.is_default} onCheckedChange={(v) => setForm({ ...form, is_default: v })} />
      </div>
      <Button className="w-full" onClick={() => onSave(form)} disabled={saving || !form.owner.trim() || !form.repo.trim()}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {t("common.save")}
      </Button>
    </div>
  );
}

export default function Skills() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [repoDialogOpen, setRepoDialogOpen] = useState(false);
  const [editingRepo, setEditingRepo] = useState<SkillsRepo | null>(null);
  const [scanningRepoId, setScanningRepoId] = useState<string | null>(null);

  // Skills view & filter state
  const [viewMode, setViewMode] = useState<string>(() => localStorage.getItem("skills-view") || "card");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterRepo, setFilterRepo] = useState<string>("all");

  const { data: repos = [], isLoading: reposLoading } = useQuery({
    queryKey: ["skills_repos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("skills_repos").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return data as SkillsRepo[];
    },
    enabled: !!user,
  });

  const { data: skills = [], isLoading: skillsLoading } = useQuery({
    queryKey: ["skills"],
    queryFn: async () => {
      const { data, error } = await supabase.from("skills").select("*").order("name", { ascending: true });
      if (error) throw error;
      return data as Skill[];
    },
    enabled: !!user,
  });

  const createRepoMutation = useMutation({
    mutationFn: async (data: Partial<SkillsRepo>) => {
      const { error } = await supabase.from("skills_repos").insert({ ...data, user_id: user!.id, owner: data.owner!, repo: data.repo! });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["skills_repos"] }); setRepoDialogOpen(false); toast({ title: t("common.success") }); },
    onError: (e) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  const updateRepoMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<SkillsRepo> & { id: string }) => {
      const { error } = await supabase.from("skills_repos").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["skills_repos"] }); setEditingRepo(null); toast({ title: t("common.success") }); },
    onError: (e) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  const deleteRepoMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("skills").delete().eq("repo_id", id);
      const { error } = await supabase.from("skills_repos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["skills_repos"] }); queryClient.invalidateQueries({ queryKey: ["skills"] }); toast({ title: t("common.success") }); },
    onError: (e) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  const toggleInstalled = useMutation({
    mutationFn: async ({ id, installed }: { id: string; installed: boolean }) => {
      const { error } = await supabase.from("skills").update({ installed }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["skills"] }),
  });

  const scanSkills = async (repo: SkillsRepo) => {
    setScanningRepoId(repo.id);
    try {
      const basePath = repo.subdirectory ? `${repo.subdirectory}` : "";
      const apiUrl = `https://api.github.com/repos/${repo.owner}/${repo.repo}/contents/${basePath}?ref=${repo.branch}`;
      const resp = await fetch(apiUrl);
      if (!resp.ok) {
        if (resp.status === 404) {
          throw new Error("仓库路径不存在，请检查子目录配置");
        }
        throw new Error(`GitHub API error: ${resp.status}`);
      }
      const items = await resp.json();

      const skillDirs = Array.isArray(items) ? items.filter((i: any) => i.type === "dir") : [];
      let count = 0;

      for (const dir of skillDirs) {
        const existing = skills.find((s) => s.name === dir.name && s.repo_id === repo.id);
        if (!existing) {
          let description = "";
          try {
            const readmeResp = await fetch(`https://api.github.com/repos/${repo.owner}/${repo.repo}/contents/${dir.path}/README.md?ref=${repo.branch}`);
            if (readmeResp.ok) {
              const readmeData = await readmeResp.json();
              const decoded = atob(readmeData.content);
              const firstLine = decoded.split("\n").find((l: string) => l.trim() && !l.startsWith("#"));
              description = firstLine?.trim().slice(0, 200) || "";
            }
          } catch { /* ignore */ }

          const { error } = await supabase.from("skills").insert({
            name: dir.name,
            description,
            repo_id: repo.id,
            user_id: user!.id,
          });
          if (!error) count++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ["skills"] });
      toast({ title: t("skills.scanSuccess").replace("{count}", String(count)) });
    } catch (e: any) {
      toast({ title: t("skills.scanFailed"), description: e.message, variant: "destructive" });
    } finally {
      setScanningRepoId(null);
    }
  };

  const addPresetRepo = (preset: { owner: string; repo: string; branch?: string }) => {
    createRepoMutation.mutate({ owner: preset.owner, repo: preset.repo, branch: preset.branch || "main", subdirectory: "", is_default: false });
  };

  const handleViewChange = (v: string) => {
    if (v) {
      setViewMode(v);
      localStorage.setItem("skills-view", v);
    }
  };

  // Filter skills
  const filteredSkills = skills.filter((skill) => {
    const matchSearch = !searchQuery || skill.name.toLowerCase().includes(searchQuery.toLowerCase()) || (skill.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = filterStatus === "all" || (filterStatus === "installed" ? skill.installed : !skill.installed);
    const matchRepo = filterRepo === "all" || skill.repo_id === filterRepo;
    return matchSearch && matchStatus && matchRepo;
  });

  if (reposLoading || skillsLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-2xl font-bold">{t("skills.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("skills.subtitle")}</p>
          </div>
          <HelpDialog sections={[
            { title: t("helpSkills.what"), content: t("helpSkills.whatDesc") },
            { title: t("helpSkills.repos"), content: t("helpSkills.reposDesc") },
            { title: t("helpSkills.scan"), content: t("helpSkills.scanDesc") },
          ]} />
        </div>
      </div>

      <Tabs defaultValue="repos">
        <TabsList>
          <TabsTrigger value="repos" className="gap-1"><FolderGit2 className="h-3.5 w-3.5" />仓库</TabsTrigger>
          <TabsTrigger value="skills" className="gap-1"><BookOpen className="h-3.5 w-3.5" />Skills</TabsTrigger>
        </TabsList>

        <TabsContent value="repos" className="mt-4 space-y-4">
          <div className="flex items-center gap-2">
            <Dialog open={repoDialogOpen} onOpenChange={setRepoDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="mr-1 h-4 w-4" />{t("skills.addRepo")}</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{t("skills.addRepo")}</DialogTitle></DialogHeader>
                {/* Preset repos by category */}
                <Tabs defaultValue="skills" className="mb-4">
                  <TabsList className="flex-wrap h-auto gap-1">
                    {PRESET_TABS.map((tab) => (
                      <TabsTrigger key={tab.key} value={tab.key} className="text-xs">{tab.label}</TabsTrigger>
                    ))}
                  </TabsList>
                  {PRESET_TABS.map((tab) => (
                    <TabsContent key={tab.key} value={tab.key} className="mt-2">
                      <div className="grid grid-cols-2 gap-1.5">
                        {PRESET_REPOS[tab.key as keyof typeof PRESET_REPOS].map((p) => (
                          <TooltipProvider key={`${p.owner}/${p.repo}`} delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="justify-start text-xs h-8 font-mono"
                                  onClick={() => addPresetRepo(p)}
                                >
                                  {p.owner}/{p.repo}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>{p.desc}</p></TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
                <RepoForm onSave={(data) => createRepoMutation.mutate(data)} saving={createRepoMutation.isPending} />
              </DialogContent>
            </Dialog>
          </div>

          {repos.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FolderGit2 className="mb-4 h-12 w-12 text-muted-foreground/40" />
                <p className="text-lg font-medium text-muted-foreground">{t("skills.emptyRepos")}</p>
                <p className="text-sm text-muted-foreground/60">{t("skills.emptyReposHint")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {repos.map((repo) => (
                <Card key={repo.id}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <GitBranch className="h-4 w-4 text-muted-foreground" />
                        {repo.owner}/{repo.repo}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {repo.branch}{repo.subdirectory ? ` / ${repo.subdirectory}` : ""}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7"
                        disabled={scanningRepoId === repo.id}
                        onClick={() => scanSkills(repo)}
                        title={t("skills.scanSkills")}
                      >
                        {scanningRepoId === repo.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingRepo(repo)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteRepoMutation.mutate(repo.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      {repo.is_default && <Badge variant="secondary" className="text-[10px]">默认</Badge>}
                      <span className="text-xs text-muted-foreground">{skills.filter((s) => s.repo_id === repo.id).length} Skills</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Dialog open={!!editingRepo} onOpenChange={(open) => !open && setEditingRepo(null)}>
            <DialogContent>
              <DialogHeader><DialogTitle>{t("skills.editRepo")}</DialogTitle></DialogHeader>
              {editingRepo && (
                <RepoForm
                  initial={editingRepo}
                  onSave={(data) => updateRepoMutation.mutate({ id: editingRepo.id, ...data })}
                  saving={updateRepoMutation.isPending}
                />
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="skills" className="mt-4 space-y-3">
          {/* Toolbar: search, filters, view toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索技能名称或描述..."
                className="pl-9 h-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[120px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="installed">已安装</SelectItem>
                <SelectItem value="uninstalled">未安装</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterRepo} onValueChange={setFilterRepo}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部仓库</SelectItem>
                {repos.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.owner}/{r.repo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ToggleGroup type="single" value={viewMode} onValueChange={handleViewChange} size="sm">
              <ToggleGroupItem value="card" aria-label="卡片视图"><LayoutGrid className="h-4 w-4" /></ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="列表视图"><List className="h-4 w-4" /></ToggleGroupItem>
            </ToggleGroup>
          </div>

          {filteredSkills.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <BookOpen className="mb-4 h-12 w-12 text-muted-foreground/40" />
                <p className="text-lg font-medium text-muted-foreground">{skills.length === 0 ? t("skills.emptySkills") : "无匹配结果"}</p>
                <p className="text-sm text-muted-foreground/60">{skills.length === 0 ? t("skills.emptySkillsHint") : "尝试调整筛选条件"}</p>
              </CardContent>
            </Card>
          ) : viewMode === "list" ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead>来源仓库</TableHead>
                    <TableHead>描述</TableHead>
                    <TableHead className="w-[80px]">状态</TableHead>
                    <TableHead className="w-[60px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSkills.map((skill) => {
                    const repo = repos.find((r) => r.id === skill.repo_id);
                    const tip = SKILL_TIPS[skill.name];
                    return (
                      <TableRow key={skill.id} className={!skill.installed ? "opacity-60" : ""}>
                        <TableCell className="font-medium text-sm">{skill.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{repo ? `${repo.owner}/${repo.repo}` : "-"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                          {tip ? (
                            <TooltipProvider delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex items-center gap-1 cursor-help">
                                    <span className="truncate">{skill.description || tip}</span>
                                    <Info className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs"><p>{tip}</p></TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="truncate">{skill.description || "-"}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={skill.installed ? "default" : "secondary"} className="text-[10px]">
                            {skill.installed ? "已安装" : "未安装"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={skill.installed}
                            onCheckedChange={(v) => toggleInstalled.mutate({ id: skill.id, installed: v })}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredSkills.map((skill) => {
                const repo = repos.find((r) => r.id === skill.repo_id);
                const tip = SKILL_TIPS[skill.name];
                return (
                  <Card key={skill.id} className={`transition-opacity ${!skill.installed ? "opacity-60" : ""}`}>
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                      <div>
                        <CardTitle className="text-sm">{skill.name}</CardTitle>
                        {repo && <p className="text-[10px] text-muted-foreground">{repo.owner}/{repo.repo}</p>}
                      </div>
                      <Switch
                        checked={skill.installed}
                        onCheckedChange={(v) => toggleInstalled.mutate({ id: skill.id, installed: v })}
                      />
                    </CardHeader>
                    <CardContent>
                      {tip ? (
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="text-xs text-muted-foreground line-clamp-2 cursor-help inline-flex items-center gap-1">
                                {skill.description || tip}
                                <Info className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                              </p>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs"><p>{tip}</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : skill.description ? (
                        <p className="text-xs text-muted-foreground line-clamp-2">{skill.description}</p>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

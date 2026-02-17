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
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, BookOpen, Loader2, GitBranch, RefreshCw, Download, CheckCircle2, FolderGit2, Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Tables } from "@/integrations/supabase/types";

type SkillsRepo = Tables<"skills_repos">;
type Skill = Tables<"skills">;

const DEFAULT_REPOS = [
  { owner: "anthropics", repo: "claude-code", branch: "main", subdirectory: "skills" },
  { owner: "anthropics", repo: "courses", branch: "master", subdirectory: "" },
];

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
        <Label>{t("skills.repoOwner")}</Label>
        <Input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} placeholder="anthropics" maxLength={100} />
      </div>
      <div className="space-y-2">
        <Label>{t("skills.repoName")}</Label>
        <Input value={form.repo} onChange={(e) => setForm({ ...form, repo: e.target.value })} placeholder="claude-code" maxLength={100} />
      </div>
      <div className="space-y-2">
        <Label>{t("skills.branch")}</Label>
        <Input value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} placeholder="main" maxLength={50} />
      </div>
      <div className="space-y-2">
        <Label>{t("skills.subdirectory")}</Label>
        <Input value={form.subdirectory} onChange={(e) => setForm({ ...form, subdirectory: e.target.value })} placeholder="skills" maxLength={200} />
      </div>
      <div className="flex items-center justify-between">
        <Label>{t("skills.isDefault")}</Label>
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
      if (!resp.ok) throw new Error(`GitHub API error: ${resp.status}`);
      const items = await resp.json();

      const skillDirs = Array.isArray(items) ? items.filter((i: any) => i.type === "dir") : [];
      let count = 0;

      for (const dir of skillDirs) {
        const existing = skills.find((s) => s.name === dir.name && s.repo_id === repo.id);
        if (!existing) {
          // Try to fetch README for description
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

  const addDefaultRepo = (preset: typeof DEFAULT_REPOS[0]) => {
    createRepoMutation.mutate({ ...preset, is_default: true });
  };

  if (reposLoading || skillsLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("skills.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("skills.subtitle")}</p>
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
              <DialogContent>
                <DialogHeader><DialogTitle>{t("skills.addRepo")}</DialogTitle></DialogHeader>
                <div className="mb-4 flex flex-wrap gap-2">
                  {DEFAULT_REPOS.map((p) => (
                    <Button key={`${p.owner}/${p.repo}`} variant="outline" size="sm" onClick={() => addDefaultRepo(p)}>
                      {p.owner}/{p.repo}
                    </Button>
                  ))}
                </div>
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
          {skills.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <BookOpen className="mb-4 h-12 w-12 text-muted-foreground/40" />
                <p className="text-lg font-medium text-muted-foreground">{t("skills.emptySkills")}</p>
                <p className="text-sm text-muted-foreground/60">{t("skills.emptySkillsHint")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {skills.map((skill) => {
                const repo = repos.find((r) => r.id === skill.repo_id);
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
                    {skill.description && (
                      <CardContent>
                        <p className="text-xs text-muted-foreground line-clamp-2">{skill.description}</p>
                      </CardContent>
                    )}
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

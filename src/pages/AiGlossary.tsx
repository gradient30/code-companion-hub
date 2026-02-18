import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Bot, GitFork, Users, BookOpen, Server, Radio, Code2, Database, GitBranch, MessageSquare,
  ChevronDown, ChevronUp, Search, Lightbulb, Zap, Target, Link2,
  Cpu, Sparkles, Globe, BrainCircuit, Layers
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { LucideIcon } from "lucide-react";

interface GlossarySection {
  titleKey: string;
  contentKey: string;
  badge: "concept" | "function" | "scenario" | "relation";
  icon: LucideIcon;
}

interface GlossaryConcept {
  id: string;
  titleKey: string;
  subtitleKey: string;
  icon: LucideIcon;
  sections: GlossarySection[];
}

interface GlossaryTab {
  id: string;
  nameKey: string;
  concepts: GlossaryConcept[];
}

const badgeConfig: Record<string, { className: string; icon: LucideIcon }> = {
  concept: { className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800", icon: Lightbulb },
  function: { className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800", icon: Zap },
  scenario: { className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800", icon: Target },
  relation: { className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800", icon: Link2 },
};

function makeSections(id: string): GlossarySection[] {
  return [
    { titleKey: `aiGlossary.${id}.definition`, contentKey: `aiGlossary.${id}.definitionContent`, badge: "concept", icon: Lightbulb },
    { titleKey: `aiGlossary.${id}.function`, contentKey: `aiGlossary.${id}.functionContent`, badge: "function", icon: Zap },
    { titleKey: `aiGlossary.${id}.scenario`, contentKey: `aiGlossary.${id}.scenarioContent`, badge: "scenario", icon: Target },
    { titleKey: `aiGlossary.${id}.relation`, contentKey: `aiGlossary.${id}.relationContent`, badge: "relation", icon: Link2 },
  ];
}

const glossaryTabs: GlossaryTab[] = [
  {
    id: "agent-system",
    nameKey: "aiGlossary.tabs.agentSystem",
    concepts: [
      { id: "agent", titleKey: "aiGlossary.agent.title", subtitleKey: "aiGlossary.agent.subtitle", icon: Bot, sections: makeSections("agent") },
      { id: "sub-agent", titleKey: "aiGlossary.subAgent.title", subtitleKey: "aiGlossary.subAgent.subtitle", icon: GitFork, sections: makeSections("subAgent") },
      { id: "agent-team", titleKey: "aiGlossary.agentTeam.title", subtitleKey: "aiGlossary.agentTeam.subtitle", icon: Users, sections: makeSections("agentTeam") },
      { id: "skills", titleKey: "aiGlossary.skills.title", subtitleKey: "aiGlossary.skills.subtitle", icon: BookOpen, sections: makeSections("skills") },
    ],
  },
  {
    id: "protocols",
    nameKey: "aiGlossary.tabs.protocols",
    concepts: [
      { id: "mcp", titleKey: "aiGlossary.mcp.title", subtitleKey: "aiGlossary.mcp.subtitle", icon: Server, sections: makeSections("mcp") },
      { id: "acp", titleKey: "aiGlossary.acp.title", subtitleKey: "aiGlossary.acp.subtitle", icon: Radio, sections: makeSections("acp") },
      { id: "lsp", titleKey: "aiGlossary.lsp.title", subtitleKey: "aiGlossary.lsp.subtitle", icon: Code2, sections: makeSections("lsp") },
    ],
  },
  {
    id: "methods",
    nameKey: "aiGlossary.tabs.methods",
    concepts: [
      { id: "rag", titleKey: "aiGlossary.rag.title", subtitleKey: "aiGlossary.rag.subtitle", icon: Database, sections: makeSections("rag") },
      { id: "workflow", titleKey: "aiGlossary.workflow.title", subtitleKey: "aiGlossary.workflow.subtitle", icon: GitBranch, sections: makeSections("workflow") },
      { id: "prompt", titleKey: "aiGlossary.prompt.title", subtitleKey: "aiGlossary.prompt.subtitle", icon: MessageSquare, sections: makeSections("prompt") },
    ],
  },
  {
    id: "models",
    nameKey: "aiGlossary.tabs.models",
    concepts: [
      { id: "anthropic", titleKey: "aiGlossary.anthropic.title", subtitleKey: "aiGlossary.anthropic.subtitle", icon: Sparkles, sections: makeSections("anthropic") },
      { id: "openai", titleKey: "aiGlossary.openai.title", subtitleKey: "aiGlossary.openai.subtitle", icon: BrainCircuit, sections: makeSections("openai") },
      { id: "google", titleKey: "aiGlossary.google.title", subtitleKey: "aiGlossary.google.subtitle", icon: Globe, sections: makeSections("google") },
      { id: "meta", titleKey: "aiGlossary.meta.title", subtitleKey: "aiGlossary.meta.subtitle", icon: Layers, sections: makeSections("meta") },
      { id: "chinese", titleKey: "aiGlossary.chinese.title", subtitleKey: "aiGlossary.chinese.subtitle", icon: Cpu, sections: makeSections("chinese") },
      { id: "specialized", titleKey: "aiGlossary.specialized.title", subtitleKey: "aiGlossary.specialized.subtitle", icon: Zap, sections: makeSections("specialized") },
    ],
  },
];

export default function AiGlossary() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [openItems, setOpenItems] = useState<string[]>([]);

  const filteredTabs = useMemo(() => {
    if (!search.trim()) return glossaryTabs;
    const q = search.toLowerCase();
    return glossaryTabs.map(tab => ({
      ...tab,
      concepts: tab.concepts.filter(c => {
        const title = t(c.titleKey).toLowerCase();
        const subtitle = t(c.subtitleKey).toLowerCase();
        const sectionMatch = c.sections.some(s => t(s.contentKey).toLowerCase().includes(q));
        return title.includes(q) || subtitle.includes(q) || sectionMatch;
      }),
    }));
  }, [search, t]);

  const totalCount = glossaryTabs.reduce((s, tab) => s + tab.concepts.length, 0);
  const filteredCount = filteredTabs.reduce((s, tab) => s + tab.concepts.length, 0);

  const allConceptIds = glossaryTabs.flatMap(tab => tab.concepts.map(c => c.id));

  const expandAll = () => setOpenItems(allConceptIds);
  const collapseAll = () => setOpenItems([]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("aiGlossary.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("aiGlossary.subtitle")}</p>
      </div>

      <Tabs defaultValue="agent-system">
        <TabsList>
          {glossaryTabs.map(tab => (
            <TabsTrigger key={tab.id} value={tab.id}>{t(tab.nameKey)}</TabsTrigger>
          ))}
        </TabsList>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("aiGlossary.searchPlaceholder")}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={expandAll}>
              <ChevronDown className="mr-1 h-4 w-4" />
              {t("aiGlossary.expandAll")}
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              <ChevronUp className="mr-1 h-4 w-4" />
              {t("aiGlossary.collapseAll")}
            </Button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mt-2">
          {t("aiGlossary.showing")} {filteredCount} / {t("aiGlossary.total")} {totalCount} {t("aiGlossary.items")}
        </p>

        {glossaryTabs.map(tab => (
          <TabsContent key={tab.id} value={tab.id}>
            {filteredTabs.find(ft => ft.id === tab.id)?.concepts.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">{t("aiGlossary.noResults")}</p>
            ) : (
              <Accordion
                type="multiple"
                value={openItems}
                onValueChange={setOpenItems}
                className="space-y-3"
              >
                {filteredTabs.find(ft => ft.id === tab.id)?.concepts.map(concept => (
                  <AccordionItem key={concept.id} value={concept.id} className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                          <concept.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="text-left">
                          <span className="font-semibold">{t(concept.titleKey)}</span>
                          <span className="text-muted-foreground text-sm ml-2">{t(concept.subtitleKey)}</span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                        {concept.sections.map(section => {
                          const cfg = badgeConfig[section.badge];
                          return (
                            <Card key={section.badge} className="border">
                              <CardContent className="p-4 space-y-2">
                                <div className="flex items-center gap-2">
                                  <Badge className={cfg.className}>
                                    <cfg.icon className="h-3 w-3 mr-1" />
                                    {t(section.titleKey)}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                                  {t(section.contentKey)}
                                </p>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

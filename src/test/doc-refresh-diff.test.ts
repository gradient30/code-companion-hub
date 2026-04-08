import { describe, expect, it } from "vitest";

import { buildCliCommandEntityKey, buildGuideEntityKey } from "@/features/docs-refresh/entity-keys";
import { diffCatalogItems } from "@/features/docs-refresh/diff";
import { mergeOverrides } from "@/features/docs-refresh/merge";
import type { DocRefreshOverride } from "@/features/docs-refresh/types";

describe("doc refresh diff utilities", () => {
  it("builds stable entity keys", () => {
    expect(buildCliCommandEntityKey("claude", "model config", "/model")).toBe("cli:claude:model config:/model");
    expect(buildGuideEntityKey("skills", "codex", "install", "Agent Skills")).toBe("guide:skills:codex:install:Agent Skills");
  });

  it("classifies added, modified, stale, and similar items", () => {
    const baseline = [
      {
        entityKey: "guide:skills:claude:overview:Task Skills",
        vendorId: "claude",
        category: "overview",
        title: "Task Skills",
        description: "Load skills on demand",
      },
      {
        entityKey: "guide:skills:claude:setup:Install Skills",
        vendorId: "claude",
        category: "setup",
        title: "Install Skills",
        description: "Install via .claude/skills",
      },
    ];

    const candidate = [
      {
        entityKey: "guide:skills:claude:overview:Task Skills",
        vendorId: "claude",
        category: "overview",
        title: "Task Skills",
        description: "Load skills on demand with refreshed wording",
      },
      {
        entityKey: "guide:skills:claude:setup:Install Skills Updated",
        vendorId: "claude",
        category: "setup",
        title: "Install Skills Updated",
        description: "Install via .claude/skills with refreshed wording",
      },
    ];

    const result = diffCatalogItems({ baseline, candidate });

    expect(result.summary).toEqual({
      added: 0,
      modified: 1,
      stale: 0,
      similar: 1,
    });
  });

  it("matches a baseline item as similar only once", () => {
    const baseline = [
      {
        entityKey: "guide:skills:claude:setup:Install Skills",
        vendorId: "claude",
        category: "setup",
        title: "Install Skills",
        description: "Install via .claude/skills",
      },
    ];

    const candidate = [
      {
        entityKey: "guide:skills:claude:setup:Install Skills Alpha",
        vendorId: "claude",
        category: "setup",
        title: "Install Skills Alpha",
        description: "Install via .claude/skills with alpha wording",
      },
      {
        entityKey: "guide:skills:claude:setup:Install Skills Beta",
        vendorId: "claude",
        category: "setup",
        title: "Install Skills Beta",
        description: "Install via .claude/skills with beta wording",
      },
    ];

    const result = diffCatalogItems({ baseline, candidate });

    expect(result.summary).toEqual({
      added: 1,
      modified: 0,
      stale: 0,
      similar: 1,
    });
  });

  it("applies delete tombstones before upserts while keeping order stable", () => {
    const baseline = [
      { entityKey: "one" },
      { entityKey: "two" },
      { entityKey: "three" },
    ];

    const overrides: DocRefreshOverride<{ entityKey: string }>[] = [
      { entityKey: "two", overrideType: "delete" },
      { entityKey: "three", overrideType: "upsert", payload: { entityKey: "three" } },
      { entityKey: "four", overrideType: "upsert", payload: { entityKey: "four" } },
    ];

    expect(mergeOverrides(baseline, overrides)).toEqual([
      { entityKey: "one" },
      { entityKey: "three" },
      { entityKey: "four" },
    ]);
  });
});

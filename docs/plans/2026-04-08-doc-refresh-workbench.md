# Docs Refresh Workbench Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a persistent docs refresh workbench for guide/help pages with shared 4-vendor tabs, Firecrawl user configuration, refresh runs, diff review, and publishable overrides.

**Architecture:** Keep `src/config/docs-catalog/*.ts` as the checked-in baseline. Add Supabase-backed user settings, refresh runs, snapshots, diffs, and published overrides. Refactor target pages to consume a shared tabs header, a shared refresh toolbar, and merged baseline-plus-override data.

**Tech Stack:** React 18, TypeScript, TanStack Query, shadcn/ui, Supabase Postgres/Auth/RLS, Supabase Edge Functions, Vitest.

---

### Task 1: Add database tables and RLS for docs refresh

**Files:**
- Create: `supabase/migrations/20260408_add_doc_refresh_tables.sql`
- Modify: `src/integrations/supabase/types.ts`
- Test: `src/test/doc-refresh-schema.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import type { Database } from "@/integrations/supabase/types";

describe("doc refresh schema", () => {
  it("includes doc refresh tables", () => {
    type Tables = Database["public"]["Tables"];
    expectTypeOf<Tables["doc_refresh_runs"]>().toBeDefined();
    expectTypeOf<Tables["doc_catalog_overrides"]>().toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/test/doc-refresh-schema.test.ts`
Expected: FAIL because the new table names are missing from generated types.

**Step 3: Add the SQL migration**

```sql
create table public.doc_refresh_user_settings (...);
create table public.doc_refresh_runs (...);
create table public.doc_refresh_snapshots (...);
create table public.doc_refresh_diff_items (...);
create table public.doc_catalog_overrides (...);

alter table ... enable row level security;
create policy ... using (auth.uid() = user_id);
```

**Step 4: Update Supabase TypeScript types**

```ts
doc_refresh_runs: {
  Row: { id: string; user_id: string; scope: string; status: string; ... };
  Insert: { user_id: string; scope: string; ... };
  Update: { scope?: string; status?: string; ... };
  Relationships: [];
}
```

**Step 5: Run test to verify it passes**

Run: `npm run test -- src/test/doc-refresh-schema.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add supabase/migrations/20260408_add_doc_refresh_tables.sql src/integrations/supabase/types.ts src/test/doc-refresh-schema.test.ts
git commit -m "feat: add docs refresh schema"
```

### Task 2: Build docs refresh domain models and diff utilities

**Files:**
- Create: `src/features/docs-refresh/types.ts`
- Create: `src/features/docs-refresh/entity-keys.ts`
- Create: `src/features/docs-refresh/diff.ts`
- Create: `src/features/docs-refresh/merge.ts`
- Test: `src/test/doc-refresh-diff.test.ts`

**Step 1: Write the failing test**

```ts
import { buildGuideEntityKey, diffCatalogItems, mergeOverrides } from "@/features/docs-refresh/diff";

it("classifies added, modified, stale, and similar items", () => {
  const result = diffCatalogItems({ baseline, candidate });
  expect(result.summary.added).toBe(1);
  expect(result.summary.modified).toBe(1);
  expect(result.summary.stale).toBe(1);
  expect(result.summary.similar).toBe(1);
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/test/doc-refresh-diff.test.ts`
Expected: FAIL because the docs refresh domain module does not exist.

**Step 3: Implement stable keys and diff logic**

```ts
export function buildCommandEntityKey(vendorId: string, category: string, command: string) {
  return `cli:${vendorId}:${category}:${command}`;
}

export function buildGuideEntityKey(scope: string, vendorId: string, category: string, title: string) {
  return `guide:${scope}:${vendorId}:${category}:${title}`;
}
```

**Step 4: Implement override merge**

```ts
export function mergeOverrides<T>(baseline: T[], overrides: OverrideRecord[]) {
  // apply delete tombstones first, then upserts, preserve stable order
}
```

**Step 5: Run test to verify it passes**

Run: `npm run test -- src/test/doc-refresh-diff.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/features/docs-refresh/types.ts src/features/docs-refresh/entity-keys.ts src/features/docs-refresh/diff.ts src/features/docs-refresh/merge.ts src/test/doc-refresh-diff.test.ts
git commit -m "feat: add docs refresh diff engine"
```

### Task 3: Add Firecrawl settings and refresh Edge Functions

**Files:**
- Create: `supabase/functions/doc-refresh-settings/index.ts`
- Create: `supabase/functions/doc-refresh-run/index.ts`
- Modify: `supabase/config.toml`
- Modify: `src/config/docs-catalog/types.ts`
- Test: `src/test/doc-refresh-settings-client.test.ts`

**Step 1: Write the failing test**

```ts
it("returns masked firecrawl configuration status", async () => {
  const result = await getDocRefreshSettings();
  expect(result.firecrawlKeyMask).toMatch(/\*+/);
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/test/doc-refresh-settings-client.test.ts`
Expected: FAIL because the settings API wrapper does not exist.

**Step 3: Implement settings Edge Function**

```ts
if (req.method === "GET") return Response.json({ firecrawlKeyMask, firecrawlLastVerifiedAt });
if (req.method === "POST") return saveAndVerifyKey(...);
if (req.method === "DELETE") return clearKey(...);
```

**Step 4: Implement refresh Edge Function**

```ts
const run = await createRun(...);
const sources = await resolveSources(scope, vendorIds, sourceMode);
const snapshots = await fetchAndNormalizeSources(sources, firecrawlKey);
const diffs = diffCatalogItems({ baseline, candidate: snapshots });
await persistRunArtifacts(run.id, snapshots, diffs);
```

**Step 5: Register functions in Supabase config**

```toml
[functions.doc-refresh-settings]
verify_jwt = true

[functions.doc-refresh-run]
verify_jwt = true
```

**Step 6: Run targeted tests**

Run: `npm run test -- src/test/doc-refresh-settings-client.test.ts`
Expected: PASS

**Step 7: Commit**

```bash
git add supabase/functions/doc-refresh-settings/index.ts supabase/functions/doc-refresh-run/index.ts supabase/config.toml src/config/docs-catalog/types.ts src/test/doc-refresh-settings-client.test.ts
git commit -m "feat: add docs refresh edge functions"
```

### Task 4: Add frontend docs refresh data layer

**Files:**
- Create: `src/features/docs-refresh/api.ts`
- Create: `src/features/docs-refresh/hooks.ts`
- Create: `src/features/docs-refresh/selectors.ts`
- Test: `src/test/doc-refresh-api.test.ts`

**Step 1: Write the failing test**

```ts
it("maps refresh run responses into page-ready view models", async () => {
  const data = await fetchLatestDocRefreshRun("skills", "skills-guide");
  expect(data.summary.pending).toBeGreaterThanOrEqual(0);
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/test/doc-refresh-api.test.ts`
Expected: FAIL because the API module does not exist.

**Step 3: Add API wrappers**

```ts
export async function fetchDocRefreshSettings() { ... }
export async function saveDocRefreshSettings(input: SaveSettingsInput) { ... }
export async function triggerDocRefresh(input: TriggerRefreshInput) { ... }
export async function applyDocRefreshDecision(input: ApplyDecisionInput) { ... }
```

**Step 4: Add React Query hooks**

```ts
export function useDocRefreshSettings() { ... }
export function useLatestDocRefreshRun(scope: DocRefreshScope, pageRoute: string) { ... }
export function useTriggerDocRefresh() { ... }
```

**Step 5: Run test to verify it passes**

Run: `npm run test -- src/test/doc-refresh-api.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/features/docs-refresh/api.ts src/features/docs-refresh/hooks.ts src/features/docs-refresh/selectors.ts src/test/doc-refresh-api.test.ts
git commit -m "feat: add docs refresh frontend data layer"
```

### Task 5: Build shared UI components for tabs, toolbar, config, and diff workbench

**Files:**
- Create: `src/components/docs-refresh/VendorGuideTabs.tsx`
- Create: `src/components/docs-refresh/DocRefreshToolbar.tsx`
- Create: `src/components/docs-refresh/FirecrawlConfigDialog.tsx`
- Create: `src/components/docs-refresh/DocDiffWorkbench.tsx`
- Test: `src/test/vendor-guide-tabs.test.tsx`
- Test: `src/test/doc-refresh-toolbar.test.tsx`

**Step 1: Write the failing tests**

```tsx
it("renders four vendors in a single shared tabs header", () => {
  render(<VendorGuideTabs value="claude" onValueChange={() => {}} />);
  expect(screen.getByRole("tab", { name: "OpenCode" })).toBeInTheDocument();
});

it("shows refresh status and actions", () => {
  render(<DocRefreshToolbar ... />);
  expect(screen.getByRole("button", { name: /数据刷新/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Firecrawl 配置/i })).toBeInTheDocument();
});
```

**Step 2: Run tests to verify they fail**

Run: `npm run test -- src/test/vendor-guide-tabs.test.tsx src/test/doc-refresh-toolbar.test.tsx`
Expected: FAIL because the shared components do not exist.

**Step 3: Implement shared tabs and toolbar**

```tsx
<TabsList className="flex w-full gap-1 overflow-x-auto whitespace-nowrap">
  {VENDORS.map((vendor) => (
    <TabsTrigger key={vendor.id} value={vendor.id}>{vendor.name}</TabsTrigger>
  ))}
</TabsList>
```

**Step 4: Implement Firecrawl config dialog and diff workbench**

```tsx
<Dialog>
  <DialogContent>
    <DialogHeader>...</DialogHeader>
    <Input type="password" ... />
    <Button>测试连接</Button>
    <Button>保存</Button>
  </DialogContent>
</Dialog>
```

**Step 5: Run tests to verify they pass**

Run: `npm run test -- src/test/vendor-guide-tabs.test.tsx src/test/doc-refresh-toolbar.test.tsx`
Expected: PASS

**Step 6: Commit**

```bash
git add src/components/docs-refresh/VendorGuideTabs.tsx src/components/docs-refresh/DocRefreshToolbar.tsx src/components/docs-refresh/FirecrawlConfigDialog.tsx src/components/docs-refresh/DocDiffWorkbench.tsx src/test/vendor-guide-tabs.test.tsx src/test/doc-refresh-toolbar.test.tsx
git commit -m "feat: add docs refresh shared UI"
```

### Task 6: Refactor guide pages to use shared tabs and refresh workbench

**Files:**
- Modify: `src/pages/CliGuide.tsx`
- Modify: `src/pages/SkillsGuide.tsx`
- Modify: `src/pages/SetupGuide.tsx`
- Modify: `src/pages/Providers.tsx`
- Modify: `src/pages/McpServers.tsx`
- Test: `src/test/cli-guide-render.test.tsx`
- Test: `src/test/skills-guide-policy.test.tsx`
- Test: `src/test/setup-guide-freshness.test.ts`
- Test: `src/test/docs-refresh-pages.test.tsx`

**Step 1: Write the failing page integration test**

```tsx
it("shows refresh controls on every docs-backed page", () => {
  render(<CliGuide />);
  expect(screen.getByRole("button", { name: /数据刷新/i })).toBeInTheDocument();
});
```

**Step 2: Run tests to verify they fail**

Run: `npm run test -- src/test/docs-refresh-pages.test.tsx src/test/cli-guide-render.test.tsx src/test/skills-guide-policy.test.tsx`
Expected: FAIL because the pages still render independent tabs and no shared refresh toolbar.

**Step 3: Replace per-page tabs with shared `VendorGuideTabs`**

```tsx
<VendorGuideTabs value={activeTab} onValueChange={setActiveTab} tools={CLI_GUIDE_TOOLS} />
<DocRefreshToolbar scope="cli" pageRoute="/cli-guide" vendorId={activeTab} />
```

**Step 4: Add toolbar-only integration to Providers and MCP pages**

```tsx
<DocRefreshToolbar scope="help" pageRoute="/providers" vendorId={selectedVendor ?? null} />
```

**Step 5: Run tests to verify they pass**

Run: `npm run test -- src/test/docs-refresh-pages.test.tsx src/test/cli-guide-render.test.tsx src/test/skills-guide-policy.test.tsx src/test/setup-guide-freshness.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/pages/CliGuide.tsx src/pages/SkillsGuide.tsx src/pages/SetupGuide.tsx src/pages/Providers.tsx src/pages/McpServers.tsx src/test/docs-refresh-pages.test.tsx src/test/cli-guide-render.test.tsx src/test/skills-guide-policy.test.tsx src/test/setup-guide-freshness.test.ts
git commit -m "feat: wire docs refresh into guide pages"
```

### Task 7: Apply published overrides when rendering effective catalog data

**Files:**
- Create: `src/features/docs-refresh/effective-catalog.ts`
- Modify: `src/pages/CliGuide.tsx`
- Modify: `src/pages/SkillsGuide.tsx`
- Modify: `src/pages/SetupGuide.tsx`
- Test: `src/test/effective-catalog.test.ts`

**Step 1: Write the failing test**

```ts
it("applies delete tombstones before upserts", () => {
  const result = buildEffectiveCatalog({ baseline, overrides });
  expect(result.some((item) => item.title === "Old Title")).toBe(false);
  expect(result.some((item) => item.title === "New Title")).toBe(true);
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/test/effective-catalog.test.ts`
Expected: FAIL because the effective catalog builder does not exist.

**Step 3: Implement effective catalog builder**

```ts
export function buildEffectiveCatalog(args: { baseline: CatalogData; overrides: OverrideRecord[] }) {
  return mergeOverrides(args.baseline, args.overrides);
}
```

**Step 4: Update pages to read merged data instead of raw catalog constants**

```tsx
const effectiveTools = useEffectiveGuideCatalog("skills");
```

**Step 5: Run test to verify it passes**

Run: `npm run test -- src/test/effective-catalog.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/features/docs-refresh/effective-catalog.ts src/pages/CliGuide.tsx src/pages/SkillsGuide.tsx src/pages/SetupGuide.tsx src/test/effective-catalog.test.ts
git commit -m "feat: apply published docs overrides at runtime"
```

### Task 8: Add verification script and final regression coverage

**Files:**
- Create: `scripts/verify-docs-refresh.ts`
- Modify: `package.json`
- Modify: `src/test/guide-catalog.test.ts`
- Test: `src/test/docs-refresh-pages.test.tsx`

**Step 1: Write the failing verification test**

```ts
it("requires docs refresh pages to expose a refresh toolbar", () => {
  expect(DOCS_REFRESH_PAGES).toEqual([
    "/cli-guide",
    "/skills-guide",
    "/setup-guide",
    "/providers",
    "/mcp",
  ]);
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/test/docs-refresh-pages.test.tsx`
Expected: FAIL until the shared page registry and verification script are wired.

**Step 3: Add `verify-docs-refresh`**

```ts
// validate tables, route registry, target scopes, and page wiring
```

**Step 4: Register package script**

```json
"verify:docs-refresh": "node --experimental-strip-types scripts/verify-docs-refresh.ts"
```

**Step 5: Run the final regression commands**

Run: `npm run test`
Expected: PASS

Run: `npm run verify:guides`
Expected: PASS

Run: `npm run verify:docs-refresh`
Expected: PASS

**Step 6: Commit**

```bash
git add scripts/verify-docs-refresh.ts package.json src/test/guide-catalog.test.ts src/test/docs-refresh-pages.test.tsx
git commit -m "test: add docs refresh verification"
```

### Task 9: Final verification and deployment handoff

**Files:**
- Review: `docs/plans/2026-04-08-doc-refresh-design.md`
- Review: `docs/plans/2026-04-08-doc-refresh-workbench.md`
- Review: `supabase/functions/doc-refresh-settings/index.ts`
- Review: `supabase/functions/doc-refresh-run/index.ts`

**Step 1: Run local verification**

Run: `npm run lint`
Expected: PASS

**Step 2: Run automated tests**

Run: `npm run test`
Expected: PASS

**Step 3: Run guide verification**

Run: `npm run verify:guides`
Expected: PASS

**Step 4: Run docs refresh verification**

Run: `npm run verify:docs-refresh`
Expected: PASS

**Step 5: Deploy edge functions**

Run: `supabase functions deploy doc-refresh-settings`
Expected: deployment succeeds

Run: `supabase functions deploy doc-refresh-run`
Expected: deployment succeeds

**Step 6: Commit**

```bash
git add .
git commit -m "feat: ship docs refresh workbench"
```

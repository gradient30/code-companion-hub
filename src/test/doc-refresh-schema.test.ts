import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/20260408_add_doc_refresh_tables.sql";
const typesPath = "src/integrations/supabase/types.ts";

function readText(path: string) {
  return readFileSync(path, "utf8");
}

describe("doc refresh schema", () => {
  it("defines the docs refresh tables and row level security", () => {
    const migration = readText(migrationPath);
    const types = readText(typesPath);

    expect(migration).toContain("CREATE TABLE public.doc_refresh_user_settings");
    expect(migration).toContain("CREATE TABLE public.doc_refresh_runs");
    expect(migration).toContain("CREATE TABLE public.doc_refresh_snapshots");
    expect(migration).toContain("CREATE TABLE public.doc_refresh_diff_items");
    expect(migration).toContain("CREATE TABLE public.doc_catalog_overrides");
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("Users can view own doc_refresh_runs");
    expect(migration).toContain("Users can insert own doc_refresh_runs");
    expect(migration).toContain("Users can view own doc_refresh_diff_items");

    expect(types).toContain("doc_refresh_user_settings");
    expect(types).toContain("doc_refresh_runs");
    expect(types).toContain("doc_refresh_snapshots");
    expect(types).toContain("doc_refresh_diff_items");
    expect(types).toContain("doc_catalog_overrides");
  });
});

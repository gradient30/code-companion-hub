import path from "node:path";

import * as ts from "typescript";
import { describe, expect, it } from "vitest";

const typesPath = path.resolve("src/integrations/supabase/types.ts");
const virtualSourcePath = path.resolve("__virtual__/doc-refresh-schema-check.ts");
const moduleSpecifier = "@generated/doc-refresh-types";

const sourceText = `
  import type { Database } from "${moduleSpecifier}";

  type AssertTrue<T extends true> = T;
  type AssertFalse<T extends false> = T;

  type Tables = Database["public"]["Tables"];
  type OverrideRow = Tables["doc_catalog_overrides"]["Row"];

  type _HasRuns = AssertTrue<"doc_refresh_runs" extends keyof Tables ? true : false>;
  type _HasDiffItems = AssertTrue<"doc_refresh_diff_items" extends keyof Tables ? true : false>;
  type _HasOverrides = AssertTrue<"doc_catalog_overrides" extends keyof Tables ? true : false>;
  type _HasPublishedIdentity = AssertTrue<"scope" extends keyof OverrideRow ? true : false>;
  type _NoUserId = AssertFalse<"user_id" extends keyof OverrideRow ? true : false>;
  type _HasSourceRun = AssertTrue<"source_run_id" extends keyof OverrideRow ? true : false>;
  type _HasAppliedBy = AssertTrue<"applied_by" extends keyof OverrideRow ? true : false>;
`;

function compileDocRefreshTypes() {
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    noEmit: true,
    strict: true,
    skipLibCheck: true,
    esModuleInterop: true,
  };

  const baseHost = ts.createCompilerHost(options, true);
  const virtualFiles = new Map([[path.normalize(virtualSourcePath), sourceText]]);

  const host: ts.CompilerHost = {
    ...baseHost,
    fileExists: (fileName) => virtualFiles.has(path.normalize(fileName)) || ts.sys.fileExists(fileName),
    readFile: (fileName) => virtualFiles.get(path.normalize(fileName)) ?? ts.sys.readFile(fileName),
    getSourceFile: (fileName, languageVersion) => {
      const text = virtualFiles.get(path.normalize(fileName)) ?? ts.sys.readFile(fileName);
      if (text == null) return undefined;
      return ts.createSourceFile(fileName, text, languageVersion, true);
    },
    resolveModuleNames: (moduleNames, containingFile) =>
      moduleNames.map((moduleName) => {
        if (moduleName === moduleSpecifier) {
          return {
            resolvedFileName: typesPath,
            extension: ts.Extension.Ts,
          };
        }

        return ts.resolveModuleName(moduleName, containingFile, options, baseHost).resolvedModule;
      }),
  };

  const program = ts.createProgram([virtualSourcePath], options, host);
  return ts.getPreEmitDiagnostics(program);
}

describe("doc refresh schema", () => {
  it("wires the new tables into Database and keeps doc_catalog_overrides published", () => {
    const diagnostics = compileDocRefreshTypes();
    const formatted = diagnostics.map((diag) => ts.flattenDiagnosticMessageText(diag.messageText, "\n"));

    expect(formatted).toEqual([]);
  });
});

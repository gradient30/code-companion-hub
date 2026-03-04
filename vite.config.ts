import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { componentTagger } from "lovable-tagger";

const envOrFallback = (value: string | undefined, fallback: string) =>
  value && value.trim().length > 0 ? value : fallback;

const envOrEmpty = (value: string | undefined): string =>
  value && value.trim().length > 0 ? value.trim() : "";

function inferSupabaseProjectId(url: string): string {
  const match = url.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co/i);
  return match?.[1] || "";
}

function readPackageVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(path.resolve(__dirname, "package.json"), "utf8")) as { version?: string };
    return pkg.version || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function resolveCommitSha(envSha?: string): string {
  if (envSha && envSha.trim()) {
    return envSha.trim().slice(0, 7);
  }

  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "dev";
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 显式加载 .env / .env.local，避免仅依赖 process.env 导致本地变量丢失
  const fileEnv = loadEnv(mode, process.cwd(), "");
  const mergedEnv = { ...fileEnv, ...process.env };

  const appVersionBase = envOrFallback(mergedEnv.VITE_APP_VERSION, readPackageVersion());
  const appBuildSha = resolveCommitSha(mergedEnv.VITE_COMMIT_SHA || mergedEnv.GITHUB_SHA);
  const appVersionDisplay = `v${appVersionBase}+${appBuildSha}`;
  const supabaseUrl = envOrEmpty(mergedEnv.VITE_SUPABASE_URL);
  const supabasePublishableKey = envOrEmpty(mergedEnv.VITE_SUPABASE_PUBLISHABLE_KEY);
  const supabaseProjectId =
    envOrEmpty(mergedEnv.VITE_SUPABASE_PROJECT_ID) || inferSupabaseProjectId(supabaseUrl);

  if (!supabaseUrl || !supabasePublishableKey) {
    console.warn(
      "[vite-config] Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. " +
      "Build output will not connect to Supabase until these env vars are provided.",
    );
  }

  return {
    // 动态 base：GitHub Pages 需要 /repo-name/，Cloudflare Pages 用 /
    base: mergedEnv.VITE_BASE_URL || "/",
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabasePublishableKey),
      "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(supabaseProjectId),
      "import.meta.env.VITE_APP_VERSION": JSON.stringify(appVersionBase),
      "import.meta.env.VITE_APP_BUILD": JSON.stringify(appBuildSha),
      "import.meta.env.VITE_APP_VERSION_DISPLAY": JSON.stringify(appVersionDisplay),
    },
    server: {
      host: "::",
      port: 8080,
      strictPort: true,
      hmr: {
        overlay: false,
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.96.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, message: "未授权" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, message: "认证失败" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { type } = body; // "provider" or "mcp_server"

    if (type === "provider") {
      const result = await testProvider(body);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "mcp_server") {
      const result = await testMcpServer(body);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false, message: "未知测试类型" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, message: err.message || "服务器错误" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function testProvider(body: {
  provider_type: string;
  base_url: string;
  api_key: string;
  app_type: string;
}): Promise<{ success: boolean; message: string; latency_ms?: number }> {
  const { provider_type, base_url, api_key, app_type } = body;
  const start = Date.now();

  // For official login type, no URL test needed
  if (provider_type === "official") {
    return { success: true, message: "官方登录类型无需连接测试", latency_ms: 0 };
  }

  if (!base_url) {
    return { success: false, message: "未配置 Base URL，无法测试连接" };
  }

  try {
    // Try to reach the base URL with a simple models endpoint or health check
    const testUrls = [
      `${base_url.replace(/\/$/, "")}/v1/models`,
      `${base_url.replace(/\/$/, "")}/models`,
      `${base_url.replace(/\/$/, "")}/health`,
      base_url,
    ];

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (api_key) {
      headers["Authorization"] = `Bearer ${api_key}`;
    }

    for (const url of testUrls) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const resp = await fetch(url, {
          method: "GET",
          headers,
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const latency = Date.now() - start;

        if (resp.status >= 200 && resp.status < 500) {
          // Consume body
          await resp.text();
          if (resp.status < 300) {
            return { success: true, message: `连接成功 (${url})`, latency_ms: latency };
          }
          if (resp.status === 401 || resp.status === 403) {
            return { success: false, message: `认证失败 (${resp.status})，请检查 API Key`, latency_ms: latency };
          }
          return { success: true, message: `服务可达 (HTTP ${resp.status})`, latency_ms: latency };
        }
        await resp.text();
      } catch {
        // Try next URL
      }
    }

    return { success: false, message: `无法连接到 ${base_url}，请检查地址是否正确`, latency_ms: Date.now() - start };
  } catch (err) {
    return { success: false, message: `连接失败: ${err.message}`, latency_ms: Date.now() - start };
  }
}

async function testMcpServer(body: {
  transport_type: string;
  command?: string;
  url?: string;
  args?: string[];
}): Promise<{ success: boolean; message: string; latency_ms?: number }> {
  const { transport_type, url } = body;
  const start = Date.now();

  if (transport_type === "stdio") {
    // stdio type runs locally, we can only validate config completeness
    if (!body.command) {
      return { success: false, message: "未配置 Command" };
    }
    return {
      success: true,
      message: `配置有效 (stdio: ${body.command} ${(body.args || []).join(" ")})。Stdio 类型需在本地验证运行`,
      latency_ms: 0,
    };
  }

  // For HTTP/SSE, test the URL
  if (!url) {
    return { success: false, message: "未配置 URL" };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const resp = await fetch(url, {
      method: transport_type === "sse" ? "GET" : "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      ...(transport_type !== "sse" ? { body: JSON.stringify({ jsonrpc: "2.0", method: "initialize", id: 1, params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "cc-switch-test", version: "1.0" } } }) } : {}),
    });
    clearTimeout(timeout);
    const latency = Date.now() - start;
    await resp.text();

    if (resp.status >= 200 && resp.status < 300) {
      return { success: true, message: `MCP 服务连接成功`, latency_ms: latency };
    }
    if (resp.status === 401 || resp.status === 403) {
      return { success: false, message: `认证失败 (${resp.status})`, latency_ms: latency };
    }
    return { success: true, message: `服务可达 (HTTP ${resp.status})`, latency_ms: latency };
  } catch (err) {
    const latency = Date.now() - start;
    if (err.name === "AbortError") {
      return { success: false, message: "连接超时 (10s)", latency_ms: latency };
    }
    return { success: false, message: `连接失败: ${err.message}`, latency_ms: latency };
  }
}

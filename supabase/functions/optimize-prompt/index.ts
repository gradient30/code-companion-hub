import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ========== Optimization Templates (based on prompt-optimizer) ==========

const TEMPLATES: Record<string, { system: string; userTemplate: string }> = {
  // System prompt optimization - General
  "optimize/general": {
    system: `你是一位专业的提示词工程专家。你的任务是优化用户提供的系统提示词（System Prompt），使其更加结构化、明确和高效。

优化原则：
1. 明确角色定义：清晰定义 AI 的角色、身份和专业领域
2. 结构化组织：使用清晰的层级结构（标题、列表、分隔符）
3. 约束与边界：明确 AI 应该做什么和不应该做什么
4. 输出格式：指定期望的输出格式和风格
5. 示例驱动：在适当时添加输入/输出示例
6. 保持原意：优化不等于重写，保留原始意图和核心需求
7. 适度原则：避免过度复杂化，保持简洁有效
8. 变量保留：保留原文中的占位符变量（如 {{variable}}）

直接输出优化后的完整提示词，不要添加解释或说明。`,
    userTemplate: `请优化以下系统提示词：

{{original_prompt}}`,
  },

  // System prompt optimization - Academic
  "optimize/academic": {
    system: `你是一位学术写作和严谨推理领域的提示词工程专家。你的任务是将用户提供的系统提示词优化为学术级别的高质量提示词。

优化原则：
1. 精确术语：使用准确、专业的术语描述
2. 逻辑严密：确保指令之间逻辑连贯，无矛盾
3. 分层结构：使用编号、缩进等学术文档常用格式
4. 引用与参考：在适当处提示 AI 提供来源或依据
5. 客观中立：避免主观偏见，鼓励多角度分析
6. 边界明确：清晰界定回答的范围和深度
7. 保持原意：优化不改变原始意图
8. 变量保留：保留原文中的占位符变量（如 {{variable}}）

直接输出优化后的完整提示词，不要添加解释或说明。`,
    userTemplate: `请以学术严谨的风格优化以下系统提示词：

{{original_prompt}}`,
  },

  // System prompt optimization - Creative
  "optimize/creative": {
    system: `你是一位创意写作和开放式对话的提示词工程专家。你的任务是将用户提供的系统提示词优化为更具创造力和表现力的版本。

优化原则：
1. 激发创意：使用富有想象力的语言和隐喻
2. 开放空间：为 AI 留出足够的创作自由度
3. 情感共鸣：融入情感元素和个性化表达
4. 场景构建：创建丰富的上下文和场景描述
5. 灵活格式：鼓励多样化的输出形式
6. 保持核心：创意不偏离原始目标
7. 趣味性：使提示词本身就具有吸引力
8. 变量保留：保留原文中的占位符变量（如 {{variable}}）

直接输出优化后的完整提示词，不要添加解释或说明。`,
    userTemplate: `请以创意、开放的风格优化以下系统提示词：

{{original_prompt}}`,
  },

  // User prompt optimization
  "user-optimize/general": {
    system: `你是一位专业的用户提示词优化专家。你的任务是优化用户输入给 AI 的对话提示词（User Prompt），使其意图更清晰、信息更完整、表达更有效。

优化原则：
1. 意图澄清：明确用户真正想要达成的目标
2. 上下文补充：添加必要的背景信息和约束条件
3. 具体化：将模糊的描述转化为具体、可操作的指令
4. 结构优化：如果内容复杂，使用分点或分步描述
5. 去除歧义：消除可能导致误解的表述
6. 保持自然：优化后仍保持自然的对话语气
7. 适度原则：不过度添加不必要的细节
8. 变量保留：保留原文中的占位符变量（如 {{variable}}）

直接输出优化后的完整提示词，不要添加解释或说明。`,
    userTemplate: `请优化以下用户提示词：

{{original_prompt}}`,
  },

  // Iterate/refine
  "iterate/refine": {
    system: `你是一位提示词迭代优化专家。你的任务是根据用户的反馈意见，对已优化的提示词进行定向改进。

迭代原则：
1. 精确响应：只修改用户反馈中提到的问题
2. 保留优点：不破坏之前优化中已经好的部分
3. 增量改进：每次迭代聚焦于特定方面的提升
4. 反馈整合：将用户的改进方向自然融入提示词
5. 一致性：确保修改后的整体风格和逻辑一致
6. 变量保留：保留原文中的占位符变量（如 {{variable}}）

直接输出迭代改进后的完整提示词，不要添加解释或说明。`,
    userTemplate: `当前提示词：
{{optimized_prompt}}

用户反馈和改进方向：
{{feedback}}

请根据以上反馈对提示词进行定向改进。`,
  },

  // Evaluate/analyze
  "evaluate/analyze": {
    system: `你是一位提示词质量评估专家。你的任务是对提示词进行全面分析和评分。

请按以下维度进行评估（每项 1-10 分）：
1. **清晰度**：指令是否明确、无歧义
2. **完整性**：是否包含所有必要信息和约束
3. **结构性**：是否有良好的组织结构
4. **有效性**：是否能有效引导 AI 产出期望结果
5. **简洁性**：是否做到了言简意赅，没有冗余

请输出以下格式的评估报告：

## 提示词评估报告

### 总分：X/50

### 各维度评分
- 清晰度：X/10
- 完整性：X/10
- 结构性：X/10
- 有效性：X/10
- 简洁性：X/10

### 优点
- ...

### 改进建议
1. ...
2. ...
3. ...

### 优化方向
...`,
    userTemplate: `请评估以下提示词：

{{original_prompt}}`,
  },
};

function buildMessages(
  templateId: string,
  params: {
    original_prompt?: string;
    optimized_prompt?: string;
    feedback?: string;
  }
): { role: string; content: string }[] {
  const template = TEMPLATES[templateId];
  if (!template) throw new Error(`Unknown template: ${templateId}`);

  let userContent = template.userTemplate;
  if (params.original_prompt)
    userContent = userContent.replace("{{original_prompt}}", params.original_prompt);
  if (params.optimized_prompt)
    userContent = userContent.replace("{{optimized_prompt}}", params.optimized_prompt);
  if (params.feedback)
    userContent = userContent.replace("{{feedback}}", params.feedback);

  return [
    { role: "system", content: template.system },
    { role: "user", content: userContent },
  ];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    const { action, prompt, optimizedPrompt, template, mode, feedback } = await req.json();

    if (!action || !prompt) {
      return new Response(JSON.stringify({ error: "Missing required fields: action, prompt" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine template ID based on action and mode
    let templateId: string;
    if (action === "evaluate") {
      templateId = "evaluate/analyze";
    } else if (action === "iterate") {
      templateId = "iterate/refine";
    } else {
      // optimize
      if (mode === "user") {
        templateId = "user-optimize/general";
      } else {
        templateId = `optimize/${template || "general"}`;
      }
    }

    if (!TEMPLATES[templateId]) {
      return new Response(JSON.stringify({ error: `Unknown template: ${templateId}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const messages = buildMessages(templateId, {
      original_prompt: prompt,
      optimized_prompt: optimizedPrompt,
      feedback,
    });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "请求过于频繁，请稍后再试" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI 额度不足，请充值" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const resultContent = aiData.choices?.[0]?.message?.content || "";

    // Parse result
    const isEvaluate = action === "evaluate";
    const result = isEvaluate ? "" : resultContent;
    const analysis = isEvaluate ? resultContent : undefined;

    // Save to history
    await supabase.from("prompt_optimize_history").insert({
      user_id: userId,
      original_prompt: prompt,
      optimized_prompt: result || prompt,
      template: templateId,
      mode: mode || "system",
      action,
      feedback: feedback || null,
      analysis: analysis || null,
    });

    return new Response(
      JSON.stringify({ result: result || resultContent, analysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("optimize-prompt error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * WEALTHOVERS V2: Provider-Independent Cloud AI Gateway
 * Phase 5: Multi-Provider LLM Router with Local Fallback Engine
 *
 * Supported Providers:
 * - Google Gemini (Primary / Default)
 * - Anthropic Claude (Secondary)
 * - OpenAI GPT-4o (Tertiary)
 * - Local Deterministic Financial Rule Engine (Offline / Zero-Config Fallback)
 */

import { sanitizeFinancialPrompt } from "./sanitizer";

export type LLMProvider = "gemini" | "claude" | "openai" | "local_fallback";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIGatewayOptions {
  model?: string;
  provider?: LLMProvider;
  temperature?: number;
  maxTokens?: number;
  financialContext?: Record<string, any>;
}

export interface AIGatewayResponse {
  provider: LLMProvider;
  model: string;
  content: string;
  structuredData?: Record<string, any>;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

/**
 * Determine active provider based on environment variables
 */
export function resolveActiveProvider(preferred?: LLMProvider): LLMProvider {
  if (preferred && preferred !== "local_fallback") {
    if (preferred === "gemini" && (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY)) {
      return "gemini";
    }
    if (preferred === "claude" && process.env.ANTHROPIC_API_KEY) {
      return "claude";
    }
    if (preferred === "openai" && process.env.OPENAI_API_KEY) {
      return "openai";
    }
  }

  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY) {
    return "gemini";
  }
  if (process.env.OPENAI_API_KEY) {
    return "openai";
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return "claude";
  }

  return "local_fallback";
}

/**
 * Dispatch chat request to the resolved LLM provider
 */
export async function sendChatMessage(
  messages: ChatMessage[],
  options: AIGatewayOptions = {}
): Promise<AIGatewayResponse> {
  const provider = resolveActiveProvider(options.provider);

  // Sanitize all user and assistant prompts for sensitive personal info
  const sanitizedMessages: ChatMessage[] = messages.map((m) => ({
    role: m.role,
    content: sanitizeFinancialPrompt(m.content),
  }));

  // Append financial context if provided
  if (options.financialContext) {
    const contextSnippet = `\n[VERIFIED USER FINANCIAL CONTEXT]:\n${JSON.stringify(
      options.financialContext,
      null,
      2
    )}\n(Base all numerical answers strictly on this real data. Format numbers in INR with Indian numbering system. Tabular format preferred.)`;

    const lastIdx = sanitizedMessages.length - 1;
    if (lastIdx >= 0) {
      sanitizedMessages[lastIdx].content += contextSnippet;
    }
  }

  try {
    switch (provider) {
      case "gemini":
        return await callGemini(sanitizedMessages, options);
      case "openai":
        return await callOpenAI(sanitizedMessages, options);
      case "claude":
        return await callClaude(sanitizedMessages, options);
      case "local_fallback":
      default:
        return callLocalFallbackEngine(sanitizedMessages, options);
    }
  } catch (error) {
    console.warn(`[AI Gateway] ${provider} call failed. Falling back to Local Rule Engine:`, error);
    return callLocalFallbackEngine(sanitizedMessages, options);
  }
}

/**
 * Google Gemini Provider Call
 */
async function callGemini(
  messages: ChatMessage[],
  options: AIGatewayOptions
): Promise<AIGatewayResponse> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  const model = options.model || "gemini-1.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const systemInstructionMsg = messages.find((m) => m.role === "system");
  const payload: any = {
    contents,
    generationConfig: {
      temperature: options.temperature ?? 0.2,
      maxOutputTokens: options.maxTokens ?? 1500,
    },
  };

  if (systemInstructionMsg) {
    payload.systemInstruction = {
      parts: [{ text: systemInstructionMsg.content }],
    };
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }

  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";

  return {
    provider: "gemini",
    model,
    content: text,
    usage: {
      promptTokens: json.usageMetadata?.promptTokenCount,
      completionTokens: json.usageMetadata?.candidatesTokenCount,
      totalTokens: json.usageMetadata?.totalTokenCount,
    },
  };
}

/**
 * OpenAI Provider Call
 */
async function callOpenAI(
  messages: ChatMessage[],
  options: AIGatewayOptions
): Promise<AIGatewayResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = options.model || "gpt-4o";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 1500,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${errText}`);
  }

  const json = await res.json();
  return {
    provider: "openai",
    model,
    content: json.choices?.[0]?.message?.content || "No response generated.",
    usage: {
      promptTokens: json.usage?.prompt_tokens,
      completionTokens: json.usage?.completion_tokens,
      totalTokens: json.usage?.total_tokens,
    },
  };
}

/**
 * Anthropic Claude Provider Call
 */
async function callClaude(
  messages: ChatMessage[],
  options: AIGatewayOptions
): Promise<AIGatewayResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = options.model || "claude-3-5-sonnet-20241022";

  const systemMsg = messages.find((m) => m.role === "system");
  const nonSystemMsgs = messages.filter((m) => m.role !== "system");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      system: systemMsg?.content,
      messages: nonSystemMsgs.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      max_tokens: options.maxTokens ?? 1500,
      temperature: options.temperature ?? 0.2,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API error (${res.status}): ${errText}`);
  }

  const json = await res.json();
  const text = json.content?.[0]?.text || "No response generated.";

  return {
    provider: "claude",
    model,
    content: text,
    usage: {
      promptTokens: json.usage?.input_tokens,
      completionTokens: json.usage?.output_tokens,
    },
  };
}

/**
 * Local Deterministic Rule-Based Financial Reasoning Engine
 * Used when no cloud API keys are provisioned or during network outages.
 */
function callLocalFallbackEngine(
  messages: ChatMessage[],
  options: AIGatewayOptions
): AIGatewayResponse {
  const lastMsg = messages[messages.length - 1]?.content.toLowerCase() || "";
  const ctx = options.financialContext || {};

  let reply = "";

  if (lastMsg.includes("net worth") || lastMsg.includes("wealth") || lastMsg.includes("assets")) {
    const nw = ctx.netWorthSummary;
    if (nw) {
      reply = `### WealthOvers Terminal Net Worth Summary\n\n` +
        `| Asset Category | Valuation (INR) |\n` +
        `| :--- | :--- |\n` +
        `| **Cash & Bank Balances** | ₹${nw.breakdown.cashAndBank.toLocaleString("en-IN")} |\n` +
        `| **Investments Portfolio** | ₹${nw.breakdown.investments.toLocaleString("en-IN")} |\n` +
        `| **Fixed Assets** | ₹${nw.breakdown.fixedAssets.toLocaleString("en-IN")} |\n` +
        `| **Total Assets** | **₹${nw.totalAssets.toLocaleString("en-IN")}** |\n\n` +
        `| Liability Category | Outstanding (INR) |\n` +
        `| :--- | :--- |\n` +
        `| **Credit Cards** | ₹${nw.breakdown.creditCards.toLocaleString("en-IN")} |\n` +
        `| **Active Loans** | ₹${nw.breakdown.loans.toLocaleString("en-IN")} |\n` +
        `| **External Liabilities** | ₹${nw.breakdown.externalLiabilities.toLocaleString("en-IN")} |\n` +
        `| **Total Liabilities** | **₹${nw.totalLiabilities.toLocaleString("en-IN")}** |\n\n` +
        `**Net Worth: ₹${nw.netWorth.toLocaleString("en-IN")}** (Liquid: ₹${nw.liquidNetWorth.toLocaleString("en-IN")})\n\n` +
        `*Source: Real-time WealthOvers Ledger (Verified).*`;
    } else {
      reply = "Your verified net worth telemetry shows your financial balance sheet is balanced across accounts and investments.";
    }
  } else if (lastMsg.includes("spend") || lastMsg.includes("expense") || lastMsg.includes("budget")) {
    const sp = ctx.spendingBreakdown;
    if (sp && sp.categories.length > 0) {
      reply = `### Spending Breakdown (${sp.periodDays} Days)\n\n` +
        `**Total Discretionary & Fixed Outflow:** ₹${sp.totalExpenses.toLocaleString("en-IN")}\n` +
        `**Top Spending Category:** ${sp.topExpenseCategory}\n\n` +
        `| Category | Outflow | % of Total | Transactions |\n` +
        `| :--- | :--- | :--- | :--- |\n` +
        sp.categories
          .map(
            (c: any) =>
              `| ${c.category} | ₹${c.totalAmount.toLocaleString("en-IN")} | ${c.percentage}% | ${c.transactionCount} |`
          )
          .join("\n") +
        `\n\n*Observation:* Focus on moderating expenses in \`${sp.topExpenseCategory}\` to optimize your monthly savings rate.`;
    } else {
      reply = "No significant expenses were recorded in the analyzed period. Your savings rate remains stable.";
    }
  } else if (lastMsg.includes("loan") || lastMsg.includes("prepay") || lastMsg.includes("emi")) {
    const lSim = ctx.loanSimulation;
    if (lSim) {
      reply = `### Loan Prepayment Simulation: ${lSim.lenderName}\n\n` +
        `| Parameter | Baseline | Revised (+₹${lSim.extraMonthlyPayment.toLocaleString("en-IN")}/mo) |\n` +
        `| :--- | :--- | :--- |\n` +
        `| **Monthly EMI** | ₹${lSim.currentEmi.toLocaleString("en-IN")} | ₹${(lSim.currentEmi + lSim.extraMonthlyPayment).toLocaleString("en-IN")} |\n` +
        `| **Tenure** | ${lSim.tenureMonths} mos | ${lSim.revisedTenureMonths} mos |\n` +
        `| **Total Interest** | ₹${lSim.totalInterestOriginal.toLocaleString("en-IN")} | ₹${lSim.totalInterestRevised.toLocaleString("en-IN")} |\n` +
        `| **Net Interest Saved** | — | **₹${lSim.interestSaved.toLocaleString("en-IN")}** |\n` +
        `| **Time Saved** | — | **${lSim.monthsSaved} months earlier** |\n\n` +
        `*Financial Insight:* Prepaying an extra ₹${lSim.extraMonthlyPayment.toLocaleString("en-IN")} per month saves you ₹${lSim.interestSaved.toLocaleString("en-IN")} in cumulative compounding interest.`;
    } else {
      reply = "To simulate loan prepayment, specify the loan and extra monthly amount (e.g., 'Simulate prepaying ₹5,000 on my home loan').";
    }
  } else if (lastMsg.includes("portfolio") || lastMsg.includes("stock") || lastMsg.includes("mutual fund") || lastMsg.includes("invest")) {
    const pf = ctx.portfolioBreakdown;
    if (pf && pf.byAssetType.length > 0) {
      reply = `### Investment Portfolio Analysis\n\n` +
        `**Total Invested:** ₹${pf.totalInvested.toLocaleString("en-IN")}\n` +
        `**Current Valuation:** ₹${pf.currentValuation.toLocaleString("en-IN")}\n` +
        `**Unrealized Gain/Loss:** ${pf.unrealizedPnL >= 0 ? "+" : ""}₹${pf.unrealizedPnL.toLocaleString("en-IN")} (${pf.unrealizedPnLPercentage.toFixed(2)}%)\n\n` +
        `| Asset Class | Invested | Current Value | Allocation | P&L |\n` +
        `| :--- | :--- | :--- | :--- | :--- |\n` +
        pf.byAssetType
          .map(
            (a: any) =>
              `| ${a.assetType.toUpperCase()} | ₹${a.totalInvested.toLocaleString("en-IN")} | ₹${a.currentValuation.toLocaleString("en-IN")} | ${a.allocationPercentage}% | ${a.pnl >= 0 ? "+" : ""}₹${a.pnl.toLocaleString("en-IN")} |`
          )
          .join("\n");
    } else {
      reply = "Your investment portfolio does not have active holdings recorded yet. Add Indian/US stocks or mutual funds under the Investments module.";
    }
  } else {
    reply = `### WealthOvers Financial Intelligence Terminal\n\n` +
      `I am ready to analyze your financial telemetry. You can ask me to:\n` +
      `- **Break down your spending** over the last 30 or 90 days\n` +
      `- **Compute your net worth** and liquid wealth balance\n` +
      `- **Analyze your investment portfolio** across asset classes\n` +
      `- **Simulate loan prepayment** to calculate interest and months saved\n` +
      `- **Forecast 6-month cash flow** based on recurring commitments and spending\n\n` +
      `*Notice: WealthOvers provides automated financial analysis and metrics; this is not SEBI-registered investment advice.*`;
  }

  return {
    provider: "local_fallback",
    model: "wealthovers-deterministic-v2",
    content: reply,
    usage: {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    },
  };
}


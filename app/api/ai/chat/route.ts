/**
 * WEALTHOVERS V2: AI Assistant Chat API Route
 * POST /api/ai/chat
 * GET /api/ai/chat?conversationId=...
 *
 * Scoped to authenticated user session with real-time financial tool augmentation.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { sendChatMessage, ChatMessage } from "@/lib/ai/gateway";
import {
  getSpendingBreakdown,
  getNetWorthSummary,
  getPortfolioBreakdown,
  simulateLoanPrepayment,
  forecastCashFlow,
} from "@/lib/ai/tools";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");

    const supabase = await createClient();

    if (conversationId) {
      const { data: messages, error } = await supabase
        .from("ai_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ messages });
    }

    // Otherwise list user conversations
    const { data: conversations, error } = await supabase
      .from("ai_conversations")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ conversations });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.message) {
      return NextResponse.json(
        { error: "Missing required 'message' field" },
        { status: 400 }
      );
    }

    const userMessage: string = body.message.trim();
    let conversationId: string | undefined = body.conversationId;
    const preferredProvider = body.provider;
    const requestedModel = body.model;

    const supabase = await createClient();

    // 1. Ensure conversation exists
    if (!conversationId) {
      // Derive a short title from user message
      const title =
        userMessage.slice(0, 40) + (userMessage.length > 40 ? "..." : "");
      const { data: conv, error: convErr } = await supabase
        .from("ai_conversations")
        .insert({
          user_id: user.id,
          title,
          model: requestedModel || "gemini-1.5-flash",
        })
        .select("id")
        .single();

      if (convErr || !conv) {
        return NextResponse.json(
          { error: "Failed to initialize conversation session" },
          { status: 500 }
        );
      }
      conversationId = conv.id;
    }

    // 2. Persist user message
    await supabase.from("ai_messages").insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: "user",
      content: userMessage,
    });

    // 3. Load conversation history
    const { data: history } = await supabase
      .from("ai_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(10);

    // 4. Autonomous tool intent detection & execution
    const lower = userMessage.toLowerCase();
    const financialContext: Record<string, any> = {};

    // Execute relevant tools based on query semantics
    if (lower.includes("net worth") || lower.includes("wealth") || lower.includes("balance sheet") || lower.includes("asset")) {
      financialContext.netWorthSummary = await getNetWorthSummary(supabase, user.id);
    }

    if (lower.includes("spend") || lower.includes("expense") || lower.includes("outflow") || lower.includes("budget") || lower.includes("category")) {
      financialContext.spendingBreakdown = await getSpendingBreakdown(supabase, user.id, 30);
    }

    if (lower.includes("portfolio") || lower.includes("invest") || lower.includes("stock") || lower.includes("mutual fund") || lower.includes("pnl")) {
      financialContext.portfolioBreakdown = await getPortfolioBreakdown(supabase, user.id);
    }

    if (lower.includes("loan") || lower.includes("prepay") || lower.includes("emi")) {
      // Find the first active loan if not explicitly specified
      const { data: userLoans } = await supabase
        .from("loans")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      if (userLoans && userLoans.length > 0) {
        // Extract extra payment amount if mentioned, else default 5000
        const extraMatch = lower.match(/(?:extra|prepay|additional)\s*(?:₹|rs\.?|inr)?\s*(\d+[\d,]*)/i);
        const extraAmt = extraMatch ? parseFloat(extraMatch[1].replace(/,/g, "")) : 5000;
        financialContext.loanSimulation = await simulateLoanPrepayment(
          supabase,
          user.id,
          userLoans[0].id,
          extraAmt
        );
      }
    }

    if (lower.includes("forecast") || lower.includes("cash flow") || lower.includes("runway") || lower.includes("future")) {
      financialContext.cashFlowForecast = await forecastCashFlow(supabase, user.id, 6);
    }

    // If query was generic, provide base net worth snapshot as context
    if (Object.keys(financialContext).length === 0) {
      financialContext.netWorthSummary = await getNetWorthSummary(supabase, user.id);
    }

    // 5. Construct chat prompt with system instruction
    const systemPrompt: ChatMessage = {
      role: "system",
      content:
        `You are the WealthOvers V2 Financial Intelligence Terminal Assistant. ` +
        `Your design inspiration is a Bloomberg Terminal for personal wealth. ` +
        `Rules:\n` +
        `1. Ground all answers strictly in the verified real financial context provided. Never invent transactions or balances.\n` +
        `2. Always use INR (₹) with Indian number formatting (e.g. ₹1,25,000).\n` +
        `3. Present complex financial metrics using compact markdown tables and bullet points.\n` +
        `4. Never execute or suggest arbitrary SQL or unauthorized modifications.\n` +
        `5. Financial disclaimer: Remind user when appropriate that automated analysis is for informational purposes and not SEBI-registered advisory.`,
    };

    const chatHistory: ChatMessage[] = (history || []).map((h) => ({
      role: h.role as any,
      content: h.content,
    }));

    const response = await sendChatMessage([systemPrompt, ...chatHistory], {
      provider: preferredProvider,
      model: requestedModel,
      financialContext,
    });

    // 6. Persist assistant reply
    await supabase.from("ai_messages").insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: "assistant",
      content: response.content,
      tool_calls: Object.keys(financialContext).length > 0 ? Object.keys(financialContext) : null,
      tool_results: Object.keys(financialContext).length > 0 ? financialContext : null,
    });

    // Update conversation timestamp
    await supabase
      .from("ai_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    return NextResponse.json({
      success: true,
      conversationId,
      provider: response.provider,
      model: response.model,
      message: response.content,
      financialContext,
    });
  } catch (err: any) {
    console.error("[AI Chat Route Error]:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process chat message" },
      { status: 500 }
    );
  }
}


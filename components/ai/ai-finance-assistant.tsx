"use client";

import * as React from "react";
import {
  Send,
  Sparkles,
  Bot,
  User,
  ShieldCheck,
  RotateCcw,
  Cpu,
  Layers,
  ArrowRight,
  TrendingUp,
  Percent,
  Wallet,
  Activity,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  provider?: string;
  model?: string;
  sources?: string[];
}

const QUICK_PROMPTS = [
  {
    label: "Net Worth Breakdown",
    prompt: "Show me a complete net worth summary including cash, investments, assets, and liabilities.",
    icon: Wallet,
  },
  {
    label: "Spending Breakdown (30D)",
    prompt: "What is my spending breakdown by category over the last 30 days?",
    icon: Activity,
  },
  {
    label: "Portfolio Health",
    prompt: "Analyze my investment portfolio performance and asset class allocation.",
    icon: TrendingUp,
  },
  {
    label: "Loan Prepayment (₹5k Extra)",
    prompt: "Simulate prepaying an extra ₹5,000 per month on my active loan. How much interest and time do I save?",
    icon: Percent,
  },
  {
    label: "6-Month Cash Flow",
    prompt: "Forecast my cash flow over the next 6 months based on average income and recurring commitments.",
    icon: Layers,
  },
];

export function AIFinanceAssistant() {
  const [messages, setMessages] = React.useState<Message[]>([
    {
      id: "initial-system",
      role: "assistant",
      content:
        `### WealthOvers Terminal Intelligence v2.0\n\n` +
        `Ready for financial telemetry queries. Verified access to your real-time ledger, investment valuation, and liability amortization tables.\n\n` +
        `Select a quick query below or type any custom analysis inquiry.`,
      createdAt: new Date().toISOString(),
      provider: "Local Engine",
      model: "deterministic-v2",
      sources: ["Ledger Engine", "Zero-Trust Sandbox"],
    },
  ]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = React.useState<string>("gemini");
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    setInput("");

    const userMsg: Message = {
      id: "user-" + Date.now(),
      role: "user",
      content: query,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          conversationId: conversationId || undefined,
          provider: selectedProvider === "local" ? "local_fallback" : selectedProvider,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to communicate with AI service");
      }

      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }

      const sources: string[] = ["Verified User Ledger"];
      if (data.financialContext?.netWorthSummary) sources.push("Net Worth Engine");
      if (data.financialContext?.spendingBreakdown) sources.push("Expense Aggregator");
      if (data.financialContext?.portfolioBreakdown) sources.push("Portfolio Valuation");
      if (data.financialContext?.loanSimulation) sources.push("Amortization Simulator");
      if (data.financialContext?.cashFlowForecast) sources.push("Cash Flow Forecaster");

      const assistantMsg: Message = {
        id: "ai-" + Date.now(),
        role: "assistant",
        content: data.message,
        createdAt: new Date().toISOString(),
        provider: data.provider?.toUpperCase() || "AI TERMINAL",
        model: data.model,
        sources,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: "err-" + Date.now(),
        role: "assistant",
        content: `**Telemetry Error:** ${err.message || "Unable to reach intelligence server. Please check connection."}`,
        createdAt: new Date().toISOString(),
        provider: "SYSTEM",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    setConversationId(null);
    setMessages([
      {
        id: "initial-system-" + Date.now(),
        role: "assistant",
        content: "### WealthOvers Terminal Intelligence Reset\nSession cleared. All financial telemetry tools online.",
        createdAt: new Date().toISOString(),
        provider: "Local Engine",
        sources: ["Ledger Engine"],
      },
    ]);
  };

  // Basic markdown-to-HTML parser for tables, headers, bold, and bullet points
  const formatMarkdown = (md: string) => {
    // Split into lines
    const lines = md.split("\n");
    const elements: React.ReactNode[] = [];
    let inTable = false;
    let tableRows: string[][] = [];
    let tableHeader: string[] = [];

    const flushTable = (key: string) => {
      if (tableHeader.length > 0) {
        elements.push(
          <div key={key} className="overflow-x-auto my-3 border border-border/50 rounded-lg">
            <table className="w-full text-xs font-mono text-left">
              <thead className="bg-surface-elevated text-text-secondary uppercase border-b border-border">
                <tr>
                  {tableHeader.map((th, i) => (
                    <th key={i} className="px-3 py-2 font-semibold">
                      {th.replace(/\*\*/g, "").trim()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 bg-surface/50">
                {tableRows.map((tr, rIdx) => (
                  <tr key={rIdx} className="hover:bg-surface-elevated/40">
                    {tr.map((td, cIdx) => (
                      <td key={cIdx} className="px-3 py-2 tabular-nums">
                        {td.replace(/\*\*/g, "").trim()}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      inTable = false;
      tableHeader = [];
      tableRows = [];
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      // Table line
      if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        const cols = trimmed
          .slice(1, -1)
          .split("|")
          .map((c) => c.trim());

        // Check if delimiter row
        if (cols.every((c) => /^:?-+:?$/.test(c))) {
          // ignore separator row
          return;
        }

        if (!inTable) {
          inTable = true;
          tableHeader = cols;
        } else {
          tableRows.push(cols);
        }
        return;
      } else if (inTable) {
        flushTable(`tbl-${idx}`);
      }

      if (trimmed.startsWith("### ")) {
        elements.push(
          <h4 key={idx} className="text-sm font-semibold tracking-wide text-terminalAccent mt-3 mb-1 uppercase font-mono">
            {trimmed.replace("### ", "")}
          </h4>
        );
      } else if (trimmed.startsWith("## ")) {
        elements.push(
          <h3 key={idx} className="text-base font-bold text-text-primary mt-4 mb-2 font-mono">
            {trimmed.replace("## ", "")}
          </h3>
        );
      } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        elements.push(
          <li key={idx} className="ml-4 list-disc text-xs text-text-secondary my-0.5 leading-relaxed">
            <span dangerouslySetInnerHTML={{ __html: parseInline(trimmed.slice(2)) }} />
          </li>
        );
      } else if (trimmed === "") {
        elements.push(<div key={idx} className="h-1.5" />);
      } else {
        elements.push(
          <p key={idx} className="text-xs text-text-secondary leading-relaxed">
            <span dangerouslySetInnerHTML={{ __html: parseInline(trimmed) }} />
          </p>
        );
      }
    });

    if (inTable) {
      flushTable("tbl-end");
    }

    return elements;
  };

  const parseInline = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-text-primary font-semibold">$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="bg-surface-elevated px-1 py-0.5 rounded text-[11px] font-mono text-terminalAccent">$1</code>')
      .replace(/\*(.*?)\*/g, '<em class="text-text-secondary/80 text-[11px]">$1</em>');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] max-w-6xl mx-auto space-y-3">
      {/* Bloomberg-Style Terminal Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-surface border border-border rounded-xl">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-terminalAccent/10 text-terminalAccent border border-terminalAccent/30">
            <Terminal className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold tracking-wider text-text-primary uppercase">
                WOV-TERMINAL // FINANCIAL INTELLIGENCE
              </span>
              <Badge variant="outline" className="text-[10px] font-mono py-0 h-4 border-positive text-positive bg-positive/10">
                LIVE TELEMETRY
              </Badge>
            </div>
            <p className="text-[11px] text-text-secondary font-mono">
              CURRENCY: INR (₹) • TZ: ASIA/KOLKATA • ZERO-TRUST READ-ONLY SANDBOX
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Provider Selector */}
          <Select value={selectedProvider} onValueChange={setSelectedProvider}>
            <SelectTrigger className="h-8 text-xs font-mono bg-surface-elevated border-border w-36">
              <SelectValue placeholder="Provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gemini" className="text-xs font-mono">Google Gemini</SelectItem>
              <SelectItem value="claude" className="text-xs font-mono">Anthropic Claude</SelectItem>
              <SelectItem value="openai" className="text-xs font-mono">OpenAI GPT-4o</SelectItem>
              <SelectItem value="local" className="text-xs font-mono">Local Rule Engine</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="h-8 text-xs font-mono border-border hover:bg-surface-elevated"
            title="Reset Terminal Conversation"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Reset
          </Button>
        </div>
      </div>

      {/* Quick Prompts Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {QUICK_PROMPTS.map((qp, i) => {
          const Icon = qp.icon;
          return (
            <button
              key={i}
              onClick={() => handleSend(qp.prompt)}
              disabled={loading}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border/80 hover:border-terminalAccent/50 hover:bg-surface-elevated transition-colors text-left flex-shrink-0 text-xs font-mono text-text-secondary hover:text-text-primary"
            >
              <Icon className="h-3.5 w-3.5 text-terminalAccent" />
              <span>{qp.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Terminal Message Stream */}
      <Card className="flex-1 bg-surface border-border flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-xl p-4 border transition-all ${
                  msg.role === "user"
                    ? "bg-surface-elevated border-terminalAccent/40 text-text-primary"
                    : "bg-surface-muted/90 border-border text-text-primary"
                }`}
              >
                {/* Message Header Bar */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/40 text-[10px] font-mono text-text-secondary">
                  <div className="flex items-center space-x-1.5">
                    {msg.role === "user" ? (
                      <>
                        <User className="h-3 w-3 text-terminalAccent" />
                        <span className="font-semibold text-terminalAccent">USER OPERATOR</span>
                      </>
                    ) : (
                      <>
                        <Bot className="h-3 w-3 text-positive" />
                        <span className="font-semibold text-positive">
                          {msg.provider || "TERMINAL"} {msg.model ? `[${msg.model}]` : ""}
                        </span>
                      </>
                    )}
                  </div>
                  <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>

                {/* Message Content with Markdown Parsing */}
                <div className="space-y-1">
                  {formatMarkdown(msg.content)}
                </div>

                {/* Source Verification Badges */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-border/30 flex flex-wrap items-center gap-1.5">
                    <ShieldCheck className="h-3 w-3 text-positive" />
                    <span className="text-[10px] font-mono text-text-secondary mr-1">DATA VERIFICATION:</span>
                    {msg.sources.map((src, sIdx) => (
                      <span
                        key={sIdx}
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-surface border border-border/60 text-text-secondary"
                      >
                        {src}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-start">
              <div className="bg-surface-muted border border-border rounded-xl p-4 max-w-sm flex items-center space-x-3">
                <Cpu className="h-4 w-4 animate-spin text-terminalAccent" />
                <span className="text-xs font-mono text-text-secondary animate-pulse">
                  Querying verified ledger telemetry & running financial models...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-surface-elevated/70 border-t border-border flex items-end space-x-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your net worth, expenses, investments, loans or cash flow... (Enter to send)"
            rows={1}
            disabled={loading}
            className="min-h-[44px] max-h-32 text-xs font-mono bg-surface border-border resize-none focus-visible:ring-1 focus-visible:ring-terminalAccent"
          />
          <Button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="h-[44px] px-4 bg-terminalAccent hover:bg-terminalAccent/90 text-app-bg font-semibold font-mono text-xs flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}


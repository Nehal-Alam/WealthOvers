import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { AIFinanceAssistant } from "@/components/ai/ai-finance-assistant";

export const metadata: Metadata = {
  title: "AI Finance Assistant — WealthOvers Terminal",
  description:
    "Bloomberg-inspired cloud AI finance assistant with read-only ledger telemetry and predictive financial analytics.",
};

export default async function AIAssistantPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto px-4 py-3">
      <AIFinanceAssistant />
    </div>
  );
}


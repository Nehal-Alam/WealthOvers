import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Tables } from "@/types/database";
import { InvestmentPortfolioView } from "@/components/investments/investment-portfolio-view";

export const metadata: Metadata = {
  title: "Investment Portfolio — WealthOvers",
  description: "Track Indian stocks, US equities, mutual funds, gold, and fixed deposits",
};

export default async function InvestmentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch investments
  const { data: investmentsData } = await supabase
    .from("investments")
    .select("*")
    .eq("user_id", user.id)
    .order("current_valuation", { ascending: false });

  // Fetch accounts
  const { data: accountsData } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  const investments = (investmentsData || []) as Tables<"investments">[];
  const accounts = (accountsData || []) as Tables<"accounts">[];

  return (
    <div className="space-y-6">
      <InvestmentPortfolioView investments={investments} accounts={accounts} />
    </div>
  );
}


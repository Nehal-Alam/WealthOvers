import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { Tables } from "@/types/database";
import { InvestmentPortfolioView } from "@/components/investments/investment-portfolio-view";

export const metadata: Metadata = {
  title: "Investment Portfolio — WealthOvers",
  description: "Track Indian stocks, US equities, mutual funds, gold, and fixed deposits",
};

export default async function InvestmentsPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();

  // Parallelize investments and accounts queries with explicit column projections
  const [investmentsResult, accountsResult] = await Promise.all([
    supabase
      .from("investments")
      .select("id, user_id, account_id, name, symbol, asset_type, broker_name, total_quantity, average_buy_price, total_invested_amount, current_nav_or_price, current_valuation, currency, notes, last_price_update_at, created_at, updated_at")
      .eq("user_id", user.id)
      .order("current_valuation", { ascending: false }),

    supabase
      .from("accounts")
      .select("id, user_id, name, color, icon, account_type, initial_balance, current_balance, currency, institution_name, account_number_masked, is_archived, is_active, created_at, updated_at")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
  ]);

  const investments = (investmentsResult.data || []) as Tables<"investments">[];
  const accounts = (accountsResult.data || []) as Tables<"accounts">[];

  return (
    <div className="space-y-6">
      <InvestmentPortfolioView investments={investments} accounts={accounts} />
    </div>
  );
}

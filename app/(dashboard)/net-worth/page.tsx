import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { Tables } from "@/types/database";
import { NetWorthView } from "@/components/net-worth/net-worth-view";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { calculateSavingsRate } from "@/lib/calculations/financial";

export const metadata: Metadata = {
  title: "Net Worth Statement — WealthOvers",
  description: "Consolidated real-time balance sheet and net worth tracking",
};

export default async function NetWorthPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();
  const now = new Date();
  const monthStart = startOfMonth(now).toISOString();
  const monthEnd = endOfMonth(now).toISOString();

  // Parallelize independent asset, liability, credit card, and summary queries with explicit column selection
  const [
    accountsResult,
    investmentsResult,
    assetsResult,
    loansResult,
    liabilitiesResult,
    creditCardsResult,
    summaryRpcResult,
  ] = await Promise.all([
    supabase
      .from("accounts")
      .select("id, user_id, name, color, icon, account_type, initial_balance, current_balance, currency, institution_name, account_number_masked, is_archived, created_at, updated_at")
      .eq("user_id", user.id),
    supabase
      .from("investments")
      .select("id, user_id, account_id, name, symbol, asset_type, broker_name, total_quantity, average_buy_price, total_invested_amount, current_nav_or_price, current_valuation, currency, notes, last_price_update_at, created_at, updated_at")
      .eq("user_id", user.id),
    supabase
      .from("assets")
      .select("id, user_id, name, category, purchase_price, current_valuation, purchase_date, notes, created_at, updated_at")
      .eq("user_id", user.id),
    supabase
      .from("loans")
      .select("id, user_id, account_id, lender_or_borrower_name, loan_type, principal_amount, outstanding_balance, annual_interest_rate, tenure_months, monthly_emi, start_date, maturity_date, notes, created_at, updated_at")
      .eq("user_id", user.id),
    supabase
      .from("liabilities")
      .select("id, user_id, name, category, total_amount, outstanding_amount, due_date, notes, created_at, updated_at")
      .eq("user_id", user.id),
    supabase
      .from("credit_cards")
      .select("id, user_id, account_id, card_name, issuer_name, last_four_digits, credit_limit, current_outstanding, payment_due_day, statement_date_day, apr_percentage, created_at, updated_at")
      .eq("user_id", user.id),
    supabase.rpc("get_dashboard_summary", {
      p_user_id: user.id,
      p_start_date: monthStart,
      p_end_date: monthEnd,
    }),
  ]);

  const accounts = (accountsResult.data || []) as Tables<"accounts">[];
  const investments = (investmentsResult.data || []) as Tables<"investments">[];
  const assets = (assetsResult.data || []) as Tables<"assets">[];
  const loans = (loansResult.data || []) as Tables<"loans">[];
  const liabilities = (liabilitiesResult.data || []) as Tables<"liabilities">[];
  const creditCards = (creditCardsResult.data || []) as Tables<"credit_cards">[];

  const rpc = summaryRpcResult.data;
  const monthlyInflow = rpc?.monthly_inflow || "0.0000";
  const monthlyOutflow = rpc?.monthly_outflow || "0.0000";
  const { savingsRatePercent } = calculateSavingsRate(monthlyInflow, monthlyOutflow);

  return (
    <div className="space-y-6">
      <NetWorthView
        accounts={accounts}
        investments={investments}
        assets={assets}
        loans={loans}
        liabilities={liabilities}
        creditCards={creditCards}
        monthlyInflow={monthlyInflow}
        monthlyOutflow={monthlyOutflow}
        savingsRate={savingsRatePercent}
      />
    </div>
  );
}

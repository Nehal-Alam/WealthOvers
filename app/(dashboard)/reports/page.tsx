import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { Tables } from "@/types/database";
import { ReportsView } from "@/components/reports/reports-view";

export const metadata: Metadata = {
  title: "Reports & Summaries — WealthOvers",
  description: "View financial summaries, cash flow reports, and export statements",
};

export default async function ReportsPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();

  // Parallelize queries across all financial domains for 11 comprehensive reports
  const [
    transactionsResult,
    accountsResult,
    categoriesResult,
    budgetsResult,
    investmentsResult,
    loansResult,
    creditCardsResult,
    assetsResult,
    liabilitiesResult,
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        `
        id, amount, currency, transaction_type, transaction_date, description, category_id, account_id,
        account:accounts!transactions_account_id_fkey(id, name, institution_name),
        category:categories(id, name, color, icon),
        subcategory:subcategories(id, name)
      `
      )
      .eq("user_id", user.id)
      .order("transaction_date", { ascending: false })
      .limit(1500),

    supabase
      .from("accounts")
      .select("id, name, color, institution_name, currency, current_balance, account_type, is_archived")
      .eq("user_id", user.id),

    supabase
      .from("categories")
      .select("id, name, color, icon")
      .eq("user_id", user.id),

    supabase
      .from("budgets")
      .select("id, user_id, category_id, name, total_amount, start_date, end_date, rollover_enabled, category:categories(name)")
      .eq("user_id", user.id),

    supabase
      .from("investments")
      .select("id, user_id, name, symbol, asset_type, broker_name, total_quantity, average_buy_price, total_invested_amount, current_nav_or_price, current_valuation, currency")
      .eq("user_id", user.id),

    supabase
      .from("loans")
      .select("id, user_id, loan_type, lender_or_borrower_name, principal_amount, outstanding_balance, monthly_emi, annual_interest_rate")
      .eq("user_id", user.id),

    supabase
      .from("credit_cards")
      .select("id, user_id, card_name, issuer_name, last_four_digits, credit_limit, current_outstanding, payment_due_day")
      .eq("user_id", user.id),

    supabase
      .from("assets")
      .select("id, user_id, name, category, current_valuation")
      .eq("user_id", user.id),

    supabase
      .from("liabilities")
      .select("id, user_id, name, category, outstanding_amount")
      .eq("user_id", user.id),
  ]);

  const transactions = (transactionsResult.data || []) as any[];
  const accounts = (accountsResult.data || []) as Tables<"accounts">[];
  const categories = (categoriesResult.data || []) as Tables<"categories">[];
  const budgets = (budgetsResult.data || []) as any[];
  const investments = (investmentsResult.data || []) as Tables<"investments">[];
  const loans = (loansResult.data || []) as Tables<"loans">[];
  const creditCards = (creditCardsResult.data || []) as Tables<"credit_cards">[];
  const assets = (assetsResult.data || []) as Tables<"assets">[];
  const liabilities = (liabilitiesResult.data || []) as Tables<"liabilities">[];

  return (
    <div className="space-y-6">
      <ReportsView
        transactions={transactions}
        accounts={accounts}
        categories={categories}
        budgets={budgets}
        investments={investments}
        loans={loans}
        creditCards={creditCards}
        assets={assets}
        liabilities={liabilities}
      />
    </div>
  );
}

import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { Tables } from "@/types/database";
import { InsightsView } from "@/components/insights/insights-view";

export const metadata: Metadata = {
  title: "Stats & Financial Intelligence — WealthOvers",
  description: "Advanced analytics, cash flow trends, daily spending scrubber, wealth allocation, and AI insights",
};

export default async function InsightsPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();

  // Parallelize queries across transactions, accounts, categories, investments, assets, loans, liabilities
  const [
    transactionsResult,
    accountsResult,
    categoriesResult,
    investmentsResult,
    assetsResult,
    loansResult,
    liabilitiesResult,
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        `
        id, amount, currency, transaction_type, transaction_date, description, merchant_or_person, category_id, account_id,
        account:accounts!transactions_account_id_fkey(id, name, institution_name),
        category:categories(id, name, color, icon),
        subcategory:subcategories(id, name)
      `
      )
      .eq("user_id", user.id)
      .order("transaction_date", { ascending: false })
      .limit(3000),

    supabase
      .from("accounts")
      .select("id, name, color, institution_name, currency, current_balance, account_type, is_archived")
      .eq("user_id", user.id),

    supabase
      .from("categories")
      .select("id, name, color, icon")
      .eq("user_id", user.id),

    supabase
      .from("investments")
      .select("id, name, asset_type, current_value, total_invested, unrealized_gain_loss")
      .eq("user_id", user.id),

    supabase
      .from("assets")
      .select("id, name, category, current_valuation")
      .eq("user_id", user.id),

    supabase
      .from("loans")
      .select("id, lender_or_borrower_name, loan_type, principal_amount, outstanding_balance, monthly_emi, annual_interest_rate, start_date, maturity_date")
      .eq("user_id", user.id),

    supabase
      .from("liabilities")
      .select("id, name, category, total_amount, outstanding_amount, due_date, notes")
      .eq("user_id", user.id),
  ]);

  const transactions = (transactionsResult.data || []) as any[];
  const accounts = (accountsResult.data || []) as Tables<"accounts">[];
  const categories = (categoriesResult.data || []) as Tables<"categories">[];
  const investments = (investmentsResult.data || []) as any[];
  const assets = (assetsResult.data || []) as any[];
  const loans = (loansResult.data || []) as any[];
  const liabilities = (liabilitiesResult.data || []) as any[];

  return (
    <div className="space-y-6">
      <InsightsView
        transactions={transactions}
        accounts={accounts}
        categories={categories}
        investments={investments}
        assets={assets}
        loans={loans}
        liabilities={liabilities}
      />
    </div>
  );
}

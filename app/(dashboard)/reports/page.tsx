import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Tables } from "@/types/database";
import { ReportsView } from "@/components/reports/reports-view";

export const metadata: Metadata = {
  title: "Reports & Summaries — WealthOvers",
  description: "View financial summaries, cash flow reports, and export statements",
};

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch all transactions with account and category
  const { data: transactionsData } = await supabase
    .from("transactions")
    .select(
      `
      *,
      account:accounts!transactions_account_id_fkey(id, name, institution_name),
      category:categories(id, name, color, icon),
      subcategory:subcategories(id, name)
    `
    )
    .eq("user_id", user.id)
    .order("transaction_date", { ascending: false });

  // Fetch accounts
  const { data: accountsData } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", user.id);

  // Fetch categories
  const { data: categoriesData } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", user.id);

  const transactions = (transactionsData || []) as any[];
  const accounts = (accountsData || []) as Tables<"accounts">[];
  const categories = (categoriesData || []) as Tables<"categories">[];

  return (
    <div className="space-y-6">
      <ReportsView
        transactions={transactions}
        accounts={accounts}
        categories={categories}
      />
    </div>
  );
}

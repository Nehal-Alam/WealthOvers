import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { Tables } from "@/types/database";
import { AccountGrid } from "@/components/accounts/account-grid";

export const metadata: Metadata = {
  title: "Accounts — WealthOvers",
  description: "Manage bank accounts, wallets, credit cards, and transfer funds",
};

export default async function AccountsPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();
  const [accountsResult, transactionsResult] = await Promise.all([
    supabase
      .from("accounts")
      .select("id, user_id, name, color, icon, account_type, initial_balance, current_balance, currency, institution_name, account_number_masked, is_archived, created_at, updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("transactions")
      .select(
        `
        id, transaction_number, transaction_type, transaction_subtype, amount, currency, transaction_date, description, merchant_or_person, notes, account_id, destination_account_id,
        category:categories(id, name, icon, color),
        ledger_entries(*)
      `
      )
      .eq("user_id", user.id)
      .order("transaction_date", { ascending: false })
      .limit(1000),
  ]);

  if (accountsResult.error) {
    console.error("Error fetching accounts:", accountsResult.error);
  }

  const accounts = (accountsResult.data || []) as Tables<"accounts">[];
  const transactions = (transactionsResult.data || []) as any[];

  return (
    <div className="space-y-6">
      <AccountGrid accounts={accounts} transactions={transactions} />
    </div>
  );
}


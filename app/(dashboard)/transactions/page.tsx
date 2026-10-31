import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Tables } from "@/types/database";
import { TransactionLedger } from "@/components/transactions/transaction-ledger";

export const metadata: Metadata = {
  title: "Transactions — WealthOvers",
  description: "View, filter, and record financial transactions",
};

export default async function TransactionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch transactions with related account and category
  const { data: transactionsData } = await supabase
    .from("transactions")
    .select(
      `
      *,
      account:accounts!transactions_account_id_fkey(id, name, institution_name, color),
      destination_account:accounts!transactions_destination_account_id_fkey(id, name, institution_name),
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
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  // Fetch categories with subcategories
  const { data: categoriesData } = await supabase
    .from("categories")
    .select("*, subcategories(*)")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  const transactions = (transactionsData || []) as any[];
  const accounts = (accountsData || []) as Tables<"accounts">[];
  const categories = (categoriesData || []) as any[];

  return (
    <div className="space-y-6">
      <TransactionLedger
        transactions={transactions}
        accounts={accounts}
        categories={categories}
      />
    </div>
  );
}


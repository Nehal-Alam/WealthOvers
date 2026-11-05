import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { Tables } from "@/types/database";
import { TransactionLedger } from "@/components/transactions/transaction-ledger";

export const metadata: Metadata = {
  title: "Transactions — WealthOvers",
  description: "View, filter, and record financial transactions",
};

export default async function TransactionsPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();

  // Parallelize initial transaction batch, accounts, and categories (eliminates sequential waterfall)
  const [transactionsResult, accountsResult, categoriesResult] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        `
        id, transaction_number, amount, currency, transaction_type, transaction_subtype,
        transaction_date, description, merchant_or_person, payment_method, status, notes,
        reference_number, source_module, related_transaction_id, transfer_group_id,
        investment_id, credit_card_id, loan_id, loan_payment_id, sip_schedule_id, sip_installment_id, asset_id,
        category_id, subcategory_id, account_id, destination_account_id, is_reviewed, tags,
        account:accounts!transactions_account_id_fkey(id, name, institution_name, color),
        destination_account:accounts!transactions_destination_account_id_fkey(id, name, institution_name),
        category:categories(id, name, color, icon),
        subcategory:subcategories(id, name),
        ledger_entries(*)
      `
      )
      .eq("user_id", user.id)
      .order("transaction_date", { ascending: false })
      .limit(1000),

    supabase
      .from("accounts")
      .select("id, name, institution_name, color, is_archived, currency, current_balance, account_type")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),

    supabase
      .from("categories")
      .select("id, name, color, icon, subcategories(id, name)")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
  ]);

  const transactions = (transactionsResult.data || []) as any[];
  const accounts = (accountsResult.data || []) as Tables<"accounts">[];
  const categories = (categoriesResult.data || []) as any[];

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

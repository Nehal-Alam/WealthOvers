import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { Tables } from "@/types/database";
import { RecurringList } from "@/components/recurring/recurring-list";
import { RecurringDetectorCard } from "@/components/recurring/recurring-detector-card";

export const metadata: Metadata = {
  title: "Recurring Transactions — WealthOvers",
  description: "Manage subscriptions, recurring bills, and scheduled incomes",
};

export default async function RecurringPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();

  // Parallelize recurring rules, accounts, and categories
  const [recurringResult, accountsResult, categoriesResult] = await Promise.all([
    supabase
      .from("recurring_transactions")
      .select(
        `
        id, name, amount, currency, recurrence_interval, next_occurrence_date, is_active, auto_record, description,
        account:accounts(id, name, institution_name),
        category:categories(id, name, color, icon)
      `
      )
      .eq("user_id", user.id)
      .order("next_occurrence_date", { ascending: true }),

    supabase
      .from("accounts")
      .select("id, name, institution_name, currency, current_balance, is_archived")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),

    supabase
      .from("categories")
      .select("id, name, color, icon")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
  ]);

  const recurringRules = (recurringResult.data || []) as any[];
  const accounts = (accountsResult.data || []) as Tables<"accounts">[];
  const categories = (categoriesResult.data || []) as Tables<"categories">[];

  return (
    <div className="space-y-6">
      <RecurringDetectorCard accounts={accounts} />
      <RecurringList
        recurringRules={recurringRules}
        accounts={accounts}
        categories={categories}
      />
    </div>
  );
}

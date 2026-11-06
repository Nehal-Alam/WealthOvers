import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { Tables } from "@/types/database";
import { BillsDashboard } from "@/components/recurring/bills-dashboard";

export const metadata: Metadata = {
  title: "Recurring & Bills — WealthOvers",
  description: "Manage subscriptions, recurring bills, and scheduled payments",
};

export default async function RecurringPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();

  // Parallelize recurring rules, occurrences, accounts, and categories
  const [recurringResult, occurrencesResult, accountsResult, categoriesResult] =
    await Promise.all([
      supabase
        .from("recurring_transactions")
        .select(
          `
          id, name, amount, currency, recurrence_interval, interval_count, next_occurrence_date,
          start_date, end_date, is_active, auto_record, description, notes, is_variable_amount,
          payment_method, reminder_days_before, is_autopay, status, transaction_type,
          account:accounts(id, name, institution_name),
          category:categories(id, name, color, icon)
        `
        )
        .eq("user_id", user.id)
        .order("next_occurrence_date", { ascending: true }),

      supabase
        .from("bill_occurrences")
        .select(
          `
          id, user_id, recurring_id, due_date, amount, currency, status, paid_date, paid_amount,
          account_id, transaction_id, payment_method, notes,
          recurring:recurring_transactions(id, name, amount, recurrence_interval, category_id, account_id)
        `
        )
        .eq("user_id", user.id)
        .order("due_date", { ascending: true }),

      supabase
        .from("accounts")
        .select("id, name, institution_name, currency, current_balance, is_archived")
        .eq("user_id", user.id)
        .eq("is_archived", false)
        .order("name", { ascending: true }),

      supabase
        .from("categories")
        .select("id, name, color, icon")
        .eq("user_id", user.id)
        .order("name", { ascending: true }),
    ]);

  const recurringRules = (recurringResult.data || []) as any[];
  const occurrences = (occurrencesResult.data || []) as any[];
  const accounts = (accountsResult.data || []) as Tables<"accounts">[];
  const categories = (categoriesResult.data || []) as Tables<"categories">[];

  return (
    <div className="space-y-6">
      <BillsDashboard
        recurringRules={recurringRules}
        occurrences={occurrences}
        accounts={accounts}
        categories={categories}
      />
    </div>
  );
}

import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Tables } from "@/types/database";
import { RecurringList } from "@/components/recurring/recurring-list";

export const metadata: Metadata = {
  title: "Recurring Transactions — WealthOvers",
  description: "Manage subscriptions, recurring bills, and scheduled incomes",
};

export default async function RecurringPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch recurring rules with relations
  const { data: recurringData } = await supabase
    .from("recurring_transactions")
    .select(
      `
      *,
      account:accounts(id, name, institution_name),
      category:categories(id, name, color, icon)
    `
    )
    .eq("user_id", user.id)
    .order("next_occurrence_date", { ascending: true });

  // Fetch active accounts
  const { data: accountsData } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  // Fetch categories
  const { data: categoriesData } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  const recurringRules = (recurringData || []) as any[];
  const accounts = (accountsData || []) as Tables<"accounts">[];
  const categories = (categoriesData || []) as Tables<"categories">[];

  return (
    <div className="space-y-6">
      <RecurringList
        recurringRules={recurringRules}
        accounts={accounts}
        categories={categories}
      />
    </div>
  );
}


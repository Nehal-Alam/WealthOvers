import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { SubscriptionsView } from "@/components/subscriptions/subscriptions-view";
import { Tables } from "@/types/database";

export const metadata: Metadata = {
  title: "Subscriptions & Commitments — WealthOvers",
  description: "Track and optimize recurring SaaS, memberships, and service commitments",
};

export default async function SubscriptionsPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();

  // Fetch subscriptions with related accounts and categories, plus accounts and categories in parallel
  const [subscriptionsResult, accountsResult, categoriesResult] = await Promise.all([
    supabase
      .from("subscriptions")
      .select(
        `
        id, user_id, name, billing_cycle, cost, currency, account_id, category_id,
        renewal_date, cancellation_reminder_days, status, created_at, updated_at,
        account:accounts(id, name, institution_name),
        category:categories(id, name, color, icon)
      `
      )
      .eq("user_id", user.id)
      .order("renewal_date", { ascending: true }),

    supabase
      .from("accounts")
      .select("id, name, institution_name, currency, current_balance, is_archived")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("name", { ascending: true }),

    supabase
      .from("categories")
      .select("id, name, color, icon, type")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
  ]);

  const subscriptions = (subscriptionsResult.data || []) as any[];
  const accounts = (accountsResult.data || []) as Tables<"accounts">[];
  const categories = (categoriesResult.data || []) as Tables<"categories">[];

  return (
    <SubscriptionsView
      subscriptions={subscriptions}
      accounts={accounts}
      categories={categories}
    />
  );
}

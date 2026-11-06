import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { GoalsView } from "@/components/goals/goals-view";
import { Tables } from "@/types/database";

export const metadata: Metadata = {
  title: "Financial Goals — WealthOvers",
  description: "Set and achieve long-term financial milestones and savings targets",
};

export default async function GoalsPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();

  const [goalsResult, accountsResult] = await Promise.all([
    supabase
      .from("financial_goals")
      .select(
        `
        id, name, target_amount, current_amount, target_date, category, priority, start_date,
        is_completed, status, planned_contribution_amount, contribution_frequency, notes, created_at,
        contributions:goal_contributions(id, goal_id, amount, contribution_date, notes)
      `
      )
      .eq("user_id", user.id)
      .order("target_date", { ascending: true }),
    supabase
      .from("accounts")
      .select("id, name, institution_name, currency, current_balance, is_archived")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("name", { ascending: true }),
  ]);

  const goals = (goalsResult.data || []) as any[];
  const accounts = (accountsResult.data || []) as Tables<"accounts">[];

  return (
    <div className="space-y-6">
      <GoalsView goals={goals} accounts={accounts} />
    </div>
  );
}

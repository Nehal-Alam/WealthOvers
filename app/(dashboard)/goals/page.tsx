import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { GoalsView } from "@/components/goals/goals-view";

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
  const { data: goalsData } = await supabase
    .from("financial_goals")
    .select(
      `
      *,
      contributions:goal_contributions(*)
    `
    )
    .eq("user_id", user.id)
    .order("target_date", { ascending: true });

  const goals = (goalsData || []) as any[];

  return (
    <div className="space-y-6">
      <GoalsView goals={goals} />
    </div>
  );
}


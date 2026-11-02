import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { Tables } from "@/types/database";
import { BudgetView } from "@/components/budgets/budget-view";
import { addMoney } from "@/lib/calculations/financial";

export const metadata: Metadata = {
  title: "Budgets — WealthOvers",
  description: "Track monthly spending budgets, rollovers, and category limits",
};

export default async function BudgetsPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();

  // Fetch all budgets and categories concurrently in parallel
  const [budgetsResult, categoriesResult] = await Promise.all([
    supabase
      .from("budgets")
      .select(
        `
        *,
        budget_categories:budget_categories(
          id,
          category_id,
          allocated_amount,
          category:categories(id, name, color, icon)
        )
      `
      )
      .eq("user_id", user.id)
      .order("start_date", { ascending: false }),
    supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
  ]);

  const rawBudgets = (budgetsResult.data || []) as any[];
  const categories = (categoriesResult.data || []) as Tables<"categories">[];

  // For each budget, fetch actual expenses in its date range to calculate spending
  const budgetsWithSpending = await Promise.all(
    rawBudgets.map(async (b) => {
      const { data: txns } = await supabase
        .from("transactions")
        .select("amount, category_id, transaction_type")
        .eq("user_id", user.id)
        .eq("transaction_type", "expense")
        .gte("transaction_date", b.start_date)
        .lte("transaction_date", `${b.end_date}T23:59:59.999Z`);

      const spentByCategory: Record<string, string> = {};
      let totalSpent = "0.0000";

      if (txns) {
        for (const t of txns) {
          totalSpent = addMoney(totalSpent, t.amount);
          if (t.category_id) {
            spentByCategory[t.category_id] = addMoney(
              spentByCategory[t.category_id] || "0.0000",
              t.amount
            );
          }
        }
      }

      return {
        ...b,
        spentByCategory,
        totalSpent,
      };
    })
  );

  return (
    <div className="space-y-6">
      <BudgetView budgets={budgetsWithSpending} categories={categories} />
    </div>
  );
}


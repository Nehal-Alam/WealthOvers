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

  // Fetch all budgets and categories concurrently in parallel with explicit column selections
  const [budgetsResult, categoriesResult] = await Promise.all([
    supabase
      .from("budgets")
      .select(
        `
        id, name, total_amount, start_date, end_date, rollover_unused, created_at,
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
      .select("id, name, color, icon, type")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
  ]);

  const rawBudgets = (budgetsResult.data || []) as any[];
  const categories = (categoriesResult.data || []) as Tables<"categories">[];

  // Eliminate N+1 loop: Batch-aggregate spending for all budgets in a single indexed query
  let budgetsWithSpending: any[] = [];
  if (rawBudgets.length > 0) {
    let minStartDate = rawBudgets[0].start_date;
    let maxEndDate = rawBudgets[0].end_date;
    for (const b of rawBudgets) {
      if (b.start_date < minStartDate) minStartDate = b.start_date;
      if (b.end_date > maxEndDate) maxEndDate = b.end_date;
    }

    const { data: allExpenses } = await supabase
      .from("transactions")
      .select("amount, category_id, transaction_date")
      .eq("user_id", user.id)
      .eq("transaction_type", "expense")
      .gte("transaction_date", minStartDate)
      .lte("transaction_date", `${maxEndDate}T23:59:59.999Z`);

    const expensesList = allExpenses || [];

    budgetsWithSpending = rawBudgets.map((b) => {
      const spentByCategory: Record<string, string> = {};
      let totalSpent = "0.0000";
      const bEnd = `${b.end_date}T23:59:59.999Z`;

      for (const t of expensesList) {
        if (t.transaction_date >= b.start_date && t.transaction_date <= bEnd) {
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
    });
  }

  return (
    <div className="space-y-6">
      <BudgetView budgets={budgetsWithSpending} categories={categories} />
    </div>
  );
}


"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createBudgetSchema,
  updateBudgetSchema,
  CreateBudgetInput,
  UpdateBudgetInput,
} from "@/lib/validations/budgets";

export type ActionResult<T = unknown> = {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
};

export async function createBudgetAction(input: CreateBudgetInput): Promise<ActionResult> {
  try {
    const validated = createBudgetSchema.parse(input);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const totalNum = parseFloat(validated.total_amount);

    // Insert budget
    const { data: budget, error: budgetError } = await supabase
      .from("budgets")
      .insert({
        user_id: user.id,
        name: validated.name.trim(),
        total_amount: totalNum,
        period_type: validated.period_type,
        start_date: validated.start_date,
        end_date: validated.end_date,
        rollover_enabled: validated.rollover_enabled,
        alert_threshold_percent: validated.alert_threshold_percent,
      })
      .select()
      .single();

    if (budgetError || !budget) {
      return { success: false, error: budgetError?.message || "Failed to create budget" };
    }

    // Insert category allocations if present
    if (validated.allocations && validated.allocations.length > 0) {
      const rows = validated.allocations.map((a) => ({
        budget_id: budget.id,
        category_id: a.category_id,
        allocated_amount: parseFloat(a.allocated_amount),
      }));

      const { error: allocError } = await supabase
        .from("budget_categories")
        .insert(rows);

      if (allocError) {
        console.error("Error inserting budget categories:", allocError);
      }
    }

    revalidatePath("/budgets");
    revalidatePath("/dashboard");
    return { success: true, message: "Budget created successfully", data: budget };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to create budget";
    return { success: false, error: errorMsg };
  }
}

export async function updateBudgetAction(input: UpdateBudgetInput): Promise<ActionResult> {
  try {
    const validated = updateBudgetSchema.parse(input);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const totalNum = parseFloat(validated.total_amount);

    const { data, error } = await supabase
      .from("budgets")
      .update({
        name: validated.name.trim(),
        total_amount: totalNum,
        rollover_enabled: validated.rollover_enabled,
        alert_threshold_percent: validated.alert_threshold_percent,
      })
      .eq("id", validated.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/budgets");
    revalidatePath("/dashboard");
    return { success: true, message: "Budget updated successfully", data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update budget";
    return { success: false, error: errorMsg };
  }
}

export async function deleteBudgetAction(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const { error } = await supabase
      .from("budgets")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/budgets");
    revalidatePath("/dashboard");
    return { success: true, message: "Budget deleted successfully" };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to delete budget";
    return { success: false, error: errorMsg };
  }
}

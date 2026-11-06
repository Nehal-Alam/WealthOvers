"use server";

import { revalidatePath } from "next/cache";
import { format, startOfMonth, endOfMonth, addMonths } from "date-fns";
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
    const rolloverLimitNum = parseFloat(validated.rollover_limit || "0");

    // Insert budget
    const { data: budget, error: budgetError } = await supabase
      .from("budgets")
      .insert({
        user_id: user.id,
        name: validated.name.trim(),
        budget_type: validated.budget_type,
        total_amount: totalNum,
        period_type: validated.period_type,
        start_date: validated.start_date,
        end_date: validated.end_date,
        category_id: validated.category_id || null,
        account_id: validated.account_id || null,
        rollover_enabled: validated.rollover_enabled,
        rollover_mode: validated.rollover_mode,
        rollover_limit: rolloverLimitNum,
        alert_threshold_percent: validated.alert_threshold_percent,
        alert_thresholds: validated.alert_thresholds || [50, 75, 90, 100],
        notes: validated.notes?.trim() || null,
        status: validated.status || "active",
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
        notes: a.notes?.trim() || null,
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
    revalidatePath("/plan");
    return { success: true, message: "Budget plan created successfully", data: budget };
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
    const rolloverLimitNum = parseFloat(validated.rollover_limit || "0");

    const updatePayload: Record<string, any> = {
      name: validated.name.trim(),
      total_amount: totalNum,
      rollover_enabled: validated.rollover_enabled,
      rollover_mode: validated.rollover_mode,
      rollover_limit: rolloverLimitNum,
      alert_threshold_percent: validated.alert_threshold_percent,
      alert_thresholds: validated.alert_thresholds || [50, 75, 90, 100],
      updated_at: new Date().toISOString(),
    };

    if (validated.budget_type) updatePayload.budget_type = validated.budget_type;
    if (validated.category_id !== undefined) updatePayload.category_id = validated.category_id;
    if (validated.account_id !== undefined) updatePayload.account_id = validated.account_id;
    if (validated.notes !== undefined) updatePayload.notes = validated.notes?.trim() || null;
    if (validated.status) updatePayload.status = validated.status;

    const { data, error } = await supabase
      .from("budgets")
      .update(updatePayload)
      .eq("id", validated.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // If allocations provided, replace existing allocations
    if (validated.allocations) {
      await supabase.from("budget_categories").delete().eq("budget_id", validated.id);

      if (validated.allocations.length > 0) {
        const rows = validated.allocations.map((a) => ({
          budget_id: validated.id,
          category_id: a.category_id,
          allocated_amount: parseFloat(a.allocated_amount),
          notes: a.notes?.trim() || null,
        }));
        await supabase.from("budget_categories").insert(rows);
      }
    }

    revalidatePath("/budgets");
    revalidatePath("/dashboard");
    revalidatePath("/plan");
    return { success: true, message: "Budget updated successfully", data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update budget";
    return { success: false, error: errorMsg };
  }
}

export async function duplicateBudgetAction(
  id: string,
  targetStartDate?: string,
  targetEndDate?: string,
  newBudgetName?: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    // Fetch original budget with allocations
    const { data: orig, error: origErr } = await supabase
      .from("budgets")
      .select("*, budget_categories(*)")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (origErr || !orig) {
      return { success: false, error: "Original budget not found" };
    }

    const nextMonth = addMonths(new Date(), 1);
    const startDate = targetStartDate || format(startOfMonth(nextMonth), "yyyy-MM-dd");
    const endDate = targetEndDate || format(endOfMonth(nextMonth), "yyyy-MM-dd");
    const name = newBudgetName || `${orig.name} (Copy)`;

    const { data: newBudget, error: insErr } = await supabase
      .from("budgets")
      .insert({
        user_id: user.id,
        name,
        budget_type: orig.budget_type,
        total_amount: orig.total_amount,
        period_type: orig.period_type,
        start_date: startDate,
        end_date: endDate,
        category_id: orig.category_id,
        account_id: orig.account_id,
        rollover_enabled: orig.rollover_enabled,
        rollover_mode: orig.rollover_mode,
        rollover_limit: orig.rollover_limit,
        alert_threshold_percent: orig.alert_threshold_percent,
        alert_thresholds: orig.alert_thresholds,
        notes: orig.notes,
        status: "active",
      })
      .select()
      .single();

    if (insErr || !newBudget) {
      return { success: false, error: insErr?.message || "Failed to duplicate budget" };
    }

    const origAllocations = orig.budget_categories || [];
    if (origAllocations.length > 0) {
      const rows = origAllocations.map((a: any) => ({
        budget_id: newBudget.id,
        category_id: a.category_id,
        allocated_amount: a.allocated_amount,
        notes: a.notes,
      }));
      await supabase.from("budget_categories").insert(rows);
    }

    revalidatePath("/budgets");
    revalidatePath("/dashboard");
    revalidatePath("/plan");
    return { success: true, message: `Budget duplicated for ${targetStartDate}`, data: newBudget };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to duplicate budget";
    return { success: false, error: errorMsg };
  }
}

export async function toggleBudgetStatusAction(
  id: string,
  newStatus: "active" | "paused" | "archived"
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const { error } = await supabase
      .from("budgets")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/budgets");
    revalidatePath("/dashboard");
    revalidatePath("/plan");
    return {
      success: true,
      message: `Budget ${newStatus === "active" ? "resumed" : newStatus === "paused" ? "paused" : "archived"}`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update budget status";
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


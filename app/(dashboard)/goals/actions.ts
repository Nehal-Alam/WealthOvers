"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createGoalSchema,
  updateGoalSchema,
  contributeGoalSchema,
  CreateGoalInput,
  UpdateGoalInput,
  ContributeGoalInput,
} from "@/lib/validations/goals";
import Decimal from "decimal.js";
import { toDecimal } from "@/lib/calculations/financial";

export type ActionResult<T = unknown> = {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
};

export async function createGoalAction(input: CreateGoalInput): Promise<ActionResult> {
  try {
    const validated = createGoalSchema.parse(input);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const { data, error } = await supabase
      .from("financial_goals")
      .insert({
        user_id: user.id,
        name: validated.name.trim(),
        category: validated.category,
        target_amount: parseFloat(validated.target_amount),
        current_amount: parseFloat(validated.current_amount || "0"),
        start_date: validated.start_date,
        target_date: validated.target_date,
        priority: validated.priority || "medium",
        account_id: validated.account_id || null,
        investment_id: validated.investment_id || null,
        planned_contribution_amount: parseFloat(validated.planned_contribution_amount || "0"),
        contribution_frequency: validated.contribution_frequency || "monthly",
        notes: validated.notes?.trim() || validated.description?.trim() || null,
        icon_or_image: validated.icon_or_image || null,
        status: "active",
        is_completed: false,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/goals");
    revalidatePath("/plan");
    revalidatePath("/dashboard");
    return { success: true, message: "Goal registered successfully", data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to create goal";
    return { success: false, error: errorMsg };
  }
}

export async function updateGoalAction(input: UpdateGoalInput): Promise<ActionResult> {
  try {
    const validated = updateGoalSchema.parse(input);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const { data, error } = await supabase
      .from("financial_goals")
      .update({
        name: validated.name.trim(),
        category: validated.category,
        target_amount: parseFloat(validated.target_amount),
        current_amount: parseFloat(validated.current_amount),
        start_date: validated.start_date,
        target_date: validated.target_date,
        priority: validated.priority,
        status: validated.status,
        is_completed: validated.is_completed,
        account_id: validated.account_id || null,
        investment_id: validated.investment_id || null,
        planned_contribution_amount: parseFloat(validated.planned_contribution_amount || "0"),
        contribution_frequency: validated.contribution_frequency || "monthly",
        notes: validated.notes?.trim() || null,
        icon_or_image: validated.icon_or_image || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", validated.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/goals");
    revalidatePath("/plan");
    revalidatePath("/dashboard");
    return { success: true, message: "Goal updated successfully", data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update goal";
    return { success: false, error: errorMsg };
  }
}

export async function contributeGoalAction(input: ContributeGoalInput): Promise<ActionResult> {
  try {
    const validated = contributeGoalSchema.parse(input);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const amount = toDecimal(validated.amount);
    const isWithdrawal = validated.contribution_type === "withdrawal";

    // 1. Insert contribution log
    const { error: contribErr } = await supabase.from("goal_contributions").insert({
      goal_id: validated.goal_id,
      user_id: user.id,
      amount: amount.toNumber(),
      contribution_date: validated.contribution_date,
      account_id: validated.account_id || null,
      contribution_type: validated.contribution_type || "deposit",
      transaction_id: validated.link_transaction_id || null,
      notes: validated.notes?.trim() || null,
    });

    if (contribErr) {
      return { success: false, error: contribErr.message };
    }

    // 2. Adjust goal current_amount
    const { data: goal } = await supabase
      .from("financial_goals")
      .select("current_amount, target_amount")
      .eq("id", validated.goal_id)
      .eq("user_id", user.id)
      .single();

    if (goal) {
      const cur = toDecimal(goal.current_amount);
      const newTotal = isWithdrawal ? Decimal.max(0, cur.minus(amount)) : cur.plus(amount);
      const isCompleted = newTotal.greaterThanOrEqualTo(goal.target_amount);

      await supabase
        .from("financial_goals")
        .update({
          current_amount: newTotal.toNumber(),
          is_completed: isCompleted,
          status: isCompleted ? "completed" : "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", validated.goal_id)
        .eq("user_id", user.id);
    }

    revalidatePath("/goals");
    revalidatePath("/plan");
    revalidatePath("/dashboard");
    return {
      success: true,
      message: isWithdrawal ? "Withdrawal recorded successfully" : "Contribution recorded successfully!",
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to record contribution";
    return { success: false, error: errorMsg };
  }
}

export async function deleteGoalContributionAction(
  contributionId: string,
  goalId: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    // Fetch contribution
    const { data: contrib, error: fetchErr } = await supabase
      .from("goal_contributions")
      .select("amount, contribution_type")
      .eq("id", contributionId)
      .eq("user_id", user.id)
      .single();

    if (fetchErr || !contrib) {
      return { success: false, error: "Contribution record not found" };
    }

    // Delete contribution
    const { error: delErr } = await supabase
      .from("goal_contributions")
      .delete()
      .eq("id", contributionId)
      .eq("user_id", user.id);

    if (delErr) {
      return { success: false, error: delErr.message };
    }

    // Adjust goal current_amount
    const { data: goal } = await supabase
      .from("financial_goals")
      .select("current_amount, target_amount")
      .eq("id", goalId)
      .eq("user_id", user.id)
      .single();

    if (goal) {
      const cur = toDecimal(goal.current_amount);
      const amt = toDecimal(contrib.amount);
      const isWithdrawal = contrib.contribution_type === "withdrawal";
      const restored = isWithdrawal ? cur.plus(amt) : Decimal.max(0, cur.minus(amt));

      await supabase
        .from("financial_goals")
        .update({
          current_amount: restored.toNumber(),
          is_completed: restored.greaterThanOrEqualTo(goal.target_amount),
          updated_at: new Date().toISOString(),
        })
        .eq("id", goalId)
        .eq("user_id", user.id);
    }

    revalidatePath("/goals");
    revalidatePath("/plan");
    return { success: true, message: "Contribution removed and goal balance restored" };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to delete contribution";
    return { success: false, error: errorMsg };
  }
}

export async function deleteGoalAction(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const { error } = await supabase
      .from("financial_goals")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/goals");
    return { success: true, message: "Goal deleted" };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to delete goal";
    return { success: false, error: errorMsg };
  }
}


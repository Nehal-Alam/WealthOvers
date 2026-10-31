"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createGoalSchema,
  contributeGoalSchema,
  CreateGoalInput,
  ContributeGoalInput,
} from "@/lib/validations/goals";
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
        target_amount: parseFloat(validated.target_amount),
        current_amount: parseFloat(validated.current_amount || "0"),
        target_date: validated.target_date,
        category: validated.category,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/goals");
    return { success: true, message: "Goal created successfully", data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to create goal";
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

    // 1. Insert contribution log
    const { error: contribErr } = await supabase.from("goal_contributions").insert({
      goal_id: validated.goal_id,
      user_id: user.id,
      amount: amount.toNumber(),
      contribution_date: validated.contribution_date,
      notes: validated.notes?.trim() || null,
    });

    if (contribErr) {
      return { success: false, error: contribErr.message };
    }

    // 2. Increment goal current_amount
    const { data: goal } = await supabase
      .from("financial_goals")
      .select("current_amount")
      .eq("id", validated.goal_id)
      .eq("user_id", user.id)
      .single();

    if (goal) {
      const newTotal = toDecimal(goal.current_amount).plus(amount);
      await supabase
        .from("financial_goals")
        .update({ current_amount: newTotal.toNumber() })
        .eq("id", validated.goal_id)
        .eq("user_id", user.id);
    }

    revalidatePath("/goals");
    return { success: true, message: "Contribution recorded!" };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to contribute";
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


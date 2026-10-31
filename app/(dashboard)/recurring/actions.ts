"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createRecurringSchema,
  updateRecurringSchema,
  CreateRecurringInput,
  UpdateRecurringInput,
} from "@/lib/validations/recurring";
import { calculateNextOccurrence } from "@/lib/calculations/financial";

export type ActionResult<T = unknown> = {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
};

export async function createRecurringAction(input: CreateRecurringInput): Promise<ActionResult> {
  try {
    const validated = createRecurringSchema.parse(input);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const nextDate = calculateNextOccurrence(
      validated.start_date,
      validated.recurrence_interval,
      validated.interval_count,
      new Date()
    );

    const amountNum = parseFloat(validated.amount);

    const { data, error } = await supabase
      .from("recurring_transactions")
      .insert({
        user_id: user.id,
        account_id: validated.account_id,
        category_id: validated.category_id || null,
        name: validated.name.trim(),
        amount: amountNum,
        currency: validated.currency,
        transaction_type: validated.transaction_type,
        recurrence_interval: validated.recurrence_interval,
        interval_count: validated.interval_count,
        start_date: validated.start_date,
        end_date: validated.end_date || null,
        next_occurrence_date: nextDate,
        auto_record: validated.auto_record,
        is_active: validated.is_active,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/recurring");
    revalidatePath("/dashboard");
    return { success: true, message: "Recurring rule created successfully", data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to create recurring rule";
    return { success: false, error: errorMsg };
  }
}

export async function updateRecurringAction(input: UpdateRecurringInput): Promise<ActionResult> {
  try {
    const validated = updateRecurringSchema.parse(input);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const amountNum = parseFloat(validated.amount);

    const { data, error } = await supabase
      .from("recurring_transactions")
      .update({
        account_id: validated.account_id,
        category_id: validated.category_id || null,
        name: validated.name.trim(),
        amount: amountNum,
        recurrence_interval: validated.recurrence_interval,
        interval_count: validated.interval_count,
        end_date: validated.end_date || null,
        auto_record: validated.auto_record,
        is_active: validated.is_active,
      })
      .eq("id", validated.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/recurring");
    return { success: true, message: "Recurring rule updated successfully", data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update recurring rule";
    return { success: false, error: errorMsg };
  }
}

export async function toggleRecurringActiveAction(id: string, isActive: boolean): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const { error } = await supabase
      .from("recurring_transactions")
      .update({ is_active: isActive })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/recurring");
    return { success: true, message: isActive ? "Rule activated" : "Rule paused" };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to toggle rule";
    return { success: false, error: errorMsg };
  }
}

export async function deleteRecurringAction(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const { error } = await supabase
      .from("recurring_transactions")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/recurring");
    return { success: true, message: "Recurring rule deleted" };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to delete rule";
    return { success: false, error: errorMsg };
  }
}


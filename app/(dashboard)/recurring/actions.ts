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
import { detectRecurringPatterns } from "@/lib/parsers/recurring-detector";
import { RecurringPatternCandidate } from "@/lib/parsers/types";

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

export async function detectRecurringCandidatesAction(): Promise<
  ActionResult<RecurringPatternCandidate[]>
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return { success: false, error: "Unauthorized" };
    }

    // Fetch user's transactions from the past 12 months
    const { data: txns, error: txErr } = await supabase
      .from("transactions")
      .select("id, description, amount, transaction_date, transaction_type, category_id, reference_number")
      .eq("user_id", user.id)
      .order("transaction_date", { ascending: true });

    if (txErr) {
      return { success: false, error: txErr.message };
    }

    if (!txns || txns.length < 2) {
      return {
        success: true,
        message: "Insufficient transaction history to identify recurring patterns.",
        data: [],
      };
    }

    const candidates = detectRecurringPatterns(
      txns.map((t) => ({
        id: t.id,
        description: t.description,
        amount: Number(t.amount),
        transaction_date: t.transaction_date,
        transaction_type: t.transaction_type,
        category_id: t.category_id,
        reference_number: t.reference_number,
      }))
    );

    return {
      success: true,
      message: `Detected ${candidates.length} recurring candidates`,
      data: candidates,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to scan transactions" };
  }
}

export async function convertCandidateToRecurringAction(candidate: {
  name: string;
  amount: number;
  transactionType: "income" | "expense";
  recurrenceInterval: "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "half_yearly" | "yearly";
  accountId: string;
  categoryId?: string | null;
  startDate?: string;
}): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const startDate = candidate.startDate || new Date().toISOString().slice(0, 10);
    const nextDate = calculateNextOccurrence(
      startDate,
      candidate.recurrenceInterval,
      1,
      new Date()
    );

    const { error } = await supabase.from("recurring_transactions").insert({
      user_id: user.id,
      account_id: candidate.accountId,
      category_id: candidate.categoryId || null,
      name: candidate.name,
      amount: candidate.amount,
      currency: "INR",
      transaction_type: candidate.transactionType,
      recurrence_interval: candidate.recurrenceInterval,
      interval_count: 1,
      start_date: startDate,
      next_occurrence_date: nextDate,
      is_active: true,
      auto_record: false,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/recurring");
    return { success: true, message: `Activated recurring schedule for "${candidate.name}"!` };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to convert candidate" };
  }
}


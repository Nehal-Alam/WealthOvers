"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createRecurringSchema,
  updateRecurringSchema,
  markBillPaidSchema,
  skipBillOccurrenceSchema,
  CreateRecurringInput,
  UpdateRecurringInput,
  MarkBillPaidInput,
  SkipBillOccurrenceInput,
} from "@/lib/validations/recurring";
import { calculateNextOccurrence } from "@/lib/calculations/financial";
import { detectRecurringPatterns } from "@/lib/parsers/recurring-detector";
import { RecurringPatternCandidate } from "@/lib/parsers/types";
import { FinancialTransactionService } from "@/lib/services/financial-transaction-service";

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
        merchant_id: validated.merchant_id || null,
        name: validated.name.trim(),
        description: validated.description?.trim() || null,
        amount: amountNum,
        currency: validated.currency,
        transaction_type: validated.transaction_type,
        recurrence_interval: validated.recurrence_interval,
        interval_count: validated.interval_count,
        start_date: validated.start_date,
        end_date: validated.end_date || null,
        next_occurrence_date: nextDate,
        is_variable_amount: validated.is_variable_amount ?? false,
        payment_method: validated.payment_method || null,
        reminder_days_before: validated.reminder_days_before ?? 3,
        is_autopay: validated.is_autopay ?? false,
        auto_record: validated.auto_record,
        notes: validated.notes?.trim() || null,
        is_active: validated.is_active,
        status: validated.status || "active",
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Seed initial bill occurrence for next occurrence date
    if (nextDate && data?.id) {
      await supabase.from("bill_occurrences").insert({
        user_id: user.id,
        recurring_id: data.id,
        due_date: nextDate,
        amount: amountNum,
        currency: validated.currency || "INR",
        status: "upcoming",
        notes: validated.notes?.trim() || null,
      });
    }

    revalidatePath("/recurring");
    revalidatePath("/plan");
    revalidatePath("/budgets");
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
        merchant_id: validated.merchant_id || null,
        name: validated.name.trim(),
        description: validated.description?.trim() || null,
        amount: amountNum,
        recurrence_interval: validated.recurrence_interval,
        interval_count: validated.interval_count,
        next_occurrence_date: validated.next_occurrence_date,
        end_date: validated.end_date || null,
        is_variable_amount: validated.is_variable_amount ?? false,
        payment_method: validated.payment_method || null,
        reminder_days_before: validated.reminder_days_before ?? 3,
        is_autopay: validated.is_autopay ?? false,
        auto_record: validated.auto_record,
        notes: validated.notes?.trim() || null,
        is_active: validated.is_active,
        status: validated.status || "active",
      })
      .eq("id", validated.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/recurring");
    revalidatePath("/plan");
    revalidatePath("/budgets");
    return { success: true, message: "Recurring rule updated successfully", data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update recurring rule";
    return { success: false, error: errorMsg };
  }
}

export async function markBillPaidAction(input: MarkBillPaidInput): Promise<ActionResult> {
  try {
    const validated = markBillPaidSchema.parse(input);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    // 1. Fetch recurring transaction details
    const { data: recurring, error: recError } = await supabase
      .from("recurring_transactions")
      .select("*, category:categories(id, name)")
      .eq("id", validated.recurring_id)
      .eq("user_id", user.id)
      .single();

    if (recError || !recurring) {
      return { success: false, error: "Recurring transaction rule not found." };
    }

    const paidAmountNum = parseFloat(validated.paid_amount);

    // 2. Post real double-entry transaction to central ledger
    let transactionId = validated.link_transaction_id;
    if (!transactionId) {
      const txResult = await FinancialTransactionService.createFinancialTransaction(supabase, {
        userId: user.id,
        transactionType: recurring.transaction_type === "income" ? "income" : "expense",
        transactionSubtype: "bill_payment",
        amount: paidAmountNum,
        currency: recurring.currency || "INR",
        transactionDate: validated.paid_date,
        description: `Bill Payment: ${recurring.name}`,
        accountId: validated.account_id,
        categoryId: recurring.category_id || undefined,
        paymentMethod: validated.payment_method || "bank_transfer",
        notes: validated.notes || `Recurring bill payment for ${recurring.name}`,
        sourceModule: "recurring_bills",
      });

      if (!txResult.success) {
        return { success: false, error: txResult.error || "Failed to record payment in central ledger." };
      }
      transactionId = txResult.transaction?.id;
    }

    // 3. Update or create bill_occurrence
    if (validated.occurrence_id) {
      await supabase
        .from("bill_occurrences")
        .update({
          status: "paid",
          paid_date: validated.paid_date,
          paid_amount: paidAmountNum,
          account_id: validated.account_id,
          payment_method: validated.payment_method,
          transaction_id: transactionId || null,
          notes: validated.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", validated.occurrence_id)
        .eq("user_id", user.id);
    } else {
      await supabase.from("bill_occurrences").insert({
        user_id: user.id,
        recurring_id: recurring.id,
        due_date: recurring.next_occurrence_date || validated.paid_date,
        amount: paidAmountNum,
        currency: recurring.currency || "INR",
        status: "paid",
        paid_date: validated.paid_date,
        paid_amount: paidAmountNum,
        account_id: validated.account_id,
        payment_method: validated.payment_method,
        transaction_id: transactionId || null,
        notes: validated.notes || null,
      });
    }

    // 4. Calculate next occurrence date and advance recurring schedule
    const nextDate = calculateNextOccurrence(
      recurring.next_occurrence_date || recurring.start_date,
      recurring.recurrence_interval,
      recurring.interval_count || 1,
      new Date(validated.paid_date)
    );

    if (nextDate) {
      await supabase
        .from("recurring_transactions")
        .update({ next_occurrence_date: nextDate })
        .eq("id", recurring.id)
        .eq("user_id", user.id);

      // Seed the next upcoming occurrence
      await supabase.from("bill_occurrences").insert({
        user_id: user.id,
        recurring_id: recurring.id,
        due_date: nextDate,
        amount: recurring.amount,
        currency: recurring.currency || "INR",
        status: "upcoming",
      });
    }

    revalidatePath("/recurring");
    revalidatePath("/plan");
    revalidatePath("/budgets");
    revalidatePath("/transactions");
    revalidatePath("/dashboard");
    return {
      success: true,
      message: `Marked "${recurring.name}" as paid (₹${paidAmountNum.toLocaleString("en-IN")}) and recorded in ledger.`,
      data: { transactionId },
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to mark bill as paid";
    return { success: false, error: errorMsg };
  }
}

export async function skipBillOccurrenceAction(input: SkipBillOccurrenceInput): Promise<ActionResult> {
  try {
    const validated = skipBillOccurrenceSchema.parse(input);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const { data: recurring, error: recError } = await supabase
      .from("recurring_transactions")
      .select("*")
      .eq("id", validated.recurring_id)
      .eq("user_id", user.id)
      .single();

    if (recError || !recurring) {
      return { success: false, error: "Recurring rule not found." };
    }

    if (validated.occurrence_id) {
      await supabase
        .from("bill_occurrences")
        .update({
          status: "skipped",
          notes: validated.notes || "Skipped by user",
          updated_at: new Date().toISOString(),
        })
        .eq("id", validated.occurrence_id)
        .eq("user_id", user.id);
    } else {
      await supabase.from("bill_occurrences").insert({
        user_id: user.id,
        recurring_id: recurring.id,
        due_date: recurring.next_occurrence_date || new Date().toISOString().slice(0, 10),
        amount: recurring.amount,
        currency: recurring.currency || "INR",
        status: "skipped",
        notes: validated.notes || "Skipped by user",
      });
    }

    const nextDate = calculateNextOccurrence(
      recurring.next_occurrence_date || recurring.start_date,
      recurring.recurrence_interval,
      recurring.interval_count || 1,
      new Date()
    );

    if (nextDate) {
      await supabase
        .from("recurring_transactions")
        .update({ next_occurrence_date: nextDate })
        .eq("id", recurring.id)
        .eq("user_id", user.id);

      await supabase.from("bill_occurrences").insert({
        user_id: user.id,
        recurring_id: recurring.id,
        due_date: nextDate,
        amount: recurring.amount,
        currency: recurring.currency || "INR",
        status: "upcoming",
      });
    }

    revalidatePath("/recurring");
    revalidatePath("/plan");
    revalidatePath("/budgets");
    return { success: true, message: `Skipped occurrence for "${recurring.name}".` };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to skip bill occurrence";
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


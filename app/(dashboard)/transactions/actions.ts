"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createTransactionSchema,
  updateTransactionSchema,
  createSplitTransactionSchema,
  bulkUpdateCategorySchema,
  bulkDeleteTransactionsSchema,
  markTransactionsReviewedSchema,
  CreateTransactionInput,
  UpdateTransactionInput,
  CreateSplitTransactionInput,
  BulkUpdateCategoryInput,
  BulkDeleteTransactionsInput,
  MarkTransactionsReviewedInput,
} from "@/lib/validations/transactions";

export type ActionResult<T = unknown> = {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
};

export async function createTransactionAction(input: CreateTransactionInput): Promise<ActionResult> {
  try {
    const validated = createTransactionSchema.parse(input);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const amountNum = parseFloat(validated.amount);

    const { data, error } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        account_id: validated.account_id,
        destination_account_id: validated.destination_account_id || null,
        category_id: validated.category_id || null,
        subcategory_id: validated.subcategory_id || null,
        amount: amountNum,
        currency: validated.currency,
        transaction_type: validated.transaction_type,
        transaction_date: new Date(validated.transaction_date).toISOString(),
        description: validated.description.trim(),
        notes: validated.notes?.trim() || null,
        reference_number: validated.reference_number?.trim() || null,
        tags: validated.tags || [],
        source: "manual",
        is_reviewed: true,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/transactions");
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    revalidatePath("/budgets");
    revalidatePath("/reports");
    return { success: true, message: "Transaction added successfully", data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to record transaction";
    return { success: false, error: errorMsg };
  }
}

export async function updateTransactionAction(input: UpdateTransactionInput): Promise<ActionResult> {
  try {
    const validated = updateTransactionSchema.parse(input);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const amountNum = parseFloat(validated.amount);

    const { data, error } = await supabase
      .from("transactions")
      .update({
        account_id: validated.account_id,
        destination_account_id: validated.destination_account_id || null,
        category_id: validated.category_id || null,
        subcategory_id: validated.subcategory_id || null,
        amount: amountNum,
        transaction_type: validated.transaction_type,
        transaction_date: new Date(validated.transaction_date).toISOString(),
        description: validated.description.trim(),
        notes: validated.notes?.trim() || null,
        reference_number: validated.reference_number?.trim() || null,
        tags: validated.tags || [],
      })
      .eq("id", validated.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/transactions");
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    revalidatePath("/budgets");
    revalidatePath("/reports");
    return { success: true, message: "Transaction updated successfully", data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update transaction";
    return { success: false, error: errorMsg };
  }
}

export async function deleteTransactionAction(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/transactions");
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    revalidatePath("/budgets");
    revalidatePath("/reports");
    return { success: true, message: "Transaction deleted successfully" };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to delete transaction";
    return { success: false, error: errorMsg };
  }
}

export async function createSplitTransactionAction(
  input: CreateSplitTransactionInput
): Promise<ActionResult> {
  try {
    const validated = createSplitTransactionSchema.parse(input);
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const isoDate = new Date(validated.transaction_date).toISOString();
    const splitRows = validated.splits.map((s, idx) => ({
      user_id: user.id,
      account_id: validated.account_id,
      destination_account_id: null,
      category_id: s.category_id || null,
      subcategory_id: s.subcategory_id || null,
      amount: parseFloat(s.amount),
      currency: validated.currency,
      transaction_type: validated.transaction_type,
      transaction_date: isoDate,
      description: s.description.trim() || `${validated.parent_description} (Split ${idx + 1}/${validated.splits.length})`,
      notes: validated.notes
        ? `${validated.notes.trim()} | Split of: ${validated.parent_description}`
        : `Split of: ${validated.parent_description} (Total: ${validated.currency} ${validated.total_amount})`,
      reference_number: validated.reference_number?.trim() || null,
      tags: ["split"],
      source: "manual" as const,
      is_reviewed: true,
    }));

    const { data, error } = await supabase
      .from("transactions")
      .insert(splitRows)
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/transactions");
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    revalidatePath("/budgets");
    revalidatePath("/reports");
    return {
      success: true,
      message: `Successfully created ${splitRows.length} split transactions totaling ${validated.currency} ${validated.total_amount}`,
      data,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to create split transaction";
    return { success: false, error: errorMsg };
  }
}

export async function bulkUpdateCategoryAction(
  input: BulkUpdateCategoryInput
): Promise<ActionResult> {
  try {
    const validated = bulkUpdateCategorySchema.parse(input);
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const { error } = await supabase
      .from("transactions")
      .update({
        category_id: validated.category_id || null,
        subcategory_id: validated.subcategory_id || null,
        is_reviewed: true,
      })
      .in("id", validated.transaction_ids)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/transactions");
    revalidatePath("/dashboard");
    revalidatePath("/budgets");
    revalidatePath("/reports");
    return {
      success: true,
      message: `Updated category for ${validated.transaction_ids.length} transaction(s)`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update categories";
    return { success: false, error: errorMsg };
  }
}

export async function bulkDeleteTransactionsAction(
  input: BulkDeleteTransactionsInput
): Promise<ActionResult> {
  try {
    const validated = bulkDeleteTransactionsSchema.parse(input);
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const { error } = await supabase
      .from("transactions")
      .delete()
      .in("id", validated.transaction_ids)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/transactions");
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    revalidatePath("/budgets");
    revalidatePath("/reports");
    return {
      success: true,
      message: `Deleted ${validated.transaction_ids.length} transaction(s) and restored account balances`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to delete transactions";
    return { success: false, error: errorMsg };
  }
}

export async function markTransactionsReviewedAction(
  input: MarkTransactionsReviewedInput
): Promise<ActionResult> {
  try {
    const validated = markTransactionsReviewedSchema.parse(input);
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const { error } = await supabase
      .from("transactions")
      .update({ is_reviewed: true })
      .in("id", validated.transaction_ids)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/transactions");
    revalidatePath("/dashboard");
    return {
      success: true,
      message: `Marked ${validated.transaction_ids.length} transaction(s) as reviewed`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to mark transactions as reviewed";
    return { success: false, error: errorMsg };
  }
}



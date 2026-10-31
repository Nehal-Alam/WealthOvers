"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createTransactionSchema,
  updateTransactionSchema,
  CreateTransactionInput,
  UpdateTransactionInput,
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


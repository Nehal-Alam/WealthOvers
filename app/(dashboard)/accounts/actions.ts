"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createAccountSchema,
  updateAccountSchema,
  transferFundsSchema,
  reconcileAccountSchema,
  CreateAccountInput,
  UpdateAccountInput,
  TransferFundsInput,
  ReconcileAccountInput,
} from "@/lib/validations/accounts";
import { calculateReconciliationAdjustment } from "@/lib/calculations/financial";

export type ActionResult<T = unknown> = {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
};

export async function createAccountAction(input: CreateAccountInput): Promise<ActionResult> {
  try {
    const validated = createAccountSchema.parse(input);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const initBalance = parseFloat(validated.initial_balance);

    const { data, error } = await supabase
      .from("accounts")
      .insert({
        user_id: user.id,
        name: validated.name.trim(),
        account_type: validated.account_type,
        institution_name: validated.institution_name.trim(),
        account_number_masked: validated.account_number_masked?.trim() || null,
        currency: validated.currency,
        initial_balance: initBalance,
        current_balance: initBalance,
        color: validated.color,
        icon: validated.icon,
        is_archived: false,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    return { success: true, message: "Account created successfully", data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to create account";
    return { success: false, error: errorMsg };
  }
}

export async function updateAccountAction(input: UpdateAccountInput): Promise<ActionResult> {
  try {
    const validated = updateAccountSchema.parse(input);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const { data, error } = await supabase
      .from("accounts")
      .update({
        name: validated.name.trim(),
        institution_name: validated.institution_name.trim(),
        account_number_masked: validated.account_number_masked?.trim() || null,
        color: validated.color,
        icon: validated.icon,
        is_archived: validated.is_archived,
      })
      .eq("id", validated.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    return { success: true, message: "Account updated successfully", data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update account";
    return { success: false, error: errorMsg };
  }
}

export async function archiveAccountAction(id: string, isArchived: boolean): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const { error } = await supabase
      .from("accounts")
      .update({ is_archived: isArchived })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    return {
      success: true,
      message: isArchived ? "Account archived" : "Account restored to active",
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update archive status";
    return { success: false, error: errorMsg };
  }
}

export async function deleteAccountAction(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    // Safety guard: Check if account has any existing transactions
    const { count, error: countError } = await supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .or(`account_id.eq.${id},destination_account_id.eq.${id}`);

    if (countError) {
      return { success: false, error: countError.message };
    }

    if (count && count > 0) {
      return {
        success: false,
        error: `Cannot delete account with ${count} historical transaction(s). Please archive it instead to preserve your balance history.`,
      };
    }

    const { error } = await supabase
      .from("accounts")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    return { success: true, message: "Account deleted successfully" };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to delete account";
    return { success: false, error: errorMsg };
  }
}

export async function transferFundsAction(input: TransferFundsInput): Promise<ActionResult> {
  try {
    const validated = transferFundsSchema.parse(input);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    // Verify user owns both source and destination accounts
    const { data: accounts, error: accError } = await supabase
      .from("accounts")
      .select("id, name, currency")
      .eq("user_id", user.id)
      .in("id", [validated.source_account_id, validated.destination_account_id]);

    if (accError || !accounts || accounts.length !== 2) {
      return {
        success: false,
        error: "One or both selected accounts do not exist or are not accessible.",
      };
    }

    const sourceAcc = accounts.find((a) => a.id === validated.source_account_id);
    const destAcc = accounts.find((a) => a.id === validated.destination_account_id);

    const amountNum = parseFloat(validated.amount);
    const desc =
      validated.description?.trim() ||
      `Transfer from ${sourceAcc?.name} to ${destAcc?.name}`;

    // Create single transfer transaction
    // The database trigger sync_account_balance atomically debits source and credits destination
    const { data, error } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        account_id: validated.source_account_id,
        destination_account_id: validated.destination_account_id,
        amount: amountNum,
        currency: sourceAcc?.currency || "INR",
        transaction_type: "transfer",
        transaction_date: new Date(validated.transaction_date).toISOString(),
        description: desc,
        notes: validated.notes?.trim() || null,
        source: "manual",
        is_reviewed: true,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/accounts");
    revalidatePath("/transactions");
    revalidatePath("/dashboard");
    return {
      success: true,
      message: `Successfully transferred funds to ${destAcc?.name}`,
      data,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to execute transfer";
    return { success: false, error: errorMsg };
  }
}

export async function reconcileAccountBalanceAction(
  input: ReconcileAccountInput
): Promise<ActionResult> {
  try {
    const validated = reconcileAccountSchema.parse(input);
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    // Fetch account details
    const { data: account, error: accError } = await supabase
      .from("accounts")
      .select("id, name, currency, current_balance, account_type")
      .eq("id", validated.account_id)
      .eq("user_id", user.id)
      .single();

    if (accError || !account) {
      return { success: false, error: "Account not found or access denied." };
    }

    const { adjustmentType, adjustmentAmount, difference } =
      calculateReconciliationAdjustment(account.current_balance, validated.actual_balance);

    if (adjustmentType === "none") {
      return {
        success: true,
        message: `Account "${account.name}" balance is already in perfect sync with statement (${account.currency} ${validated.actual_balance}).`,
      };
    }

    const isPositiveAdjustment = adjustmentType === "income";
    const sign = isPositiveAdjustment ? "+" : "-";

    const desc = `Reconciliation Adjustment (${sign}${account.currency} ${parseFloat(adjustmentAmount).toFixed(2)})`;
    const notes = validated.notes
      ? `${validated.notes.trim()} | Statement date: ${validated.statement_date}`
      : `Reconciled with statement dated ${validated.statement_date}. Previous system balance: ${account.currency} ${parseFloat(String(account.current_balance)).toFixed(2)}. Target: ${account.currency} ${validated.actual_balance}.`;

    // Insert adjustment transaction
    // The database trigger automatically updates accounts.current_balance to match validated.actual_balance!
    const { data, error } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        account_id: validated.account_id,
        amount: parseFloat(adjustmentAmount),
        currency: account.currency || "INR",
        transaction_type: adjustmentType,
        transaction_date: new Date(validated.statement_date).toISOString(),
        description: desc,
        notes,
        tags: ["reconciliation", "adjustment"],
        source: "manual",
        is_reviewed: true,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/accounts");
    revalidatePath("/transactions");
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    return {
      success: true,
      message: `Account "${account.name}" reconciled successfully. Balance adjusted by ${sign}${account.currency} ${parseFloat(adjustmentAmount).toFixed(2)} to match statement.`,
      data,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to reconcile account balance";
    return { success: false, error: errorMsg };
  }
}



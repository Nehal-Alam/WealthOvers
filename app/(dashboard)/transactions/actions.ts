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
  reverseTransactionSchema,
  CreateTransactionInput,
  UpdateTransactionInput,
  CreateSplitTransactionInput,
  BulkUpdateCategoryInput,
  BulkDeleteTransactionsInput,
  MarkTransactionsReviewedInput,
  ReverseTransactionInput,
} from "@/lib/validations/transactions";
import { FinancialTransactionService } from "@/lib/services/financial-transaction-service";
import { toDecimal } from "@/lib/calculations/financial";
import { Tables } from "@/types/database";

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

    const result = await FinancialTransactionService.createFinancialTransaction(supabase, {
      userId: user.id,
      transactionType: validated.transaction_type,
      transactionSubtype: validated.transaction_subtype || undefined,
      amount: validated.amount,
      currency: validated.currency,
      transactionDate: validated.transaction_date,
      description: validated.description.trim(),
      notes: validated.notes?.trim() || undefined,
      accountId: validated.account_id,
      destinationAccountId: validated.destination_account_id || undefined,
      categoryId: validated.category_id || undefined,
      subcategoryId: validated.subcategory_id || undefined,
      referenceNumber: validated.reference_number?.trim() || undefined,
      merchantOrPerson: validated.merchant_or_person?.trim() || undefined,
      paymentMethod: validated.payment_method?.trim() || undefined,
      investmentId: validated.investment_id || undefined,
      creditCardId: validated.credit_card_id || undefined,
      loanId: validated.loan_id || undefined,
      tags: validated.tags,
      sourceModule: "transactions",
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    revalidatePath("/transactions");
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    revalidatePath("/budgets");
    revalidatePath("/reports");
    revalidatePath("/net-worth");
    return { success: true, message: "Transaction recorded and posted to ledger", data: result.transaction };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to record transaction";
    return { success: false, error: errorMsg };
  }
}

export async function reverseTransactionAction(input: ReverseTransactionInput): Promise<ActionResult> {
  try {
    const validated = reverseTransactionSchema.parse(input);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const result = await FinancialTransactionService.reverseFinancialTransaction(
      supabase,
      validated.transaction_id,
      user.id,
      validated.reason
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    revalidatePath("/transactions");
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    revalidatePath("/net-worth");
    return {
      success: true,
      message: result.message || "Transaction reversed with immutable ledger audit trail",
      data: result.transaction,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to reverse transaction";
    return { success: false, error: errorMsg };
  }
}

export async function getLedgerEntriesAction(
  transactionId: string
): Promise<ActionResult<Tables<"ledger_entries">[]>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const { data, error } = await supabase
      .from("ledger_entries")
      .select("*")
      .eq("transaction_id", transactionId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch ledger entries";
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

    const result = await FinancialTransactionService.updateFinancialTransaction(supabase, {
      transactionId: validated.id,
      userId: user.id,
      amount: validated.amount,
      accountId: validated.account_id,
      destinationAccountId: validated.destination_account_id || null,
      categoryId: validated.category_id || null,
      subcategoryId: validated.subcategory_id || null,
      transactionType: validated.transaction_type,
      transactionDate: validated.transaction_date,
      description: validated.description.trim(),
      notes: validated.notes?.trim() || null,
      referenceNumber: validated.reference_number?.trim() || null,
      tags: validated.tags || [],
    });

    if (!result.success) {
      return { success: false, error: result.error || "Failed to update transaction" };
    }

    revalidatePath("/transactions");
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    revalidatePath("/budgets");
    revalidatePath("/reports");
    revalidatePath("/net-worth");
    return { success: true, message: result.message || "Transaction updated successfully", data: result.transaction };
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

    const result = await FinancialTransactionService.deleteFinancialTransaction(supabase, id, user.id);
    if (!result.success) {
      return { success: false, error: result.error || "Failed to delete transaction" };
    }

    revalidatePath("/transactions");
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    revalidatePath("/budgets");
    revalidatePath("/reports");
    revalidatePath("/net-worth");
    return { success: true, message: result.message || "Transaction deleted and account balance restored successfully" };
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
    const splitGroupId = crypto.randomUUID();
    const createdTransactions = [];

    for (let idx = 0; idx < validated.splits.length; idx++) {
      const s = validated.splits[idx];
      const desc = s.description.trim() || `${validated.parent_description} (Split ${idx + 1}/${validated.splits.length})`;
      const notes = validated.notes
        ? `${validated.notes.trim()} | Split of: ${validated.parent_description}`
        : `Split of: ${validated.parent_description} (Total: ${validated.currency} ${validated.total_amount})`;

      const result = await FinancialTransactionService.createFinancialTransaction(supabase, {
        userId: user.id,
        accountId: validated.account_id,
        amount: s.amount,
        currency: validated.currency,
        transactionType: validated.transaction_type,
        transactionDate: isoDate,
        description: desc,
        notes: notes,
        categoryId: s.category_id || undefined,
        subcategoryId: s.subcategory_id || undefined,
        referenceNumber: validated.reference_number?.trim() || undefined,
        transferGroupId: splitGroupId,
        tags: ["split"],
      });

      if (!result.success) {
        return { success: false, error: `Failed creating split ${idx + 1}: ${result.error}` };
      }
      if (result.transaction) {
        createdTransactions.push(result.transaction);
      }
    }

    revalidatePath("/transactions");
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    revalidatePath("/budgets");
    revalidatePath("/reports");
    revalidatePath("/net-worth");
    return {
      success: true,
      message: `Successfully created ${validated.splits.length} split transactions totaling ${validated.currency} ${validated.total_amount} with balanced double-entry ledger postings`,
      data: createdTransactions,
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



"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createCreditCardSchema,
  createCreditCardStatementSchema,
  recordCreditCardRepaymentSchema,
  CreateCreditCardInput,
  CreateCreditCardStatementInput,
  RecordCreditCardRepaymentInput,
} from "@/lib/validations/credit-cards";
import { toDecimal } from "@/lib/calculations/financial";
import { FinancialTransactionService } from "@/lib/services/financial-transaction-service";

export type ActionResult<T = unknown> = {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
};

export async function createCreditCardAction(input: CreateCreditCardInput): Promise<ActionResult> {
  try {
    const validated = createCreditCardSchema.parse(input);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const limit = parseFloat(validated.credit_limit);
    const outstanding = parseFloat(validated.current_outstanding || "0");

    let linkedAccountId = validated.account_id;

    // If no existing credit account selected, auto-create underlying account
    if (!linkedAccountId) {
      const { data: newAcc, error: newAccErr } = await supabase
        .from("accounts")
        .insert({
          user_id: user.id,
          name: `${validated.issuer_name.trim()} ${validated.card_name.trim()} (..${validated.last_four_digits})`,
          account_type: "credit_card",
          current_balance: -outstanding,
          initial_balance: 0,
          currency: "INR",
          institution_name: validated.issuer_name.trim(),
          account_number_masked: `•••• ${validated.last_four_digits}`,
          is_archived: false,
        })
        .select("id")
        .single();

      if (newAccErr || !newAcc) {
        return { success: false, error: newAccErr?.message || "Failed to create underlying card account" };
      }
      linkedAccountId = newAcc.id;
    }

    const { data, error } = await supabase
      .from("credit_cards")
      .insert({
        user_id: user.id,
        account_id: linkedAccountId,
        card_name: validated.card_name.trim(),
        issuer_name: validated.issuer_name.trim(),
        last_four_digits: validated.last_four_digits,
        credit_limit: limit,
        current_outstanding: outstanding,
        statement_date_day: validated.statement_date_day,
        payment_due_day: validated.payment_due_day,
        apr_percentage: validated.apr_percentage,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: "A credit card is already registered for this account." };
      }
      return { success: false, error: error.message };
    }

    revalidatePath("/credit-cards");
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    return { success: true, message: "Credit card registered successfully", data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to register card";
    return { success: false, error: errorMsg };
  }
}

export async function createCreditCardStatementAction(
  input: CreateCreditCardStatementInput
): Promise<ActionResult> {
  try {
    const validated = createCreditCardStatementSchema.parse(input);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const { data, error } = await supabase
      .from("credit_card_statements")
      .insert({
        credit_card_id: validated.credit_card_id,
        user_id: user.id,
        statement_period_start: validated.statement_period_start,
        statement_period_end: validated.statement_period_end,
        total_due: parseFloat(validated.total_due),
        minimum_due: parseFloat(validated.minimum_due),
        due_date: validated.due_date,
        is_settled: validated.is_settled,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/credit-cards");
    return { success: true, message: "Statement added", data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to add statement";
    return { success: false, error: errorMsg };
  }
}

export async function settleCreditCardStatementAction(
  statementId: string,
  isSettled: boolean
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const { error } = await supabase
      .from("credit_card_statements")
      .update({ is_settled: isSettled })
      .eq("id", statementId)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/credit-cards");
    return { success: true, message: isSettled ? "Statement marked settled" : "Statement unsettled" };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update statement";
    return { success: false, error: errorMsg };
  }
}

export async function recordCreditCardRepaymentAction(
  input: RecordCreditCardRepaymentInput
): Promise<ActionResult> {
  try {
    const validated = recordCreditCardRepaymentSchema.parse(input);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    // 1. Fetch card
    const { data: card, error: cardErr } = await supabase
      .from("credit_cards")
      .select("id, card_name, issuer_name, account_id, current_outstanding")
      .eq("id", validated.credit_card_id)
      .eq("user_id", user.id)
      .single();

    if (cardErr || !card) {
      return { success: false, error: "Credit card not found" };
    }

    // 2. Fetch paying account
    const { data: payingAccount, error: accErr } = await supabase
      .from("accounts")
      .select("id, name, current_balance, currency")
      .eq("id", validated.paying_account_id)
      .eq("user_id", user.id)
      .single();

    if (accErr || !payingAccount) {
      return { success: false, error: "Paying account not found" };
    }

    const repayAmt = toDecimal(validated.amount);
    const idempotencyKey = `cc_repay_${user.id}_${card.id}_${Date.now()}`;

    const result = await FinancialTransactionService.createFinancialTransaction(supabase, {
      userId: user.id,
      transactionType: "credit_card_repayment",
      amount: repayAmt.toNumber(),
      currency: payingAccount.currency || "INR",
      transactionDate: validated.payment_date,
      description: `Credit Card Repayment: ${card.issuer_name} ${card.card_name}`,
      notes: validated.notes?.trim() || undefined,
      accountId: payingAccount.id,
      destinationAccountId: card.account_id || undefined,
      creditCardId: card.id,
      idempotencyHash: idempotencyKey,
      sourceModule: "credit_cards",
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Also update linked card account if present (balance becomes less negative)
    if (card.account_id) {
      const { data: cardAcc } = await supabase
        .from("accounts")
        .select("current_balance")
        .eq("id", card.account_id)
        .eq("user_id", user.id)
        .single();

      if (cardAcc) {
        const newCardBal = toDecimal(cardAcc.current_balance).plus(repayAmt);
        await supabase
          .from("accounts")
          .update({
            current_balance: newCardBal.toNumber(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", card.account_id)
          .eq("user_id", user.id);
      }
    }

    revalidatePath("/credit-cards");
    revalidatePath("/accounts");
    revalidatePath("/net-worth");
    revalidatePath("/dashboard");
    revalidatePath("/transactions");
    revalidatePath("/reports");

    return {
      success: true,
      message: `Repayment of ₹${repayAmt.toString()} recorded and posted to unified ledger`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to record card repayment";
    return { success: false, error: errorMsg };
  }
}


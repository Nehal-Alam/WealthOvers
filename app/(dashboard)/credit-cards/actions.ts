"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createCreditCardSchema,
  createCreditCardStatementSchema,
  CreateCreditCardInput,
  CreateCreditCardStatementInput,
} from "@/lib/validations/credit-cards";

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

    const { data, error } = await supabase
      .from("credit_cards")
      .insert({
        user_id: user.id,
        account_id: validated.account_id,
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


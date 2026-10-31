"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createInvestmentSchema,
  updateInvestmentPriceSchema,
  recordInvestmentTransactionSchema,
  CreateInvestmentInput,
  UpdateInvestmentPriceInput,
  RecordInvestmentTransactionInput,
} from "@/lib/validations/investments";
import { toDecimal } from "@/lib/calculations/financial";

export type ActionResult<T = unknown> = {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
};

export async function createInvestmentAction(input: CreateInvestmentInput): Promise<ActionResult> {
  try {
    const validated = createInvestmentSchema.parse(input);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const qty = toDecimal(validated.total_quantity);
    const avg = toDecimal(validated.average_buy_price);
    const cur = toDecimal(validated.current_nav_or_price);

    const invested = qty.times(avg);
    const valuation = qty.times(cur);

    const { data, error } = await supabase
      .from("investments")
      .insert({
        user_id: user.id,
        account_id: validated.account_id || null,
        name: validated.name.trim(),
        symbol: validated.symbol?.trim() || null,
        asset_type: validated.asset_type,
        broker_name: validated.broker_name.trim(),
        currency: validated.currency.toUpperCase(),
        total_quantity: qty.toNumber(),
        average_buy_price: avg.toNumber(),
        total_invested_amount: invested.toNumber(),
        current_nav_or_price: cur.toNumber(),
        current_valuation: valuation.toNumber(),
        last_price_update_at: new Date().toISOString(),
        notes: validated.notes?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/investments");
    revalidatePath("/net-worth");
    revalidatePath("/dashboard");
    return { success: true, message: "Asset added to portfolio", data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to add investment";
    return { success: false, error: errorMsg };
  }
}

export async function updateInvestmentPriceAction(input: UpdateInvestmentPriceInput): Promise<ActionResult> {
  try {
    const validated = updateInvestmentPriceSchema.parse(input);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    // Fetch existing investment to get quantity
    const { data: investment, error: fetchError } = await supabase
      .from("investments")
      .select("total_quantity")
      .eq("id", validated.id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !investment) {
      return { success: false, error: "Investment not found" };
    }

    const qty = toDecimal(investment.total_quantity);
    const newPrice = toDecimal(validated.current_nav_or_price);
    const newValuation = qty.times(newPrice);

    const { data, error } = await supabase
      .from("investments")
      .update({
        current_nav_or_price: newPrice.toNumber(),
        current_valuation: newValuation.toNumber(),
        last_price_update_at: new Date().toISOString(),
      })
      .eq("id", validated.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/investments");
    revalidatePath("/net-worth");
    revalidatePath("/dashboard");
    return { success: true, message: "Market price and valuation updated", data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update price";
    return { success: false, error: errorMsg };
  }
}

export async function recordInvestmentTransactionAction(
  input: RecordInvestmentTransactionInput
): Promise<ActionResult> {
  try {
    const validated = recordInvestmentTransactionSchema.parse(input);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const qty = toDecimal(validated.quantity);
    const unitPrice = toDecimal(validated.unit_price);
    const fees = toDecimal(validated.fees_and_taxes);
    const total = qty.times(unitPrice).plus(fees);

    // 1. Insert transaction
    const { error: txError } = await supabase.from("investment_transactions").insert({
      investment_id: validated.investment_id,
      user_id: user.id,
      transaction_type: validated.transaction_type,
      transaction_date: new Date(validated.transaction_date).toISOString(),
      quantity: qty.toNumber(),
      unit_price: unitPrice.toNumber(),
      fees_and_taxes: fees.toNumber(),
      total_amount: total.toNumber(),
      notes: validated.notes?.trim() || null,
    });

    if (txError) {
      return { success: false, error: txError.message };
    }

    // 2. Adjust holding quantity and valuation
    const { data: holding } = await supabase
      .from("investments")
      .select("total_quantity, total_invested_amount, current_nav_or_price")
      .eq("id", validated.investment_id)
      .eq("user_id", user.id)
      .single();

    if (holding) {
      const curQty = toDecimal(holding.total_quantity);
      const curInvested = toDecimal(holding.total_invested_amount);
      const curPrice = toDecimal(holding.current_nav_or_price);

      let newQty = curQty;
      let newInvested = curInvested;

      if (validated.transaction_type === "buy") {
        newQty = curQty.plus(qty);
        newInvested = curInvested.plus(total);
      } else if (validated.transaction_type === "sell") {
        newQty = curQty.minus(qty).clamp(0, Infinity);
        const avg = curQty.isZero() ? toDecimal(0) : curInvested.dividedBy(curQty);
        newInvested = newQty.times(avg);
      }

      const newAvgBuy = newQty.isZero() ? 0 : newInvested.dividedBy(newQty).toNumber();
      const newValuation = newQty.times(curPrice).toNumber();

      await supabase
        .from("investments")
        .update({
          total_quantity: newQty.toNumber(),
          total_invested_amount: newInvested.toNumber(),
          average_buy_price: newAvgBuy,
          current_valuation: newValuation,
        })
        .eq("id", validated.investment_id)
        .eq("user_id", user.id);
    }

    revalidatePath("/investments");
    revalidatePath("/net-worth");
    return { success: true, message: "Transaction recorded successfully" };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to record transaction";
    return { success: false, error: errorMsg };
  }
}

export async function deleteInvestmentAction(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const { error } = await supabase
      .from("investments")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/investments");
    revalidatePath("/net-worth");
    return { success: true, message: "Investment holding removed" };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to delete investment";
    return { success: false, error: errorMsg };
  }
}

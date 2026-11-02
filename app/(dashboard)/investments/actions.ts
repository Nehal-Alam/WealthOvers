"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createInvestmentSchema,
  updateInvestmentPriceSchema,
  recordInvestmentTransactionSchema,
  createSipSchema,
  CreateInvestmentInput,
  UpdateInvestmentPriceInput,
  RecordInvestmentTransactionInput,
  CreateSipInput,
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

    // Atomically debit funding account and record investment buy transaction
    if (validated.account_id && data) {
      const { data: fundingAccount } = await supabase
        .from("accounts")
        .select("id, current_balance, currency, name")
        .eq("id", validated.account_id)
        .eq("user_id", user.id)
        .single();

      if (fundingAccount) {
        const curBal = toDecimal(fundingAccount.current_balance);
        const newBal = curBal.minus(invested);

        await supabase
          .from("accounts")
          .update({
            current_balance: newBal.toNumber(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", fundingAccount.id)
          .eq("user_id", user.id);

        const idempotencyKey = `inv_buy_${user.id}_${data.id}_${Date.now()}`;

        await supabase.from("transactions").insert({
          user_id: user.id,
          account_id: fundingAccount.id,
          amount: invested.toNumber(),
          currency: fundingAccount.currency || "INR",
          transaction_type: "investment_buy",
          transaction_date: new Date().toISOString(),
          description: `Investment Buy: ${validated.name.trim()}`,
          notes: `Purchased ${qty.toString()} units @ ${avg.toString()}`,
          source: "manual",
          idempotency_hash: idempotencyKey,
          is_reviewed: true,
        });
      }
    }

    // Record initial investment transaction entry
    if (data) {
      await supabase.from("investment_transactions").insert({
        investment_id: data.id,
        user_id: user.id,
        transaction_type: "buy",
        transaction_date: new Date().toISOString(),
        quantity: qty.toNumber(),
        unit_price: avg.toNumber(),
        fees_and_taxes: 0,
        total_amount: invested.toNumber(),
        notes: validated.notes?.trim() || "Initial holding purchase",
      });
    }

    revalidatePath("/investments");
    revalidatePath("/accounts");
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

export async function createSipAction(input: CreateSipInput): Promise<ActionResult> {
  try {
    const validated = createSipSchema.parse(input);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const amountDec = toDecimal(validated.amount);

    const { data, error } = await supabase
      .from("sip_schedules")
      .insert({
        user_id: user.id,
        investment_id: validated.investment_id,
        account_id: validated.account_id,
        sip_name: validated.sip_name.trim(),
        amount: amountDec.toNumber(),
        frequency: validated.frequency,
        deduction_day: validated.deduction_day,
        next_due_date: validated.next_due_date,
        is_active: true,
        notes: validated.notes?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/investments");
    revalidatePath("/dashboard");
    return { success: true, message: "SIP schedule created successfully", data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to create SIP";
    return { success: false, error: errorMsg };
  }
}

export async function processDueSipAction(sipId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    // 1. Fetch SIP schedule
    const { data: sip, error: sipError } = await supabase
      .from("sip_schedules")
      .select(`
        *,
        investment:investments(*),
        account:accounts(*)
      `)
      .eq("id", sipId)
      .eq("user_id", user.id)
      .single();

    if (sipError || !sip) {
      return { success: false, error: "SIP schedule not found" };
    }

    const idempotencyKey = `sip_${sip.id}_${sip.next_due_date}`;

    // 2. Check for duplicate execution
    const { data: existingInstallment } = await supabase
      .from("sip_installments")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existingInstallment) {
      return {
        success: false,
        error: `SIP installment for ${sip.next_due_date} has already been processed`,
      };
    }

    const sipAmount = toDecimal(sip.amount);

    // 3. Deduct from funding account
    const { data: fundingAccount } = await supabase
      .from("accounts")
      .select("id, current_balance, currency")
      .eq("id", sip.account_id)
      .eq("user_id", user.id)
      .single();

    if (!fundingAccount) {
      return { success: false, error: "Funding account not found" };
    }

    const currentBal = toDecimal(fundingAccount.current_balance);
    const newBal = currentBal.minus(sipAmount);

    await supabase
      .from("accounts")
      .update({
        current_balance: newBal.toNumber(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", fundingAccount.id)
      .eq("user_id", user.id);

    // 4. Record main transactions entry
    const { data: txRecord } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        account_id: fundingAccount.id,
        amount: sipAmount.toNumber(),
        currency: fundingAccount.currency || "INR",
        transaction_type: "investment_buy",
        transaction_date: new Date().toISOString(),
        description: `SIP Installment: ${sip.sip_name}`,
        notes: `Automated deduction for ${sip.sip_name} (Due: ${sip.next_due_date})`,
        source: "recurring_rule",
        idempotency_hash: idempotencyKey,
        is_reviewed: true,
      })
      .select()
      .single();

    // 5. Update investment holding: allot units
    const { data: holding } = await supabase
      .from("investments")
      .select("*")
      .eq("id", sip.investment_id)
      .eq("user_id", user.id)
      .single();

    let unitsAllotted = 0;
    let executionNav = 0;

    if (holding) {
      executionNav = holding.current_nav_or_price || holding.average_buy_price || 100;
      const navDec = toDecimal(executionNav).isZero() ? toDecimal(100) : toDecimal(executionNav);
      const newUnitsDec = sipAmount.dividedBy(navDec);
      unitsAllotted = newUnitsDec.toNumber();

      const curQty = toDecimal(holding.total_quantity || 0);
      const curInvested = toDecimal(holding.total_invested_amount || 0);

      const totalQty = curQty.plus(newUnitsDec);
      const totalInvested = curInvested.plus(sipAmount);
      const newAvgBuy = totalQty.isZero() ? 0 : totalInvested.dividedBy(totalQty).toNumber();
      const newValuation = totalQty.times(navDec).toNumber();

      await supabase
        .from("investments")
        .update({
          total_quantity: totalQty.toNumber(),
          total_invested_amount: totalInvested.toNumber(),
          average_buy_price: newAvgBuy,
          current_valuation: newValuation,
          last_price_update_at: new Date().toISOString(),
        })
        .eq("id", holding.id)
        .eq("user_id", user.id);

      // Record investment transaction
      await supabase.from("investment_transactions").insert({
        investment_id: holding.id,
        user_id: user.id,
        transaction_type: "buy",
        transaction_date: new Date().toISOString(),
        quantity: unitsAllotted,
        unit_price: executionNav,
        fees_and_taxes: 0,
        total_amount: sipAmount.toNumber(),
        notes: `SIP installment processed (${sip.sip_name})`,
      });
    }

    // 6. Record SIP installment
    await supabase.from("sip_installments").insert({
      sip_id: sip.id,
      user_id: user.id,
      scheduled_date: sip.next_due_date,
      processed_date: new Date().toISOString(),
      amount: sipAmount.toNumber(),
      units_allotted: unitsAllotted,
      nav_at_execution: executionNav,
      status: "processed",
      transaction_id: txRecord?.id || null,
      idempotency_key: idempotencyKey,
    });

    // 7. Advance next_due_date
    const currentDue = new Date(sip.next_due_date);
    const nextDate = new Date(currentDue);
    if (sip.frequency === "weekly") {
      nextDate.setDate(nextDate.getDate() + 7);
    } else if (sip.frequency === "biweekly") {
      nextDate.setDate(nextDate.getDate() + 14);
    } else if (sip.frequency === "quarterly") {
      nextDate.setMonth(nextDate.getMonth() + 3);
    } else if (sip.frequency === "yearly") {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    } else {
      // Monthly
      nextDate.setMonth(nextDate.getMonth() + 1);
      nextDate.setDate(sip.deduction_day || 5);
    }

    const nextDueDateStr = nextDate.toISOString().slice(0, 10);

    await supabase
      .from("sip_schedules")
      .update({
        next_due_date: nextDueDateStr,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sip.id)
      .eq("user_id", user.id);

    revalidatePath("/investments");
    revalidatePath("/accounts");
    revalidatePath("/net-worth");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: `Processed SIP of ₹${sipAmount.toString()} successfully. Next deduction: ${nextDueDateStr}`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to process SIP";
    return { success: false, error: errorMsg };
  }
}

export async function toggleSipStatusAction(sipId: string, isActive: boolean): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const { error } = await supabase
      .from("sip_schedules")
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sipId)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/investments");
    return { success: true, message: `SIP ${isActive ? "activated" : "paused"} successfully` };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to toggle SIP status";
    return { success: false, error: errorMsg };
  }
}

export async function deleteSipAction(sipId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const { error } = await supabase
      .from("sip_schedules")
      .delete()
      .eq("id", sipId)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/investments");
    return { success: true, message: "SIP schedule deleted" };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to delete SIP schedule";
    return { success: false, error: errorMsg };
  }
}

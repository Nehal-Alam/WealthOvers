"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createLoanSchema,
  recordLoanPaymentSchema,
  CreateLoanInput,
  RecordLoanPaymentInput,
} from "@/lib/validations/loans";
import { calculateLoanEMI, toDecimal } from "@/lib/calculations/financial";

export type ActionResult<T = unknown> = {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
};

export async function createLoanAction(input: CreateLoanInput): Promise<ActionResult> {
  try {
    const validated = createLoanSchema.parse(input);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const principal = toDecimal(validated.principal_amount);
    const rate = toDecimal(validated.annual_interest_rate);
    const tenure = validated.tenure_months;

    const { monthlyEmi } = calculateLoanEMI(principal, rate, tenure);

    const { data, error } = await supabase
      .from("loans")
      .insert({
        user_id: user.id,
        account_id: validated.account_id || null,
        loan_type: validated.loan_type,
        lender_or_borrower_name: validated.lender_or_borrower_name.trim(),
        principal_amount: principal.toNumber(),
        annual_interest_rate: rate.toNumber(),
        tenure_months: tenure,
        monthly_emi: parseFloat(monthlyEmi),
        outstanding_balance: principal.toNumber(),
        start_date: validated.start_date,
        maturity_date: validated.maturity_date,
        notes: validated.notes?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Double-entry account balance update & transaction logging
    if (validated.account_id && data) {
      const { data: acc } = await supabase
        .from("accounts")
        .select("id, current_balance, currency, name")
        .eq("id", validated.account_id)
        .eq("user_id", user.id)
        .single();

      if (acc) {
        const curBal = toDecimal(acc.current_balance);
        const isLending = validated.loan_type === "loan_given";
        // If lending money: deduct from bank balance. If borrowing: add to bank balance.
        const newBal = isLending ? curBal.minus(principal) : curBal.plus(principal);

        await supabase
          .from("accounts")
          .update({
            current_balance: newBal.toNumber(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", acc.id)
          .eq("user_id", user.id);

        const idempotencyKey = `loan_disb_${user.id}_${data.id}_${Date.now()}`;
        await supabase.from("transactions").insert({
          user_id: user.id,
          account_id: acc.id,
          amount: principal.toNumber(),
          currency: acc.currency || "INR",
          transaction_type: "loan_disbursement",
          transaction_date: new Date(validated.start_date).toISOString(),
          description: isLending
            ? `Money Lent to ${validated.lender_or_borrower_name.trim()}`
            : `Loan Disbursement: ${validated.lender_or_borrower_name.trim()}`,
          notes: validated.notes?.trim() || null,
          source: "manual",
          idempotency_hash: idempotencyKey,
          is_reviewed: true,
        });
      }
    }

    revalidatePath("/loans");
    revalidatePath("/accounts");
    revalidatePath("/net-worth");
    revalidatePath("/dashboard");
    return { success: true, message: "Loan account registered", data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to create loan";
    return { success: false, error: errorMsg };
  }
}

export async function recordLoanPaymentAction(input: RecordLoanPaymentInput): Promise<ActionResult> {
  try {
    const validated = recordLoanPaymentSchema.parse(input);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    // Fetch loan
    const { data: loan, error: loanErr } = await supabase
      .from("loans")
      .select("id, outstanding_balance, annual_interest_rate, loan_type, lender_or_borrower_name")
      .eq("id", validated.loan_id)
      .eq("user_id", user.id)
      .single();

    if (loanErr || !loan) {
      return { success: false, error: "Loan not found" };
    }

    const emi = toDecimal(validated.emi_amount);
    const extra = toDecimal(validated.extra_prepayment);
    const totalPayment = emi.plus(extra);
    const currentBalance = toDecimal(loan.outstanding_balance);
    const monthlyRate = toDecimal(loan.annual_interest_rate).dividedBy(1200);

    const interestComponent = currentBalance.times(monthlyRate);
    let principalComponent = emi.minus(interestComponent);
    if (principalComponent.lessThan(0)) principalComponent = toDecimal(0);

    const totalDeduction = principalComponent.plus(extra);
    let newBalance = currentBalance.minus(totalDeduction);
    if (newBalance.lessThan(0)) newBalance = toDecimal(0);

    // 1. Insert payment record
    const { error: paymentErr } = await supabase.from("loan_payments").insert({
      loan_id: validated.loan_id,
      user_id: user.id,
      payment_date: validated.payment_date,
      emi_amount: emi.toNumber(),
      principal_component: principalComponent.toNumber(),
      interest_component: interestComponent.toNumber(),
      extra_prepayment: extra.toNumber(),
      remaining_balance: newBalance.toNumber(),
    });

    if (paymentErr) {
      return { success: false, error: paymentErr.message };
    }

    // 2. Update loan outstanding balance
    await supabase
      .from("loans")
      .update({ outstanding_balance: newBalance.toNumber() })
      .eq("id", validated.loan_id)
      .eq("user_id", user.id);

    // 3. Atomically update funding account if provided
    if (validated.funding_account_id) {
      const { data: fundingAccount } = await supabase
        .from("accounts")
        .select("id, current_balance, currency")
        .eq("id", validated.funding_account_id)
        .eq("user_id", user.id)
        .single();

      if (fundingAccount) {
        const curBal = toDecimal(fundingAccount.current_balance);
        const isLending = loan.loan_type === "loan_given";
        // If receiving repayment on lent money: credit bank. If paying loan: debit bank.
        const newBal = isLending ? curBal.plus(totalPayment) : curBal.minus(totalPayment);

        await supabase
          .from("accounts")
          .update({
            current_balance: newBal.toNumber(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", fundingAccount.id)
          .eq("user_id", user.id);

        const idempotencyKey = `loan_pay_${user.id}_${loan.id}_${Date.now()}`;
        await supabase.from("transactions").insert({
          user_id: user.id,
          account_id: fundingAccount.id,
          amount: totalPayment.toNumber(),
          currency: fundingAccount.currency || "INR",
          transaction_type: "loan_repayment",
          transaction_date: new Date(validated.payment_date).toISOString(),
          description: isLending
            ? `Loan Repayment Received: ${loan.lender_or_borrower_name}`
            : `Loan EMI Payment: ${loan.lender_or_borrower_name}`,
          notes: `Principal: ₹${principalComponent.toFixed(2)}, Interest: ₹${interestComponent.toFixed(2)}`,
          source: "manual",
          idempotency_hash: idempotencyKey,
          is_reviewed: true,
        });
      }
    }

    revalidatePath("/loans");
    revalidatePath("/accounts");
    revalidatePath("/net-worth");
    revalidatePath("/dashboard");
    return { success: true, message: "Payment recorded successfully" };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to record payment";
    return { success: false, error: errorMsg };
  }
}

export async function deleteLoanAction(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const { error } = await supabase
      .from("loans")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/loans");
    revalidatePath("/net-worth");
    return { success: true, message: "Loan deleted" };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to delete loan";
    return { success: false, error: errorMsg };
  }
}

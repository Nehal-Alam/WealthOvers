"use server";

import { revalidatePath } from "next/cache";
import Decimal from "decimal.js";
import { createClient } from "@/lib/supabase/server";
import {
  createLoanSchema,
  recordLoanPaymentSchema,
  updateLoanSchema,
  updateLoanPaymentSchema,
  CreateLoanInput,
  RecordLoanPaymentInput,
  UpdateLoanInput,
  UpdateLoanPaymentInput,
} from "@/lib/validations/loans";
import { calculateLoanEMI, toDecimal } from "@/lib/calculations/financial";
import { FinancialTransactionService } from "@/lib/services/financial-transaction-service";

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

    // Double-entry account balance update & unified transaction logging
    if (validated.account_id && data) {
      const isLending = validated.loan_type === "loan_given";
      const idempotencyKey = `loan_disb_${user.id}_${data.id}_${Date.now()}`;

      await FinancialTransactionService.createFinancialTransaction(supabase, {
        userId: user.id,
        transactionType: isLending ? "lending" : "borrowing",
        transactionSubtype: isLending ? "lending" : "borrowing",
        amount: principal.toNumber(),
        transactionDate: validated.start_date,
        description: isLending
          ? `Money Lent to ${validated.lender_or_borrower_name.trim()}`
          : `Loan Disbursement: ${validated.lender_or_borrower_name.trim()}`,
        notes: validated.notes?.trim() || undefined,
        accountId: validated.account_id,
        loanId: data.id,
        merchantOrPerson: validated.lender_or_borrower_name.trim(),
        idempotencyHash: idempotencyKey,
        sourceModule: "loans",
      });
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
    const { data: newPayment, error: paymentErr } = await supabase
      .from("loan_payments")
      .insert({
        loan_id: validated.loan_id,
        user_id: user.id,
        payment_date: validated.payment_date,
        emi_amount: emi.toNumber(),
        principal_component: principalComponent.toNumber(),
        interest_component: interestComponent.toNumber(),
        extra_prepayment: extra.toNumber(),
        remaining_balance: newBalance.toNumber(),
      })
      .select()
      .single();

    if (paymentErr) {
      return { success: false, error: paymentErr.message };
    }

    // 2. Update loan outstanding balance
    await supabase
      .from("loans")
      .update({ outstanding_balance: newBalance.toNumber() })
      .eq("id", validated.loan_id)
      .eq("user_id", user.id);

    // 3. Post unified transaction and ledger entry if funding account provided
    if (validated.funding_account_id) {
      const isLending = loan.loan_type === "loan_given";
      const idempotencyKey = `loan_pay_${user.id}_${loan.id}_${Date.now()}`;

      await FinancialTransactionService.createFinancialTransaction(supabase, {
        userId: user.id,
        transactionType: isLending ? "lending_collection" : "borrowing_repayment",
        transactionSubtype: isLending ? "collection" : "emi_repayment",
        amount: totalPayment.toNumber(),
        principalAmount: principalComponent.plus(extra).toNumber(),
        interestAmount: interestComponent.toNumber(),
        extraPrepayment: extra.toNumber(),
        transactionDate: validated.payment_date,
        description: isLending
          ? `Loan Repayment Received: ${loan.lender_or_borrower_name}`
          : `Loan EMI Payment: ${loan.lender_or_borrower_name}`,
        notes: `Principal: ₹${principalComponent.toFixed(2)}, Interest: ₹${interestComponent.toFixed(2)}${
          extra.greaterThan(0) ? `, Prepayment: ₹${extra.toFixed(2)}` : ""
        }`,
        accountId: validated.funding_account_id,
        loanId: loan.id,
        loanPaymentId: newPayment?.id,
        merchantOrPerson: loan.lender_or_borrower_name,
        idempotencyHash: idempotencyKey,
        sourceModule: "loans",
      });
    }

    revalidatePath("/loans");
    revalidatePath("/accounts");
    revalidatePath("/net-worth");
    revalidatePath("/dashboard");
    revalidatePath("/transactions");
    return { success: true, message: "Payment recorded and posted to ledger successfully" };
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

export async function updateLoanAction(input: UpdateLoanInput): Promise<ActionResult> {
  try {
    const validated = updateLoanSchema.parse(input);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const { data: existingLoan, error: fetchErr } = await supabase
      .from("loans")
      .select("*, payments:loan_payments(principal_component, extra_prepayment)")
      .eq("id", validated.id)
      .eq("user_id", user.id)
      .single();

    if (fetchErr || !existingLoan) {
      return { success: false, error: "Loan not found" };
    }

    const principal = toDecimal(validated.principal_amount);
    const rate = toDecimal(validated.annual_interest_rate);
    const tenure = validated.tenure_months;

    const { monthlyEmi } = calculateLoanEMI(principal, rate, tenure);

    // Calculate outstanding balance:
    // If explicitly provided by user, use that. Otherwise, principal minus all principal repaid.
    let newOutstanding: Decimal;
    if (validated.outstanding_balance !== undefined && validated.outstanding_balance !== null) {
      newOutstanding = toDecimal(validated.outstanding_balance);
    } else {
      const payments = existingLoan.payments || [];
      let totalPrincipalPaid = toDecimal(0);
      for (const p of payments) {
        totalPrincipalPaid = totalPrincipalPaid.plus(p.principal_component || 0).plus(p.extra_prepayment || 0);
      }
      newOutstanding = Decimal.max(0, principal.minus(totalPrincipalPaid));
    }

    const { data, error } = await supabase
      .from("loans")
      .update({
        lender_or_borrower_name: validated.lender_or_borrower_name.trim(),
        loan_type: validated.loan_type,
        principal_amount: principal.toNumber(),
        outstanding_balance: newOutstanding.toNumber(),
        annual_interest_rate: rate.toNumber(),
        tenure_months: tenure,
        monthly_emi: parseFloat(monthlyEmi),
        start_date: validated.start_date,
        maturity_date: validated.maturity_date,
        account_id: validated.account_id || null,
        notes: validated.notes?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", validated.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/loans");
    revalidatePath("/accounts");
    revalidatePath("/net-worth");
    revalidatePath("/dashboard");
    return { success: true, message: "Loan details updated successfully", data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update loan";
    return { success: false, error: errorMsg };
  }
}

export async function updateLoanPaymentAction(input: UpdateLoanPaymentInput): Promise<ActionResult> {
  try {
    const validated = updateLoanPaymentSchema.parse(input);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    // 1. Fetch existing payment
    const { data: oldPayment, error: paymentErr } = await supabase
      .from("loan_payments")
      .select("*")
      .eq("id", validated.payment_id)
      .eq("user_id", user.id)
      .single();

    if (paymentErr || !oldPayment) {
      return { success: false, error: "Payment record not found" };
    }

    // 2. Fetch loan
    const { data: loan, error: loanErr } = await supabase
      .from("loans")
      .select("id, outstanding_balance, annual_interest_rate, loan_type, lender_or_borrower_name")
      .eq("id", validated.loan_id)
      .eq("user_id", user.id)
      .single();

    if (loanErr || !loan) {
      return { success: false, error: "Loan not found" };
    }

    const newEmi = toDecimal(validated.emi_amount);
    const newExtra = toDecimal(validated.extra_prepayment);
    const newTotalPaid = newEmi.plus(newExtra);

    const oldPrincipalReduction = toDecimal(oldPayment.principal_component).plus(oldPayment.extra_prepayment);
    const priorBalance = toDecimal(oldPayment.remaining_balance).plus(oldPrincipalReduction);

    const monthlyRate = toDecimal(loan.annual_interest_rate).dividedBy(1200);
    const interestComponent = priorBalance.times(monthlyRate);
    let newPrincipalComponent = newEmi.minus(interestComponent);
    if (newPrincipalComponent.lessThan(0)) newPrincipalComponent = toDecimal(0);

    const newTotalPrincipalReduction = newPrincipalComponent.plus(newExtra);
    let newRemainingBalance = priorBalance.minus(newTotalPrincipalReduction);
    if (newRemainingBalance.lessThan(0)) newRemainingBalance = toDecimal(0);

    // Difference in loan outstanding balance
    const diffPrincipalReduction = newTotalPrincipalReduction.minus(oldPrincipalReduction);
    let newLoanOutstanding = toDecimal(loan.outstanding_balance).minus(diffPrincipalReduction);
    if (newLoanOutstanding.lessThan(0)) newLoanOutstanding = toDecimal(0);

    // 3. Update loan_payments row
    const { error: updatePaymentErr } = await supabase
      .from("loan_payments")
      .update({
        payment_date: validated.payment_date,
        emi_amount: newEmi.toNumber(),
        principal_component: newPrincipalComponent.toNumber(),
        interest_component: interestComponent.toNumber(),
        extra_prepayment: newExtra.toNumber(),
        remaining_balance: newRemainingBalance.toNumber(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", validated.payment_id)
      .eq("user_id", user.id);

    if (updatePaymentErr) {
      return { success: false, error: updatePaymentErr.message };
    }

    // 4. Update loan outstanding balance
    await supabase
      .from("loans")
      .update({
        outstanding_balance: newLoanOutstanding.toNumber(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", validated.loan_id)
      .eq("user_id", user.id);

    // 5. Update linked transaction if it exists
    const { data: linkedTxn } = await supabase
      .from("transactions")
      .select("id, account_id")
      .eq("loan_payment_id", validated.payment_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (linkedTxn) {
      await supabase
        .from("transactions")
        .update({
          amount: newTotalPaid.toNumber(),
          transaction_date: validated.payment_date,
          account_id: validated.funding_account_id || linkedTxn.account_id,
          notes: `Principal: ₹${newPrincipalComponent.toFixed(2)}, Interest: ₹${interestComponent.toFixed(2)}${
            newExtra.greaterThan(0) ? `, Prepayment: ₹${newExtra.toFixed(2)}` : ""
          }`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", linkedTxn.id);
    }

    // 6. If funding account provided, adjust account balance by the difference
    const fundingAccId = validated.funding_account_id || linkedTxn?.account_id;
    if (fundingAccId) {
      const oldTotalPaid = toDecimal(oldPayment.emi_amount).plus(oldPayment.extra_prepayment);
      const diffCash = newTotalPaid.minus(oldTotalPaid);

      if (!diffCash.isZero()) {
        const { data: fundingAccount } = await supabase
          .from("accounts")
          .select("id, current_balance")
          .eq("id", fundingAccId)
          .eq("user_id", user.id)
          .single();

        if (fundingAccount) {
          const curBal = toDecimal(fundingAccount.current_balance);
          const isLending = loan.loan_type === "loan_given";
          // If paying loan: extra payment debits bank (minus). If lending: extra payment credits bank (plus).
          const newBal = isLending ? curBal.plus(diffCash) : curBal.minus(diffCash);

          await supabase
            .from("accounts")
            .update({
              current_balance: newBal.toNumber(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", fundingAccount.id)
            .eq("user_id", user.id);
        }
      }
    }

    revalidatePath("/loans");
    revalidatePath("/accounts");
    revalidatePath("/net-worth");
    revalidatePath("/dashboard");
    revalidatePath("/transactions");
    return { success: true, message: "Loan repayment details updated successfully" };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update payment";
    return { success: false, error: errorMsg };
  }
}

export async function deleteLoanPaymentAction(paymentId: string, loanId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    // 1. Fetch payment
    const { data: payment, error: pErr } = await supabase
      .from("loan_payments")
      .select("*")
      .eq("id", paymentId)
      .eq("user_id", user.id)
      .single();

    if (pErr || !payment) {
      return { success: false, error: "Payment not found" };
    }

    // 2. Fetch loan
    const { data: loan, error: lErr } = await supabase
      .from("loans")
      .select("id, outstanding_balance")
      .eq("id", loanId)
      .eq("user_id", user.id)
      .single();

    if (lErr || !loan) {
      return { success: false, error: "Loan not found" };
    }

    const principalRestored = toDecimal(payment.principal_component).plus(payment.extra_prepayment);
    const newOutstanding = toDecimal(loan.outstanding_balance).plus(principalRestored);

    // 3. Delete payment
    const { error: delErr } = await supabase
      .from("loan_payments")
      .delete()
      .eq("id", paymentId)
      .eq("user_id", user.id);

    if (delErr) {
      return { success: false, error: delErr.message };
    }

    // 4. Update loan
    await supabase
      .from("loans")
      .update({
        outstanding_balance: newOutstanding.toNumber(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", loanId)
      .eq("user_id", user.id);

    // 5. Clean up linked transaction and restore bank account balance
    const { data: linkedTxn } = await supabase
      .from("transactions")
      .select("id, account_id, amount, transaction_type")
      .eq("loan_payment_id", paymentId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (linkedTxn) {
      if (linkedTxn.account_id) {
        const { data: fundingAcc } = await supabase
          .from("accounts")
          .select("id, current_balance")
          .eq("id", linkedTxn.account_id)
          .eq("user_id", user.id)
          .single();

        if (fundingAcc) {
          const curBal = toDecimal(fundingAcc.current_balance);
          const isLending = linkedTxn.transaction_type === "lending_collection";
          // If paying loan: money was spent, so restoring gives money back (plus).
          // If lending collection: money was collected, so restoring takes money back (minus).
          const newBal = isLending ? curBal.minus(linkedTxn.amount) : curBal.plus(linkedTxn.amount);

          await supabase
            .from("accounts")
            .update({
              current_balance: newBal.toNumber(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", fundingAcc.id)
            .eq("user_id", user.id);
        }
      }

      await supabase
        .from("transactions")
        .delete()
        .eq("id", linkedTxn.id)
        .eq("user_id", user.id);
    }

    revalidatePath("/loans");
    revalidatePath("/accounts");
    revalidatePath("/net-worth");
    revalidatePath("/dashboard");
    revalidatePath("/transactions");
    return { success: true, message: "Payment removed, loan and account balances restored" };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to delete payment";
    return { success: false, error: errorMsg };
  }
}

import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { LoanView } from "@/components/loans/loan-view";

export const metadata: Metadata = {
  title: "Loans & Debt — WealthOvers",
  description: "Manage mortgages, personal loans, and amortization schedules",
};

export default async function LoansPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();
  const [loansResult, accountsResult] = await Promise.all([
    supabase
      .from("loans")
      .select(
        `
        id, lender_or_borrower_name, loan_type, principal_amount, outstanding_balance, annual_interest_rate, tenure_months, monthly_emi, start_date, maturity_date, account_id, notes, created_at,
        account:accounts(id, name, color, current_balance, currency),
        payments:loan_payments(id, loan_id, payment_date, emi_amount, principal_component, interest_component, extra_prepayment, remaining_balance, created_at, updated_at)
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("accounts")
      .select("id, name, color, current_balance, currency, account_type")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("name", { ascending: true }),
  ]);

  const loans = (loansResult.data || []) as any[];
  const accounts = (accountsResult.data || []) as any[];

  return (
    <div className="space-y-6">
      <LoanView loans={loans} accounts={accounts} />
    </div>
  );
}


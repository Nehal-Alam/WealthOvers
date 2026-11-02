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
  const { data: loansData } = await supabase
    .from("loans")
    .select(
      `
      id, lender_or_borrower_name, loan_type, principal_amount, outstanding_balance, annual_interest_rate, tenure_months, monthly_emi, start_date, account_id, is_active, notes, created_at,
      payments:loan_payments(id, loan_id, payment_date, emi_amount, principal_component, interest_component, extra_prepayment, remaining_balance)
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const loans = (loansData || []) as any[];

  return (
    <div className="space-y-6">
      <LoanView loans={loans} />
    </div>
  );
}


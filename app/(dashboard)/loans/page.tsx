import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoanView } from "@/components/loans/loan-view";

export const metadata: Metadata = {
  title: "Loans & Debt — WealthOvers",
  description: "Manage mortgages, personal loans, and amortization schedules",
};

export default async function LoansPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: loansData } = await supabase
    .from("loans")
    .select(
      `
      *,
      payments:loan_payments(*)
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


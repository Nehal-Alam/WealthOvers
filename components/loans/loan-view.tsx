"use client";

import * as React from "react";
import {
  Scale,
  PlusCircle,
  Calendar,
  Clock,
  TrendingDown,
  DollarSign,
  Trash2,
  Table as TableIcon,
  ShieldAlert,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { Tables } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import dynamic from "next/dynamic";
import { MoneyDisplay } from "@/components/financial/money-display";
import { MetricCard } from "@/components/financial/metric-card";

const CreateLoanDialog = dynamic(
  () =>
    import("@/components/loans/create-loan-dialog").then(
      (m) => m.CreateLoanDialog
    ),
  { ssr: false }
);

const LoanAmortizationModal = dynamic(
  () =>
    import("@/components/loans/loan-amortization-modal").then(
      (m) => m.LoanAmortizationModal
    ),
  { ssr: false }
);

const RecordLoanPaymentDialog = dynamic(
  () =>
    import("@/components/loans/record-loan-payment-dialog").then(
      (m) => m.RecordLoanPaymentDialog
    ),
  { ssr: false }
);

import { deleteLoanAction } from "@/app/(dashboard)/loans/actions";
import { addMoney, subtractMoney } from "@/lib/calculations/financial";

interface LoanWithPayments extends Tables<"loans"> {
  payments?: Tables<"loan_payments">[];
}

interface LoanViewProps {
  loans: LoanWithPayments[];
  accounts?: Tables<"accounts">[];
}

export function LoanView({ loans, accounts = [] }: LoanViewProps) {
  const [amortizationLoan, setAmortizationLoan] = React.useState<Tables<"loans"> | null>(null);
  const [paymentLoan, setPaymentLoan] = React.useState<Tables<"loans"> | null>(null);

  // Aggregate Metrics
  const { totalPrincipal, totalOutstanding, totalMonthlyEMI } = React.useMemo(() => {
    let p = "0.0000";
    let o = "0.0000";
    let emi = "0.0000";

    for (const loan of loans) {
      p = addMoney(p, loan.principal_amount || 0);
      o = addMoney(o, loan.outstanding_balance || 0);
      emi = addMoney(emi, loan.monthly_emi || 0);
    }

    return {
      totalPrincipal: p,
      totalOutstanding: o,
      totalMonthlyEMI: emi,
    };
  }, [loans]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete loan account for "${name}"?`)) return;
    const res = await deleteLoanAction(id);
    if (res.success) {
      toast.success(res.message || "Loan deleted");
    } else {
      toast.error(res.error || "Failed to delete loan");
    }
  };

  const getLoanTypeBadge = (type: string) => {
    return (
      <Badge variant="outline" className="text-[10px] capitalize border-border/80">
        {type.replace(/_/g, " ")}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Loan & Debt Management</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track mortgage amortization schedules, interest rates, and loan repayments.
          </p>
        </div>

        <CreateLoanDialog accounts={accounts} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Total Outstanding Debt"
          amount={totalOutstanding}
          subtitle={`Borrowed: ₹${parseFloat(totalPrincipal).toLocaleString("en-IN")}`}
          icon={Scale}
          iconColor="#C77A65"
          coloredAmount={false}
        />
        <MetricCard
          title="Monthly EMI Commitment"
          amount={totalMonthlyEMI}
          subtitle="Fixed monthly debt service"
          icon={TrendingDown}
          iconColor="#C39148"
          coloredAmount={false}
        />
        <MetricCard
          title="Active Loans"
          amount={loans.length}
          formatType="count"
          subtitle="Registered debt accounts"
          icon={Clock}
          iconColor="#244B3C"
        />
      </div>

      {loans.length === 0 ? (
        /* Section 11 Onboarding Empty State */
        <div className="rounded-2xl border border-dashed border-border p-8 sm:p-12 text-center bg-card">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
            <Scale className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">Track Your Loans & Debt Service</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md mx-auto leading-relaxed">
            Record home loans, personal loans, or vehicle financing to monitor your amortization schedule and payoff timelines.
          </p>
          <div className="mt-3 p-3 rounded-lg bg-surface-secondary/40 border border-border/60 max-w-sm mx-auto text-left text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Example: </span>
            SBI Home Loan with 8.5% interest and ₹35,000 monthly EMI commitment.
          </div>
          <div className="flex justify-center gap-2 mt-5">
            <CreateLoanDialog accounts={accounts} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loans.map((loan) => {
            const principalNum = parseFloat((loan.principal_amount || 0).toString());
            const outstandingNum = parseFloat((loan.outstanding_balance || 0).toString());
            const repaidNum = Math.max(0, principalNum - outstandingNum);
            const progress =
              principalNum > 0
                ? Math.min(Math.round((repaidNum / principalNum) * 100), 100)
                : 0;

            return (
              <Card key={loan.id} className="overflow-hidden border border-border/80 bg-card rounded-2xl shadow-xs hover:border-primary/40 transition-colors">
                <CardHeader className="p-5 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        {getLoanTypeBadge(loan.loan_type)}
                        <span className="text-xs text-muted-foreground font-mono">
                          {loan.annual_interest_rate}% p.a.
                        </span>
                      </div>
                      <CardTitle className="text-base font-bold mt-1 text-foreground">
                        {loan.lender_or_borrower_name}
                      </CardTitle>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-danger"
                      onClick={() => handleDelete(loan.id, loan.lender_or_borrower_name)}
                      aria-label="Delete loan"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-5 pt-2 space-y-4">
                  {/* Balance & Repaid Progress */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-muted-foreground">Principal Repaid</span>
                      <span className="text-xs font-mono font-bold text-success">
                        {progress}% paid
                      </span>
                    </div>

                    <Progress
                      value={progress}
                      indicatorClassName="bg-success"
                      className="h-2"
                    />

                    <div className="flex justify-between text-xs text-muted-foreground pt-0.5">
                      <span>
                        Outstanding:{" "}
                        <MoneyDisplay
                          amount={loan.outstanding_balance}
                          className="font-mono font-semibold text-foreground"
                        />
                      </span>
                      <span>
                        Principal:{" "}
                        <MoneyDisplay amount={loan.principal_amount} className="font-mono" />
                      </span>
                    </div>
                  </div>

                  {/* Loan Details Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs py-2.5 px-3 border border-border/60 rounded-lg bg-surface-secondary/30 my-2">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Monthly EMI</span>
                      <span className="font-mono font-bold text-sm text-primary">
                        <MoneyDisplay amount={loan.monthly_emi} />
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Maturity Date</span>
                      <span className="font-mono font-semibold text-foreground">
                        {loan.maturity_date && !isNaN(new Date(loan.maturity_date).getTime())
                          ? format(new Date(loan.maturity_date), "dd MMM yyyy")
                          : "N/A"}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1 border-t border-border/60">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 h-8 text-xs border-border/80"
                      onClick={() => setAmortizationLoan(loan)}
                    >
                      <TableIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Amortization</span>
                    </Button>

                    <Button
                      size="sm"
                      className="flex-1 gap-1.5 h-8 text-xs bg-primary hover:bg-primary-hover text-primary-foreground"
                      onClick={() => setPaymentLoan(loan)}
                    >
                      <DollarSign className="h-3.5 w-3.5" />
                      <span>Record EMI</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Amortization Schedule Modal */}
      <LoanAmortizationModal
        loan={amortizationLoan}
        open={!!amortizationLoan}
        onOpenChange={(open) => !open && setAmortizationLoan(null)}
      />

      {/* Record Payment Dialog */}
      <RecordLoanPaymentDialog
        loan={paymentLoan}
        accounts={accounts}
        open={!!paymentLoan}
        onOpenChange={(open) => !open && setPaymentLoan(null)}
      />
    </div>
  );
}

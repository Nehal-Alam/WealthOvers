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
}

export function LoanView({ loans }: LoanViewProps) {
  const [amortizationLoan, setAmortizationLoan] = React.useState<Tables<"loans"> | null>(null);
  const [paymentLoan, setPaymentLoan] = React.useState<Tables<"loans"> | null>(null);

  // Aggregate Metrics
  const { totalPrincipal, totalOutstanding, totalMonthlyEMI } = React.useMemo(() => {
    let p = "0.0000";
    let o = "0.0000";
    let emi = "0.0000";

    for (const loan of loans) {
      p = addMoney(p, loan.principal_amount);
      o = addMoney(o, loan.outstanding_balance);
      emi = addMoney(emi, loan.monthly_emi);
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
      <Badge variant="outline" className="text-[10px] capitalize">
        {type.replace(/_/g, " ")}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Loan & Debt Management</h2>
          <p className="text-sm text-muted-foreground">
            Track mortgage amortization schedules, interest rates, and loan repayments.
          </p>
        </div>

        <CreateLoanDialog />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Total Outstanding Debt"
          amount={totalOutstanding}
          subtitle={`Borrowed: ₹${parseFloat(totalPrincipal).toLocaleString()}`}
          icon={Scale}
          iconColor="#EF4444"
          coloredAmount={false}
        />
        <MetricCard
          title="Monthly EMI Commitment"
          amount={totalMonthlyEMI}
          subtitle="Fixed monthly debt service"
          icon={TrendingDown}
          iconColor="#F59E0B"
          coloredAmount={false}
        />
        <MetricCard
          title="Active Loans"
          amount={loans.length}
          subtitle="Registered debt accounts"
          icon={Clock}
          iconColor="#3B82F6"
        />
      </div>

      {loans.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center bg-card">
          <Scale className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-base font-semibold">No active loans or debts</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Record home loans, personal loans, or vehicle financing to monitor your amortization.
          </p>
          <CreateLoanDialog />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loans.map((loan) => {
            const principalNum = parseFloat(loan.principal_amount.toString());
            const outstandingNum = parseFloat(loan.outstanding_balance.toString());
            const repaidNum = Math.max(0, principalNum - outstandingNum);
            const progress =
              principalNum > 0
                ? Math.min(Math.round((repaidNum / principalNum) * 100), 100)
                : 0;

            return (
              <Card key={loan.id} className="overflow-hidden border shadow-sm">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        {getLoanTypeBadge(loan.loan_type)}
                        <span className="text-xs text-muted-foreground">
                          {loan.annual_interest_rate}% p.a.
                        </span>
                      </div>
                      <CardTitle className="text-base font-semibold mt-1">
                        {loan.lender_or_borrower_name}
                      </CardTitle>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(loan.id, loan.lender_or_borrower_name)}
                      aria-label="Delete loan"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-2 space-y-4">
                  {/* Balance & Repaid Progress */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-muted-foreground">Principal Repaid</span>
                      <span className="text-xs font-mono font-bold text-emerald-600">
                        {progress}% paid
                      </span>
                    </div>

                    <Progress
                      value={progress}
                      indicatorClassName="bg-emerald-500"
                      className="h-2"
                    />

                    <div className="flex justify-between text-xs text-muted-foreground pt-0.5">
                      <span>
                        Outstanding:{" "}
                        <MoneyDisplay
                          amount={loan.outstanding_balance}
                          className="font-semibold text-foreground"
                        />
                      </span>
                      <span>
                        Principal:{" "}
                        <MoneyDisplay amount={loan.principal_amount} />
                      </span>
                    </div>
                  </div>

                  {/* Loan Details Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y">
                    <div>
                      <span className="text-muted-foreground block">Monthly EMI</span>
                      <span className="font-mono font-bold text-sm text-primary">
                        <MoneyDisplay amount={loan.monthly_emi} />
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Maturity Date</span>
                      <span className="font-mono font-semibold">
                        {format(new Date(loan.maturity_date), "dd MMM yyyy")}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 h-8 text-xs"
                      onClick={() => setAmortizationLoan(loan)}
                    >
                      <TableIcon className="h-3.5 w-3.5" />
                      <span>Amortization</span>
                    </Button>

                    <Button
                      size="sm"
                      className="flex-1 gap-1.5 h-8 text-xs"
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
        open={!!paymentLoan}
        onOpenChange={(open) => !open && setPaymentLoan(null)}
      />
    </div>
  );
}


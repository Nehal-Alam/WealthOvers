"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  TrendingDown,
  TrendingUp,
  Scale,
  Calendar,
  Clock,
  Pencil,
  Trash2,
  DollarSign,
  Table as TableIcon,
  CheckCircle2,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  PlusCircle,
  Receipt,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MoneyDisplay } from "@/components/financial/money-display";
import { MetricCard } from "@/components/financial/metric-card";
import { Tables } from "@/types/database";
import { deleteLoanPaymentAction } from "@/app/(dashboard)/loans/actions";
import { EditLoanPaymentDialog } from "./edit-loan-payment-dialog";
import { addMoney, subtractMoney, toDecimal } from "@/lib/calculations/financial";

interface LoanWithPayments extends Tables<"loans"> {
  payments?: Tables<"loan_payments">[];
  account?: { id: string; name: string; color: string; current_balance: number; currency: string } | null;
}

interface LoanTransactionsModalProps {
  loan: LoanWithPayments | null;
  accounts?: Tables<"accounts">[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditLoan?: (loan: LoanWithPayments) => void;
  onRecordPayment?: (loan: LoanWithPayments) => void;
  onOpenAmortization?: (loan: LoanWithPayments) => void;
}

export function LoanTransactionsModal({
  loan,
  accounts = [],
  open,
  onOpenChange,
  onEditLoan,
  onRecordPayment,
  onOpenAmortization,
}: LoanTransactionsModalProps) {
  const [filterTab, setFilterTab] = React.useState<"all" | "inflow" | "outflow">("all");
  const [editingPayment, setEditingPayment] = React.useState<Tables<"loan_payments"> | null>(null);
  const [isDeletingId, setIsDeletingId] = React.useState<string | null>(null);

  const isLending = loan?.loan_type === "loan_given";
  const principalNum = parseFloat((loan?.principal_amount || 0).toString());
  const outstandingNum = parseFloat((loan?.outstanding_balance || 0).toString());
  const repaidNum = Math.max(0, principalNum - outstandingNum);
  const progressPercent =
    principalNum > 0 ? Math.min(Math.round((repaidNum / principalNum) * 100), 100) : 0;

  // Payments sorted by payment_date descending
  const sortedPayments = React.useMemo(() => {
    return [...(loan?.payments || [])].sort((a, b) => {
      const timeA = new Date(a.payment_date).getTime();
      const timeB = new Date(b.payment_date).getTime();
      return timeB - timeA;
    });
  }, [loan?.payments]);

  // Aggregate total repayments made
  const totalRepaymentsAmount = React.useMemo(() => {
    let sum = "0.0000";
    for (const p of sortedPayments) {
      const totalPaid = toDecimal(p.emi_amount || 0).plus(p.extra_prepayment || 0);
      sum = addMoney(sum, totalPaid);
    }
    return sum;
  }, [sortedPayments]);

  // Total Inflow & Outflow for this Loan
  // If Borrowed:
  // Inflow = Initial Principal Disbursed (+₹50,000)
  // Outflow = Repayments paid so far (-₹16,666)
  // If Lent:
  // Outflow = Money Lent (-₹50,000)
  // Inflow = Repayments received so far (+₹16,666)
  const totalInflow = isLending ? totalRepaymentsAmount : (loan?.principal_amount || 0);
  const totalOutflow = isLending ? (loan?.principal_amount || 0) : totalRepaymentsAmount;

  // Build unified Inflow + Outflow transaction list
  interface UnifiedLoanTxn {
    id: string;
    date: string;
    type: "disbursement" | "repayment";
    direction: "inflow" | "outflow";
    title: string;
    subtitle: string;
    amount: number | string;
    principalComponent?: number;
    interestComponent?: number;
    extraPrepayment?: number;
    remainingBalance?: number;
    rawPayment?: Tables<"loan_payments">;
  }

  const allTransactions = React.useMemo(() => {
    if (!loan) return [];
    const list: UnifiedLoanTxn[] = [];

    // 1. Initial Disbursement Transaction
    list.push({
      id: `disb-${loan.id}`,
      date: loan.start_date,
      type: "disbursement",
      direction: isLending ? "outflow" : "inflow",
      title: isLending
        ? `Money Lent to ${loan.lender_or_borrower_name}`
        : `Loan Disbursed by ${loan.lender_or_borrower_name}`,
      subtitle: isLending
        ? "Initial capital lent from bank account"
        : "Initial loan principal credited to bank account",
      amount: loan.principal_amount,
    });

    // 2. All Repayments
    for (const p of sortedPayments) {
      const totalPaid = toDecimal(p.emi_amount || 0).plus(p.extra_prepayment || 0);
      list.push({
        id: p.id,
        date: p.payment_date,
        type: "repayment",
        direction: isLending ? "inflow" : "outflow",
        title: isLending
          ? `Repayment Received: ${loan.lender_or_borrower_name}`
          : `Loan EMI Payment: ${loan.lender_or_borrower_name}`,
        subtitle: `Principal: ₹${parseFloat(String(p.principal_component || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })} • Interest: ₹${parseFloat(String(p.interest_component || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}${
          parseFloat(String(p.extra_prepayment || 0)) > 0
            ? ` • Extra: ₹${parseFloat(String(p.extra_prepayment)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
            : ""
        }`,
        amount: totalPaid.toString(),
        principalComponent: p.principal_component,
        interestComponent: p.interest_component,
        extraPrepayment: p.extra_prepayment,
        remainingBalance: p.remaining_balance,
        rawPayment: p,
      });
    }

    // Sort all chronologically descending (newest first)
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [loan, sortedPayments, isLending]);

  // Filtered by tab
  const filteredTransactions = React.useMemo(() => {
    if (filterTab === "inflow") {
      return allTransactions.filter((t) => t.direction === "inflow");
    }
    if (filterTab === "outflow") {
      return allTransactions.filter((t) => t.direction === "outflow");
    }
    return allTransactions;
  }, [allTransactions, filterTab]);

  const handleDeletePayment = async (paymentId: string) => {
    if (!loan) return;
    if (
      !confirm(
        "Are you sure you want to delete this payment record? The loan outstanding balance and bank account balance will be restored automatically."
      )
    ) {
      return;
    }

    setIsDeletingId(paymentId);
    try {
      const res = await deleteLoanPaymentAction(paymentId, loan.id);
      if (res.success) {
        toast.success(res.message || "Payment removed successfully");
      } else {
        toast.error(res.error || "Failed to delete payment");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsDeletingId(null);
    }
  };

  const getLoanTypeBadge = (type: string) => {
    return (
      <Badge variant="outline" className="text-[11px] capitalize border-border/80 bg-surface-secondary/50">
        {type.replace(/_/g, " ")}
      </Badge>
    );
  };

  if (!loan) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader className="pb-3 border-b border-border/60">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  {getLoanTypeBadge(loan.loan_type)}
                  <span className="text-xs text-muted-foreground font-mono">
                    {loan.annual_interest_rate}% p.a. • {loan.tenure_months} months
                  </span>
                </div>
                <DialogTitle className="text-xl font-bold tracking-tight text-foreground mt-1">
                  {loan.lender_or_borrower_name}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Complete ledger history of loan disbursement, EMI repayments, and cash flow impact.
                </DialogDescription>
              </div>

              {/* Action Buttons in Header */}
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                {onRecordPayment && (
                  <Button
                    size="sm"
                    className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary-hover shadow-2xs"
                    onClick={() => {
                      onOpenChange(false);
                      onRecordPayment(loan);
                    }}
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>Record EMI</span>
                  </Button>
                )}

                {onEditLoan && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5 border-border/80"
                    onClick={() => {
                      onOpenChange(false);
                      onEditLoan(loan);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Edit Loan</span>
                  </Button>
                )}

                {onOpenAmortization && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5 border-border/80"
                    onClick={() => {
                      onOpenChange(false);
                      onOpenAmortization(loan);
                    }}
                  >
                    <TableIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="hidden sm:inline">Schedule</span>
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* Inflow vs Outflow KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
            <MetricCard
              title={isLending ? "Total Recovered (Inflow)" : "Borrowed Capital (Inflow)"}
              amount={totalInflow}
              subtitle={isLending ? "Repayments collected" : "Disbursed to bank"}
              icon={TrendingUp}
              iconColor="#39805B"
              coloredAmount
            />
            <MetricCard
              title={isLending ? "Money Lent (Outflow)" : "Total Repaid (Outflow)"}
              amount={totalOutflow}
              subtitle={isLending ? "Capital lent out" : "EMIs + Prepayments paid"}
              icon={TrendingDown}
              iconColor="#C77A65"
              coloredAmount={false}
            />
            <MetricCard
              title={isLending ? "Remaining Receivable" : "Current Outstanding"}
              amount={loan.outstanding_balance}
              subtitle={`${progressPercent}% ${isLending ? "recovered" : "paid"}`}
              icon={Scale}
              iconColor="#244B3C"
            />
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5 p-3.5 rounded-xl border border-border/70 bg-surface-secondary/30">
            <div className="flex justify-between items-baseline text-xs">
              <span className="text-muted-foreground font-medium">
                {isLending ? "Capital Recovered" : "Principal Repaid"}
              </span>
              <span className="font-mono font-bold text-success">
                {progressPercent}% completed ({sortedPayments.length} installment{sortedPayments.length === 1 ? "" : "s"})
              </span>
            </div>
            <Progress value={progressPercent} indicatorClassName="bg-success" className="h-2" />
            <div className="flex justify-between text-[11px] text-muted-foreground pt-0.5">
              <span>
                Start: {loan.start_date && !isNaN(new Date(loan.start_date).getTime()) ? format(new Date(loan.start_date), "dd MMM yyyy") : "N/A"}
              </span>
              <span>
                Maturity: {loan.maturity_date && !isNaN(new Date(loan.maturity_date).getTime()) ? format(new Date(loan.maturity_date), "dd MMM yyyy") : "N/A"}
              </span>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center justify-between border-b border-border/70 pb-2 mt-4">
            <div className="flex items-center gap-1 bg-surface-secondary/60 p-0.5 rounded-lg border border-border/60">
              <button
                type="button"
                onClick={() => setFilterTab("all")}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                  filterTab === "all"
                    ? "bg-card text-foreground font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All ({allTransactions.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("inflow")}
                className={`flex items-center gap-1 px-3 py-1 text-xs rounded-md font-medium transition-all ${
                  filterTab === "inflow"
                    ? "bg-card text-success font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ArrowDownLeft className="h-3 w-3 text-success" />
                <span>Inflow</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("outflow")}
                className={`flex items-center gap-1 px-3 py-1 text-xs rounded-md font-medium transition-all ${
                  filterTab === "outflow"
                    ? "bg-card text-danger font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ArrowUpRight className="h-3 w-3 text-danger" />
                <span>Outflow</span>
              </button>
            </div>

            <span className="text-xs text-muted-foreground">
              Showing {filteredTransactions.length} transaction{filteredTransactions.length === 1 ? "" : "s"}
            </span>
          </div>

          {/* Transactions List */}
          <div className="space-y-2 mt-2">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground border border-dashed border-border rounded-xl p-6">
                No transactions match the selected filter.
              </div>
            ) : (
              <div className="rounded-xl border border-border/80 bg-card divide-y divide-border/60 overflow-hidden shadow-2xs">
                {filteredTransactions.map((tx) => {
                  const isInflow = tx.direction === "inflow";

                  return (
                    <div
                      key={tx.id}
                      className="p-3.5 flex items-center justify-between gap-3 hover:bg-surface-secondary/40 transition-colors"
                    >
                      {/* Left: Icon & Description */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border border-border/60 ${
                            isInflow
                              ? "bg-success/15 text-success"
                              : "bg-danger/15 text-danger"
                          }`}
                        >
                          {isInflow ? (
                            <ArrowDownLeft className="h-4 w-4" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {tx.title}
                            </p>
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 h-4 rounded-full ${
                                tx.type === "disbursement"
                                  ? "bg-primary/10 text-primary border-primary/30"
                                  : "bg-surface-secondary text-muted-foreground border-border/80"
                              }`}
                            >
                              {tx.type === "disbursement" ? "Disbursement" : "Repayment"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {format(new Date(tx.date), "dd MMM yyyy")} • {tx.subtitle}
                          </p>
                        </div>
                      </div>

                      {/* Right: Amount & Actions */}
                      <div className="flex items-center gap-3 shrink-0 ml-2">
                        <div className="text-right font-mono">
                          <p
                            className={`text-sm font-bold tabular-nums tracking-tight ${
                              isInflow ? "text-success" : "text-danger"
                            }`}
                          >
                            {isInflow ? "+" : "-"}
                            ₹{parseFloat(String(tx.amount)).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </p>
                          {tx.remainingBalance !== undefined && (
                            <span className="text-[10px] text-muted-foreground block">
                              Bal: ₹{parseFloat(String(tx.remainingBalance)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          )}
                        </div>

                        {/* Action buttons for repayments: Edit & Delete */}
                        {tx.type === "repayment" && tx.rawPayment && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => setEditingPayment(tx.rawPayment!)}
                              title="Edit Repayment Details"
                              aria-label="Edit repayment"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-danger"
                              disabled={isDeletingId === tx.id}
                              onClick={() => handleDeletePayment(tx.id)}
                              title="Delete Repayment"
                              aria-label="Delete repayment"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Payment Dialog */}
      <EditLoanPaymentDialog
        payment={editingPayment}
        loan={loan}
        accounts={accounts}
        open={!!editingPayment}
        onOpenChange={(open) => !open && setEditingPayment(null)}
      />
    </>
  );
}

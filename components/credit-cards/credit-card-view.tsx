"use client";

import * as React from "react";
import {
  CreditCard as CreditCardIcon,
  PlusCircle,
  Receipt,
  ArrowLeftRight,
  ShieldCheck,
  AlertCircle,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";

import { Tables } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import dynamic from "next/dynamic";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { MoneyDisplay } from "@/components/financial/money-display";
import { MetricCard } from "@/components/financial/metric-card";

const CreateCreditCardDialog = dynamic(
  () =>
    import("@/components/credit-cards/create-credit-card-dialog").then(
      (m) => m.CreateCreditCardDialog
    ),
  { ssr: false }
);

const RecordStatementDialog = dynamic(
  () =>
    import("@/components/credit-cards/record-statement-dialog").then(
      (m) => m.RecordStatementDialog
    ),
  { ssr: false }
);

const TransferFundsDialog = dynamic(
  () =>
    import("@/components/accounts/transfer-funds-dialog").then(
      (m) => m.TransferFundsDialog
    ),
  { ssr: false }
);

import { settleCreditCardStatementAction } from "@/app/(dashboard)/credit-cards/actions";
import { addMoney, subtractMoney } from "@/lib/calculations/financial";

interface CreditCardWithStatements extends Tables<"credit_cards"> {
  account?: Tables<"accounts">;
  statements?: Tables<"credit_card_statements">[];
}

interface CreditCardViewProps {
  creditCards: CreditCardWithStatements[];
  accounts: Tables<"accounts">[];
}

export function CreditCardView({ creditCards, accounts }: CreditCardViewProps) {
  const [statementCard, setStatementCard] = React.useState<Tables<"credit_cards"> | null>(null);
  const [billPayTargetAccount, setBillPayTargetAccount] = React.useState<string | null>(null);

  // Aggregate Metrics
  const { totalLimit, totalOutstanding, totalAvailable, overallUtilization } =
    React.useMemo(() => {
      let limit = "0.0000";
      let outstanding = "0.0000";

      for (const card of creditCards) {
        limit = addMoney(limit, card.credit_limit);
        // Current outstanding from the linked account or card model
        const currentBal = card.account?.current_balance ?? card.current_outstanding;
        outstanding = addMoney(outstanding, currentBal);
      }

      const available = subtractMoney(limit, outstanding);
      let util = 0;
      if (parseFloat(limit) > 0) {
        util = Math.min(
          Math.round((parseFloat(outstanding) / parseFloat(limit)) * 100),
          100
        );
      }

      return {
        totalLimit: limit,
        totalOutstanding: outstanding,
        totalAvailable: available,
        overallUtilization: util,
      };
    }, [creditCards]);

  const handleToggleSettle = async (statementId: string, currentStatus: boolean) => {
    const res = await settleCreditCardStatementAction(statementId, !currentStatus);
    if (res.success) {
      toast.success(res.message);
    } else {
      toast.error(res.error || "Failed to update statement");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Credit Card Management</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitor credit limits, utilization ratio, billing cycles, and settle statement dues.
          </p>
        </div>

        <CreateCreditCardDialog accounts={accounts} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Credit Limit"
          amount={totalLimit}
          subtitle="Combined credit line"
          icon={CreditCardIcon}
          iconColor="#244B3C"
        />
        <MetricCard
          title="Current Outstanding"
          amount={totalOutstanding}
          subtitle="Total unbilled & billed liability"
          icon={AlertCircle}
          iconColor="#C77A65"
          coloredAmount={false}
        />
        <MetricCard
          title="Available Credit"
          amount={totalAvailable}
          subtitle="Remaining usable limit"
          icon={ShieldCheck}
          iconColor="#39805B"
        />
        <MetricCard
          title="Credit Utilization"
          amount={`${overallUtilization}%`}
          formatType="percent"
          subtitle={
            overallUtilization <= 30
              ? "Healthy (under 30%)"
              : overallUtilization <= 50
              ? "Moderate (30-50%)"
              : "High (> 50%)"
          }
          icon={CreditCardIcon}
          iconColor={
            overallUtilization <= 30
              ? "#39805B"
              : overallUtilization <= 50
              ? "#C39148"
              : "#C77A65"
          }
        />
      </div>

      {creditCards.length === 0 ? (
        /* Section 11 Onboarding Empty State */
        <div className="rounded-2xl border border-dashed border-border p-8 sm:p-12 text-center bg-card">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
            <CreditCardIcon className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">Manage Your Credit Cards</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md mx-auto leading-relaxed">
            Add your credit cards to track billing cycles, statement balances, and utilization limits.
          </p>
          <div className="mt-3 p-3 rounded-lg bg-surface-secondary/40 border border-border/60 max-w-sm mx-auto text-left text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Example: </span>
            HDFC Regalia or ICICI Sapphiro with ₹3,00,000 credit limit and statement on 15th.
          </div>
          <div className="flex justify-center gap-2 mt-5">
            <CreateCreditCardDialog accounts={accounts} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {creditCards.map((card) => {
            const currentBal = card.account?.current_balance ?? card.current_outstanding;
            const limit = card.credit_limit;
            const available = subtractMoney(limit, currentBal);
            let util = 0;
            if (parseFloat(limit.toString()) > 0) {
              util = Math.min(
                Math.round(
                  (parseFloat(currentBal.toString()) / parseFloat(limit.toString())) * 100
                ),
                100
              );
            }

            return (
              <Card key={card.id} className="overflow-hidden border border-border/80 bg-card rounded-2xl shadow-xs">
                {/* Physical Card Representation - Leftovers Forest Green Aesthetic */}
                <div className="p-5 bg-gradient-to-br from-[#1B3B2F] via-[#244B3C] to-[#152720] text-[#EFF3EA] relative">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-[#9BB99D] font-bold">
                        {card.issuer_name}
                      </span>
                      <h3 className="text-lg font-bold tracking-tight text-white mt-0.5">
                        {card.card_name}
                      </h3>
                    </div>

                    <div className="h-7 w-11 rounded border border-[#C39148]/40 bg-[#C39148]/20 flex items-center justify-center">
                      <span className="text-[9px] font-mono tracking-wider font-bold text-[#D6B16C]">
                        CHIP
                      </span>
                    </div>
                  </div>

                  <div className="my-6">
                    <span className="font-mono text-base tracking-widest text-[#EFF3EA]/90">
                      •••• •••• •••• {card.last_four_digits}
                    </span>
                  </div>

                  <div className="flex justify-between items-end text-xs">
                    <div>
                      <span className="text-[#9BB99D] block text-[10px] uppercase font-medium">
                        STATEMENT / DUE DAY
                      </span>
                      <span className="font-mono font-medium text-white">
                        Day {card.statement_date_day} / Day {card.payment_due_day}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[#9BB99D] block text-[10px] uppercase font-medium">
                        CREDIT LIMIT
                      </span>
                      <span className="font-mono font-bold text-white text-sm">
                        ₹{parseFloat(card.credit_limit.toString()).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                </div>

                <CardContent className="p-5 space-y-4">
                  {/* Utilization Progress */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground font-medium">Credit Utilization</span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 font-medium ${
                            util > 50
                              ? "bg-danger/10 text-danger border-danger/30"
                              : util > 30
                              ? "bg-warning/10 text-warning border-warning/30"
                              : "bg-success/10 text-success border-success/30"
                          }`}
                        >
                          {util <= 30 ? "Optimal (<30%)" : util <= 50 ? "Moderate" : "High Risk (>50%)"}
                        </Badge>
                      </div>
                      <span
                        className={`font-mono font-bold ${
                          util > 50
                            ? "text-danger"
                            : util > 30
                            ? "text-warning"
                            : "text-success"
                        }`}
                      >
                        {util}%
                      </span>
                    </div>

                    <Progress
                      value={util}
                      indicatorClassName={
                        util > 50
                          ? "bg-danger"
                          : util > 30
                          ? "bg-warning"
                          : "bg-success"
                      }
                      className="h-2"
                    />

                    <div className="flex justify-between text-xs text-muted-foreground pt-0.5">
                      <span>Outstanding: <MoneyDisplay amount={currentBal} className="font-mono font-semibold text-foreground" /></span>
                      <span>Available: <MoneyDisplay amount={available} className="font-mono font-semibold text-foreground" /></span>
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 h-8 text-xs border-border/80"
                      onClick={() => setStatementCard(card)}
                    >
                      <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Record Statement</span>
                    </Button>

                    <Button
                      size="sm"
                      className="flex-1 gap-1.5 h-8 text-xs bg-primary hover:bg-primary-hover text-primary-foreground"
                      onClick={() => setBillPayTargetAccount(card.account_id)}
                    >
                      <ArrowLeftRight className="h-3.5 w-3.5" />
                      <span>Pay Bill (Transfer)</span>
                    </Button>
                  </div>

                  {/* Statement History */}
                  {card.statements && card.statements.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-border/60">
                      <span className="text-xs font-semibold text-muted-foreground block">
                        Recent Statements
                      </span>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto">
                        {card.statements.map((stmt) => {
                          const daysUntilDue = differenceInDays(new Date(stmt.due_date), new Date());
                          return (
                            <div
                              key={stmt.id}
                              className="flex items-center justify-between p-2.5 rounded-lg bg-surface-secondary/40 border border-border/50 text-xs"
                            >
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-foreground block">
                                    Due: {format(new Date(stmt.due_date), "dd MMM yyyy")}
                                  </span>
                                  {!stmt.is_settled && (
                                    daysUntilDue <= 3 ? (
                                      <Badge variant="outline" className="text-[9px] px-1 py-0 bg-danger/10 text-danger border-danger/30 animate-pulse">
                                        {daysUntilDue <= 0 ? "Due today!" : `Due in ${daysUntilDue}d!`}
                                      </Badge>
                                    ) : daysUntilDue <= 7 ? (
                                      <Badge variant="outline" className="text-[9px] px-1 py-0 bg-warning/10 text-warning border-warning/30">
                                        Due in ${daysUntilDue}d
                                      </Badge>
                                    ) : null
                                  )}
                                </div>
                                <span className="text-[11px] text-muted-foreground">
                                  Total Due: <MoneyDisplay amount={stmt.total_due} className="font-mono font-medium text-foreground" />
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                {stmt.is_settled ? (
                                  <Badge className="bg-success/10 text-success border-success/30 text-[10px] h-5 gap-1 font-medium">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Settled
                                  </Badge>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[11px] px-2 text-primary hover:bg-primary-soft/50 font-medium"
                                    onClick={() => handleToggleSettle(stmt.id, stmt.is_settled)}
                                  >
                                    Mark Settled
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Record Statement Dialog */}
      <RecordStatementDialog
        card={statementCard}
        open={!!statementCard}
        onOpenChange={(open) => !open && setStatementCard(null)}
      />

      {/* Inter-Account Bill Payment Modal */}
      <TransferFundsDialog
        accounts={accounts}
        defaultDestinationId={billPayTargetAccount || undefined}
        open={!!billPayTargetAccount}
        onOpenChange={(open) => !open && setBillPayTargetAccount(null)}
        trigger={null}
      />
    </div>
  );
}

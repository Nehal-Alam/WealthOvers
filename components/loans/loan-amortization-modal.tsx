"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  Calendar,
  Download,
  Scale,
  Zap,
  TrendingDown,
  Clock,
  PiggyBank,
  CheckCircle2,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MoneyDisplay } from "@/components/financial/money-display";
import {
  generateAmortizationSchedule,
  calculateLoanPrepayment,
} from "@/lib/calculations/financial";
import { Tables } from "@/types/database";

interface LoanAmortizationModalProps {
  loan: Tables<"loans"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoanAmortizationModal({
  loan,
  open,
  onOpenChange,
}: LoanAmortizationModalProps) {
  const [activeTab, setActiveTab] = React.useState<"standard" | "accelerated">("standard");
  const [extraMonthlyPayment, setExtraMonthlyPayment] = React.useState<string>("5000");
  const [lumpsumPayment, setLumpsumPayment] = React.useState<string>("0");
  const [lumpsumMonth, setLumpsumMonth] = React.useState<string>("12");

  // Standard Amortization Schedule
  const standardSchedule = React.useMemo(() => {
    if (!loan) return [];
    return generateAmortizationSchedule(
      loan.principal_amount,
      loan.annual_interest_rate,
      loan.tenure_months,
      loan.start_date
    );
  }, [loan]);

  // Prepayment Simulation
  const simulation = React.useMemo(() => {
    if (!loan) return null;
    return calculateLoanPrepayment(
      loan.principal_amount,
      loan.annual_interest_rate,
      loan.tenure_months,
      parseFloat(extraMonthlyPayment) || 0,
      parseFloat(lumpsumPayment) || 0,
      parseInt(lumpsumMonth) || 1,
      loan.start_date
    );
  }, [loan, extraMonthlyPayment, lumpsumPayment, lumpsumMonth]);

  const activeSchedule = activeTab === "accelerated" && simulation ? simulation.schedule : standardSchedule;

  const handleExportSchedule = () => {
    if (!loan || activeSchedule.length === 0) return;

    const headers = [
      "Month",
      "Payment Date",
      "EMI Amount",
      "Principal Component",
      "Interest Component",
      "Remaining Balance",
    ];

    const rows = activeSchedule.map((row) => [
      row.month,
      row.paymentDate,
      row.emi,
      row.principalComponent,
      row.interestComponent,
      row.remainingBalance,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `amortization_${activeTab}_${loan.lender_or_borrower_name.replace(/\s+/g, "_")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!loan) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] max-h-[88vh] flex flex-col">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-6">
            <div>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <Scale className="h-4 w-4 text-primary" />
                <span>Amortization & Prepayment — {loan.lender_or_borrower_name}</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Principal: <MoneyDisplay amount={loan.principal_amount} className="font-semibold" /> • Rate:{" "}
                {loan.annual_interest_rate}% p.a. • Tenure: {loan.tenure_months} months
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-8 text-xs shrink-0"
                onClick={handleExportSchedule}
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export CSV</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* View Selection Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(val: any) => setActiveTab(val)}
          className="w-full flex-1 flex flex-col min-h-0"
        >
          <TabsList className="grid w-full grid-cols-2 h-9 p-1">
            <TabsTrigger value="standard" className="text-xs py-1">
              Standard Schedule ({standardSchedule.length}m)
            </TabsTrigger>
            <TabsTrigger value="accelerated" className="text-xs py-1 gap-1.5 data-[state=active]:text-primary">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              <span>Prepayment Simulator</span>
            </TabsTrigger>
          </TabsList>

          {/* Prepayment Simulator Controls & KPI Summary */}
          {activeTab === "accelerated" && simulation && (
            <div className="space-y-3 pt-3">
              {/* Simulator Input Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl border bg-muted/20">
                <div className="space-y-1">
                  <Label htmlFor="extra-monthly" className="text-[11px] font-semibold">
                    Extra Monthly EMI (INR)
                  </Label>
                  <Input
                    id="extra-monthly"
                    type="number"
                    step="500"
                    min="0"
                    value={extraMonthlyPayment}
                    onChange={(e) => setExtraMonthlyPayment(e.target.value)}
                    placeholder="e.g. 5000"
                    className="h-8 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="lumpsum-pay" className="text-[11px] font-semibold">
                    Lumpsum Prepayment (INR)
                  </Label>
                  <Input
                    id="lumpsum-pay"
                    type="number"
                    step="10000"
                    min="0"
                    value={lumpsumPayment}
                    onChange={(e) => setLumpsumPayment(e.target.value)}
                    placeholder="e.g. 100000"
                    className="h-8 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="lumpsum-month" className="text-[11px] font-semibold">
                    At Month #
                  </Label>
                  <Input
                    id="lumpsum-month"
                    type="number"
                    min="1"
                    max={loan.tenure_months}
                    value={lumpsumMonth}
                    onChange={(e) => setLumpsumMonth(e.target.value)}
                    className="h-8 text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Simulation Result Callout Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl border bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium">Total Interest Saved</span>
                    <PiggyBank className="h-4 w-4" />
                  </div>
                  <MoneyDisplay
                    amount={simulation.interestSaved}
                    className="text-base font-bold mt-1 text-emerald-600 dark:text-emerald-400"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Reduced from <MoneyDisplay amount={simulation.originalTotalInterest} className="font-semibold text-foreground" />
                  </p>
                </div>

                <div className="p-3 rounded-xl border bg-primary/10 border-primary/20 text-primary">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium">Time to Debt-Free</span>
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="text-base font-bold mt-1">
                    {simulation.monthsSaved} Months Earlier
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {simulation.yearsSaved} years saved off original tenure
                  </p>
                </div>

                <div className="p-3 rounded-xl border bg-card text-foreground">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-muted-foreground">New Payoff Date</span>
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-base font-bold mt-1 font-mono">
                    {simulation.schedule.length > 0
                      ? format(
                          new Date(simulation.schedule[simulation.schedule.length - 1].paymentDate),
                          "MMM yyyy"
                        )
                      : "—"}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Payoff in {simulation.revisedTenureMonths} months total
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Schedule Table View */}
          <div className="flex-1 overflow-y-auto rounded-xl border mt-3 min-h-[260px]">
            <Table>
              <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
                <TableRow>
                  <TableHead className="w-16">Month</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead className="text-right">EMI / Payment</TableHead>
                  <TableHead className="text-right">Principal</TableHead>
                  <TableHead className="text-right">Interest</TableHead>
                  <TableHead className="text-right">Remaining Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeSchedule.map((row) => (
                  <TableRow key={row.month} className="text-xs hover:bg-muted/30">
                    <TableCell className="font-mono font-medium">{row.month}</TableCell>
                    <TableCell className="font-mono text-muted-foreground whitespace-nowrap">
                      {format(new Date(row.paymentDate), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      <MoneyDisplay amount={row.emi} />
                    </TableCell>
                    <TableCell className="text-right font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                      <MoneyDisplay amount={row.principalComponent} />
                    </TableCell>
                    <TableCell className="text-right font-mono text-destructive">
                      <MoneyDisplay amount={row.interestComponent} />
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      <MoneyDisplay amount={row.remainingBalance} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

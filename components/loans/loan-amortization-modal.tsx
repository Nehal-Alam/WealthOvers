"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar, Download, Scale } from "lucide-react";

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
import { MoneyDisplay } from "@/components/financial/money-display";
import { generateAmortizationSchedule } from "@/lib/calculations/financial";
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
  const schedule = React.useMemo(() => {
    if (!loan) return [];
    return generateAmortizationSchedule(
      loan.principal_amount,
      loan.annual_interest_rate,
      loan.tenure_months,
      loan.start_date
    );
  }, [loan]);

  const handleExportSchedule = () => {
    if (!loan || schedule.length === 0) return;

    const headers = [
      "Month",
      "Payment Date",
      "EMI Amount",
      "Principal Component",
      "Interest Component",
      "Remaining Balance",
    ];

    const rows = schedule.map((row) => [
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
      `amortization_${loan.lender_or_borrower_name.replace(/\s+/g, "_")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!loan) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-primary" />
                <span>Amortization Schedule — {loan.lender_or_borrower_name}</span>
              </DialogTitle>
              <DialogDescription>
                Full declining-balance schedule over {loan.tenure_months} months at{" "}
                {loan.annual_interest_rate}% p.a.
              </DialogDescription>
            </div>
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
        </DialogHeader>

        <div className="flex-1 overflow-y-auto rounded-lg border mt-2">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm">
              <TableRow>
                <TableHead className="w-16">Month</TableHead>
                <TableHead>Payment Date</TableHead>
                <TableHead className="text-right">EMI</TableHead>
                <TableHead className="text-right">Principal</TableHead>
                <TableHead className="text-right">Interest</TableHead>
                <TableHead className="text-right">Remaining Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedule.map((row) => (
                <TableRow key={row.month} className="text-xs">
                  <TableCell className="font-mono">{row.month}</TableCell>
                  <TableCell className="font-mono text-muted-foreground whitespace-nowrap">
                    {format(new Date(row.paymentDate), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    <MoneyDisplay amount={row.emi} />
                  </TableCell>
                  <TableCell className="text-right font-mono text-emerald-600">
                    <MoneyDisplay amount={row.principalComponent} />
                  </TableCell>
                  <TableCell className="text-right font-mono text-rose-600">
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
      </DialogContent>
    </Dialog>
  );
}


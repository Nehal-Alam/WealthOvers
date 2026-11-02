"use client";

import * as React from "react";
import { format } from "date-fns";
import { Scale, CheckCircle2, AlertCircle, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Tables } from "@/types/database";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MoneyDisplay } from "@/components/financial/money-display";
import { calculateReconciliationAdjustment } from "@/lib/calculations/financial";
import { reconcileAccountBalanceAction } from "@/app/(dashboard)/accounts/actions";

interface ReconcileAccountDialogProps {
  account: Tables<"accounts">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReconcileAccountDialog({
  account,
  open,
  onOpenChange,
}: ReconcileAccountDialogProps) {
  const [statementBalance, setStatementBalance] = React.useState<string>(
    account.current_balance !== undefined ? String(account.current_balance) : "0.00"
  );
  const [statementDate, setStatementDate] = React.useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [notes, setNotes] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  // Sync state whenever account changes or dialog opens
  React.useEffect(() => {
    if (open) {
      setStatementBalance(
        account.current_balance !== undefined ? String(account.current_balance) : "0.00"
      );
      setStatementDate(format(new Date(), "yyyy-MM-dd"));
      setNotes("");
    }
  }, [open, account]);

  const adjustment = React.useMemo(() => {
    return calculateReconciliationAdjustment(account.current_balance, statementBalance);
  }, [account.current_balance, statementBalance]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statementBalance.trim()) {
      toast.error("Please enter your actual statement balance");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await reconcileAccountBalanceAction({
        account_id: account.id,
        actual_balance: statementBalance.trim(),
        statement_date: statementDate,
        notes: notes.trim() || null,
      });

      if (res.success) {
        toast.success(res.message || "Account reconciled successfully");
        onOpenChange(false);
      } else {
        toast.error(res.error || "Failed to reconcile balance");
      }
    } catch {
      toast.error("An unexpected error occurred during reconciliation");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-surface text-text-primary border-border p-5 rounded-2xl shadow-xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary-soft flex items-center justify-center text-primary">
              <Scale className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight text-text-primary">
                Reconcile Account Balance
              </DialogTitle>
              <DialogDescription className="text-xs text-text-secondary">
                Synchronize {account.name} with your official bank statement.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Current System Balance */}
          <div className="rounded-xl border border-border bg-surface-secondary/40 p-3.5 flex items-center justify-between">
            <div>
              <span className="text-xs text-text-secondary block font-medium">
                Current Recorded Balance
              </span>
              <MoneyDisplay
                amount={account.current_balance}
                currency={account.currency}
                className="text-base font-bold text-text-primary"
              />
            </div>
            <div className="text-right">
              <span className="text-[11px] text-text-secondary block">
                Account Type
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-text-primary">
                {account.account_type.replace("_", " ")}
              </span>
            </div>
          </div>

          {/* Statement Balance Input */}
          <div className="space-y-1.5">
            <Label htmlFor="statement-balance" className="text-xs font-medium text-text-secondary">
              Actual Statement Balance ({account.currency})
            </Label>
            <Input
              id="statement-balance"
              type="number"
              step="0.01"
              value={statementBalance}
              onChange={(e) => setStatementBalance(e.target.value)}
              placeholder="0.00"
              required
              autoFocus
              className="text-base font-semibold tabular-nums bg-surface border-border"
            />
            <p className="text-[11px] text-text-secondary">
              Enter the closing balance displayed on your net banking app or statement.
            </p>
          </div>

          {/* Statement Date */}
          <div className="space-y-1.5">
            <Label htmlFor="statement-date" className="text-xs font-medium text-text-secondary">
              Statement Date
            </Label>
            <Input
              id="statement-date"
              type="date"
              value={statementDate}
              onChange={(e) => setStatementDate(e.target.value)}
              required
              className="h-9 text-xs bg-surface border-border"
            />
          </div>

          {/* Real-Time Discrepancy & Adjustment Preview */}
          <div className="rounded-xl border border-border p-3.5 space-y-2 bg-surface">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary font-medium">Adjustment Impact:</span>
              {adjustment.adjustmentType === "none" ? (
                <span className="inline-flex items-center gap-1 font-semibold text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Perfect Sync (No adjustment needed)
                </span>
              ) : adjustment.adjustmentType === "income" ? (
                <span className="inline-flex items-center gap-1 font-semibold text-success">
                  <ArrowUpRight className="h-3.5 w-3.5" /> +{account.currency} {parseFloat(adjustment.adjustmentAmount).toFixed(2)} (Credit)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-semibold text-danger">
                  <ArrowDownRight className="h-3.5 w-3.5" /> -{account.currency} {parseFloat(adjustment.adjustmentAmount).toFixed(2)} (Debit)
                </span>
              )}
            </div>

            {adjustment.adjustmentType !== "none" && (
              <p className="text-[11px] text-text-secondary leading-relaxed">
                WealthOvers will automatically record a balance adjustment transaction on{" "}
                <span className="font-semibold text-text-primary">{format(new Date(statementDate), "dd MMM yyyy")}</span>{" "}
                to reconcile the account without altering your historical receipts.
              </p>
            )}
          </div>

          {/* Optional Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="reconcile-notes" className="text-xs font-medium text-text-secondary">
              Reconciliation Notes (Optional)
            </Label>
            <Textarea
              id="reconcile-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Bank interest earned, monthly maintenance charge, or statement audit"
              rows={2}
              className="text-xs resize-none bg-surface border-border"
            />
          </div>

          <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="border-border text-text-secondary hover:text-text-primary rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="gap-2 bg-primary hover:bg-primary-hover text-surface font-semibold rounded-xl shadow-xs transition-colors"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Scale className="h-4 w-4" />
              )}
              <span>{isSubmitting ? "Reconciling..." : "Confirm & Reconcile"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

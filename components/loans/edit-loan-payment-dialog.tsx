"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, DollarSign } from "lucide-react";
import { toast } from "sonner";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tables } from "@/types/database";
import {
  updateLoanPaymentSchema,
  UpdateLoanPaymentInput,
} from "@/lib/validations/loans";
import { updateLoanPaymentAction } from "@/app/(dashboard)/loans/actions";
import { toDecimal } from "@/lib/calculations/financial";

interface EditLoanPaymentDialogProps {
  payment: Tables<"loan_payments"> | null;
  loan: Tables<"loans"> | null;
  accounts?: Tables<"accounts">[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditLoanPaymentDialog({
  payment,
  loan,
  accounts = [],
  open,
  onOpenChange,
}: EditLoanPaymentDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<UpdateLoanPaymentInput>({
    resolver: zodResolver(updateLoanPaymentSchema),
    defaultValues: {
      payment_id: payment?.id || "",
      loan_id: loan?.id || "",
      funding_account_id: loan?.account_id || null,
      payment_date: payment?.payment_date ? payment.payment_date.slice(0, 10) : "",
      emi_amount: (payment?.emi_amount ?? 0).toString(),
      extra_prepayment: (payment?.extra_prepayment ?? 0).toString(),
    },
  });

  React.useEffect(() => {
    if (payment && loan) {
      reset({
        payment_id: payment.id,
        loan_id: loan.id,
        funding_account_id: loan.account_id || null,
        payment_date: payment.payment_date ? payment.payment_date.slice(0, 10) : "",
        emi_amount: (payment.emi_amount ?? 0).toString(),
        extra_prepayment: (payment.extra_prepayment ?? 0).toString(),
      });
    }
  }, [payment, loan, reset]);

  const emiAmount = watch("emi_amount");
  const extraPrepayment = watch("extra_prepayment");

  // Dynamic preview of recalculation
  const breakdownPreview = React.useMemo(() => {
    if (!loan || !payment) return null;
    try {
      const emi = toDecimal(emiAmount || "0");
      const extra = toDecimal(extraPrepayment || "0");
      const oldReduction = toDecimal(payment.principal_component).plus(payment.extra_prepayment);
      const priorBal = toDecimal(payment.remaining_balance).plus(oldReduction);
      const monthlyRate = toDecimal(loan.annual_interest_rate).dividedBy(1200);

      const interest = priorBal.times(monthlyRate);
      let principal = emi.minus(interest);
      if (principal.lessThan(0)) principal = toDecimal(0);

      const totalReduction = principal.plus(extra);
      let newRemaining = priorBal.minus(totalReduction);
      if (newRemaining.lessThan(0)) newRemaining = toDecimal(0);

      return {
        principal: principal.toFixed(2),
        interest: interest.toFixed(2),
        totalPaid: emi.plus(extra).toFixed(2),
        newRemaining: newRemaining.toFixed(2),
      };
    } catch {
      return null;
    }
  }, [loan, payment, emiAmount, extraPrepayment]);

  const onSubmit = async (data: UpdateLoanPaymentInput) => {
    setIsSubmitting(true);
    try {
      const res = await updateLoanPaymentAction(data);
      if (res.success) {
        toast.success(res.message || "Payment updated successfully");
        onOpenChange(false);
      } else {
        toast.error(res.error || "Failed to update payment");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!payment || !loan) return null;

  const isLending = loan.loan_type === "loan_given";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            <span>Edit {isLending ? "Repayment Received" : "Loan Repayment / EMI"}</span>
          </DialogTitle>
          <DialogDescription>
            Correct the payment date or amount. Loan balance will be recalculated automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Payment Date */}
          <div className="space-y-1.5">
            <Label>Payment Date</Label>
            <Input type="date" {...register("payment_date")} />
            {errors.payment_date && (
              <p className="text-xs text-danger">{errors.payment_date.message}</p>
            )}
          </div>

          {/* EMI Amount */}
          <div className="space-y-1.5">
            <Label>{isLending ? "Amount Received (₹)" : "Regular EMI Paid (₹)"}</Label>
            <Input
              type="number"
              step="0.01"
              {...register("emi_amount")}
              placeholder="15000"
            />
            {errors.emi_amount && (
              <p className="text-xs text-danger">{errors.emi_amount.message}</p>
            )}
          </div>

          {/* Extra Prepayment */}
          <div className="space-y-1.5">
            <Label>Extra Principal Prepayment (₹)</Label>
            <Input
              type="number"
              step="0.01"
              {...register("extra_prepayment")}
              placeholder="0.00"
            />
            {errors.extra_prepayment && (
              <p className="text-xs text-danger">{errors.extra_prepayment.message}</p>
            )}
          </div>

          {/* Funding Account */}
          {accounts.length > 0 && (
            <div className="space-y-1.5">
              <Label>{isLending ? "Deposited To Account" : "Paid From Account"}</Label>
              <Select
                value={watch("funding_account_id") || "none"}
                onValueChange={(val) =>
                  setValue("funding_account_id", val === "none" ? null : val)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Untracked)</SelectItem>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency || "INR"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Live Preview Box */}
          {breakdownPreview && (
            <div className="p-3 rounded-xl bg-surface-secondary/50 border border-border/80 space-y-1 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Principal Reduction:</span>
                <span className="font-mono font-medium text-foreground">
                  ₹{parseFloat(breakdownPreview.principal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Interest Component:</span>
                <span className="font-mono font-medium text-foreground">
                  ₹{parseFloat(breakdownPreview.interest).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground pt-1 border-t border-border/60">
                <span className="font-semibold text-foreground">New Remaining Balance:</span>
                <span className="font-mono font-bold text-primary">
                  ₹{parseFloat(breakdownPreview.newRemaining).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary-hover"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Update Payment</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


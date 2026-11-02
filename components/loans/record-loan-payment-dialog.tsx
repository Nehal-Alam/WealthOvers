"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

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
import {
  recordLoanPaymentSchema,
  RecordLoanPaymentInput,
} from "@/lib/validations/loans";
import { recordLoanPaymentAction } from "@/app/(dashboard)/loans/actions";
import { Tables } from "@/types/database";

interface RecordLoanPaymentDialogProps {
  loan: Tables<"loans"> | null;
  accounts?: Tables<"accounts">[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecordLoanPaymentDialog({
  loan,
  accounts = [],
  open,
  onOpenChange,
}: RecordLoanPaymentDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const payingAccounts = React.useMemo(
    () => accounts.filter((a) => !a.is_archived && a.account_type !== "credit_card"),
    [accounts]
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<RecordLoanPaymentInput>({
    resolver: zodResolver(recordLoanPaymentSchema),
    defaultValues: {
      loan_id: loan?.id || "",
      funding_account_id: payingAccounts[0]?.id || null,
      payment_date: format(new Date(), "yyyy-MM-dd"),
      emi_amount: loan?.monthly_emi?.toString() || "0.00",
      extra_prepayment: "0.00",
    },
  });

  React.useEffect(() => {
    if (loan) {
      reset({
        loan_id: loan.id,
        funding_account_id: payingAccounts[0]?.id || null,
        payment_date: format(new Date(), "yyyy-MM-dd"),
        emi_amount: loan.monthly_emi.toString(),
        extra_prepayment: "0.00",
      });
    }
  }, [loan, reset, payingAccounts]);

  const onSubmit = async (data: RecordLoanPaymentInput) => {
    setIsSubmitting(true);
    try {
      const res = await recordLoanPaymentAction(data);
      if (res.success) {
        toast.success(res.message || "Payment recorded");
        onOpenChange(false);
      } else {
        toast.error(res.error || "Failed to record payment");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!loan) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            <span>Record Loan Payment</span>
          </DialogTitle>
          <DialogDescription>
            Record regular EMI or extra principal prepayment for{" "}
            <span className="font-semibold text-foreground">
              {loan.lender_or_borrower_name}
            </span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {payingAccounts.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">
                {loan.loan_type === "loan_given"
                  ? "Deposit Inflow Into Bank Account"
                  : "Debit Payment From Bank Account"}
              </Label>
              <Select
                value={watch("funding_account_id") || "none"}
                onValueChange={(val) => setValue("funding_account_id", val === "none" ? null : val)}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Do not update bank balance" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="none">Do not update bank balance</SelectItem>
                  {payingAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} (₹{parseFloat(String(acc.current_balance)).toLocaleString("en-IN")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="pay-date">Payment Date</Label>
            <Input id="pay-date" type="date" {...register("payment_date")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pay-emi">Regular EMI (INR)</Label>
              <Input
                id="pay-emi"
                type="number"
                step="0.01"
                {...register("emi_amount")}
              />
              {errors.emi_amount && (
                <p className="text-xs text-destructive">{errors.emi_amount.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pay-extra">Extra Prepayment</Label>
              <Input
                id="pay-extra"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register("extra_prepayment")}
              />
            </div>
          </div>

          <div className="rounded-lg border bg-muted/30 p-2.5 text-xs text-muted-foreground">
            Current Outstanding: ₹
            {parseFloat(loan.outstanding_balance.toString()).toLocaleString()}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


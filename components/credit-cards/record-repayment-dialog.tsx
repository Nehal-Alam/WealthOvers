"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreditCard, Loader2, ArrowRightLeft } from "lucide-react";
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
  recordCreditCardRepaymentSchema,
  RecordCreditCardRepaymentInput,
} from "@/lib/validations/credit-cards";
import { recordCreditCardRepaymentAction } from "@/app/(dashboard)/credit-cards/actions";
import { Tables } from "@/types/database";

interface RecordCardRepaymentDialogProps {
  creditCard: Tables<"credit_cards"> | null;
  accounts: Tables<"accounts">[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecordCardRepaymentDialog({
  creditCard,
  accounts,
  open,
  onOpenChange,
}: RecordCardRepaymentDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Filter bank/liquid accounts for paying
  const payingAccounts = React.useMemo(
    () =>
      accounts.filter(
        (a) =>
          !a.is_archived &&
          a.account_type !== "credit_card" &&
          a.account_type !== "loan_account"
      ),
    [accounts]
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<RecordCreditCardRepaymentInput>({
    resolver: zodResolver(recordCreditCardRepaymentSchema),
    defaultValues: {
      credit_card_id: creditCard?.id || "",
      paying_account_id: payingAccounts[0]?.id || "",
      amount: creditCard ? String(creditCard.current_outstanding) : "0",
      payment_date: format(new Date(), "yyyy-MM-dd"),
      notes: "",
    },
  });

  React.useEffect(() => {
    if (creditCard) {
      setValue("credit_card_id", creditCard.id);
      setValue("amount", String(creditCard.current_outstanding || 0));
    }
  }, [creditCard, setValue]);

  const onSubmit = async (data: RecordCreditCardRepaymentInput) => {
    setIsSubmitting(true);
    try {
      const res = await recordCreditCardRepaymentAction(data);
      if (res.success) {
        toast.success(res.message || "Repayment recorded successfully");
        reset();
        onOpenChange(false);
      } else {
        toast.error(res.error || "Failed to record card repayment");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!creditCard) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] bg-surface text-text-primary border-border">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Repay Credit Card Outstanding
              </DialogTitle>
              <DialogDescription className="text-xs text-text-secondary">
                Pay bill for {creditCard.issuer_name} {creditCard.card_name} (•••• {creditCard.last_four_digits}).
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Paying Account */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-text-primary">
              Debit Bank Account <span className="text-danger">*</span>
            </Label>
            <Select
              value={watch("paying_account_id")}
              onValueChange={(val) => setValue("paying_account_id", val)}
            >
              <SelectTrigger className="bg-surface border-border text-xs">
                <SelectValue placeholder="Select paying account" />
              </SelectTrigger>
              <SelectContent className="bg-surface border-border text-xs">
                {payingAccounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name} (₹{parseFloat(String(acc.current_balance)).toLocaleString("en-IN")})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.paying_account_id && (
              <p className="text-[11px] text-danger">{errors.paying_account_id.message}</p>
            )}
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-text-primary">
                Payment Amount (₹) <span className="text-danger">*</span>
              </Label>
              <Input
                {...register("amount")}
                type="number"
                step="any"
                placeholder="0.00"
                className="bg-surface border-border text-xs font-mono"
              />
              {errors.amount && (
                <p className="text-[11px] text-danger">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-text-primary">
                Payment Date
              </Label>
              <Input
                {...register("payment_date")}
                type="date"
                className="bg-surface border-border text-xs"
              />
              {errors.payment_date && (
                <p className="text-[11px] text-danger">{errors.payment_date.message}</p>
              )}
            </div>
          </div>

          {/* Quick Amount Presets */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setValue("amount", String(creditCard.current_outstanding || 0))}
              className="text-[11px] h-7 border-border"
            >
              Full Outstanding (₹{parseFloat(String(creditCard.current_outstanding || 0)).toLocaleString("en-IN")})
            </Button>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-text-primary">
              Notes (Optional)
            </Label>
            <Input
              {...register("notes")}
              placeholder="e.g. Monthly bill settlement"
              className="bg-surface border-border text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-border text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary-hover text-surface text-xs font-semibold gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  <span>Record Payment</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


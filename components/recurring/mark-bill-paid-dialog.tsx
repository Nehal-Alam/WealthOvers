"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, Landmark, Receipt, Calendar } from "lucide-react";
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
import { markBillPaidSchema, MarkBillPaidInput } from "@/lib/validations/recurring";
import { markBillPaidAction } from "@/app/(dashboard)/recurring/actions";
import { Tables } from "@/types/database";

interface MarkBillPaidDialogProps {
  recurring: Tables<"recurring_transactions"> | null;
  occurrence?: Tables<"bill_occurrences"> | null;
  accounts: Tables<"accounts">[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function MarkBillPaidDialog({
  recurring,
  occurrence,
  accounts,
  open,
  onOpenChange,
  onSuccess,
}: MarkBillPaidDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const defaultAccount =
    accounts.find((a) => a.id === recurring?.account_id) || accounts[0];

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<MarkBillPaidInput>({
    resolver: zodResolver(markBillPaidSchema) as any,
    defaultValues: {
      recurring_id: recurring?.id || "",
      occurrence_id: occurrence?.id || null,
      account_id: defaultAccount?.id || "",
      paid_amount: occurrence?.amount?.toString() || recurring?.amount?.toString() || "",
      paid_date: format(new Date(), "yyyy-MM-dd"),
      payment_method: "bank_transfer",
      notes: "",
    },
  });

  React.useEffect(() => {
    if (recurring) {
      const acc = accounts.find((a) => a.id === recurring.account_id) || accounts[0];
      reset({
        recurring_id: recurring.id,
        occurrence_id: occurrence?.id || null,
        account_id: acc?.id || "",
        paid_amount: (occurrence?.amount || recurring.amount).toString(),
        paid_date: format(new Date(), "yyyy-MM-dd"),
        payment_method: "bank_transfer",
        notes: "",
      });
    }
  }, [recurring, occurrence, accounts, reset]);

  const onSubmit = async (data: MarkBillPaidInput) => {
    setIsSubmitting(true);
    try {
      const res = await markBillPaidAction(data);
      if (res.success) {
        toast.success(res.message || "Bill recorded as paid!");
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(res.error || "Failed to mark bill as paid");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!recurring) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] bg-surface text-text-primary border-border p-5 rounded-2xl shadow-xl">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight text-text-primary">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <span>Mark Bill as Paid</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-text-secondary">
            Confirm bill payment details and post an entry to your central ledger.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Bill Overview Banner */}
          <div className="p-3 rounded-xl bg-surface-secondary/70 border border-border/70 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-text-primary">{recurring.name}</p>
              <p className="text-[11px] text-text-secondary capitalize">
                {recurring.recurrence_interval} bill schedule
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-bold text-text-primary">
                ₹{parseFloat(recurring.amount.toString()).toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* Paid Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="paid-amt" className="text-xs font-medium text-text-secondary">
              Amount Paid (₹) *
            </Label>
            <Input
              id="paid-amt"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register("paid_amount")}
              className="h-9 text-xs font-semibold tabular-nums bg-surface border-border text-text-primary"
            />
            {errors.paid_amount && (
              <p className="text-xs text-danger">{errors.paid_amount.message}</p>
            )}
          </div>

          {/* Payment Account */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-text-secondary">
              Deducted From Account *
            </Label>
            <Select
              defaultValue={defaultAccount?.id}
              onValueChange={(val) => setValue("account_id", val)}
            >
              <SelectTrigger className="h-9 text-xs bg-surface border-border">
                <SelectValue placeholder="Select Account" />
              </SelectTrigger>
              <SelectContent className="bg-surface text-text-primary border-border">
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name} ({acc.institution_name || "Account"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.account_id && (
              <p className="text-xs text-danger">{errors.account_id.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Payment Date */}
            <div className="space-y-1.5">
              <Label htmlFor="paid-date" className="text-xs font-medium text-text-secondary">
                Payment Date *
              </Label>
              <Input
                id="paid-date"
                type="date"
                {...register("paid_date")}
                className="h-9 text-xs bg-surface border-border text-text-primary"
              />
            </div>

            {/* Payment Method */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-text-secondary">
                Method
              </Label>
              <Select
                defaultValue="bank_transfer"
                onValueChange={(val) => setValue("payment_method", val)}
              >
                <SelectTrigger className="h-9 text-xs bg-surface border-border">
                  <SelectValue placeholder="Method" />
                </SelectTrigger>
                <SelectContent className="bg-surface text-text-primary border-border">
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="debit_card">Debit Card</SelectItem>
                  <SelectItem value="auto_debit">Auto Debit (NACH)</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="paid-notes" className="text-xs font-medium text-text-secondary">
              Notes (Optional)
            </Label>
            <Input
              id="paid-notes"
              placeholder="e.g. Reference number, invoice ID..."
              {...register("notes")}
              className="h-9 text-xs bg-surface border-border text-text-primary"
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
              className="bg-success hover:bg-success/90 text-surface font-semibold rounded-xl shadow-xs transition-colors"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Payment & Record
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


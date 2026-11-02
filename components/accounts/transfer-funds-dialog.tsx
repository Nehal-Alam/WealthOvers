"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  transferFundsSchema,
  TransferFundsInput,
} from "@/lib/validations/accounts";
import { transferFundsAction } from "@/app/(dashboard)/accounts/actions";
import { Tables } from "@/types/database";
import { MoneyDisplay } from "@/components/financial/money-display";

interface TransferFundsDialogProps {
  accounts: Tables<"accounts">[];
  defaultSourceId?: string;
  defaultDestinationId?: string;
  trigger?: React.ReactNode | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TransferFundsDialog({
  accounts,
  defaultSourceId,
  defaultDestinationId,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: TransferFundsDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = React.useCallback(
    (val: boolean) => {
      if (isControlled) {
        onOpenChange?.(val);
      } else {
        setInternalOpen(val);
      }
    },
    [isControlled, onOpenChange]
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const activeAccounts = React.useMemo(
    () => accounts.filter((a) => !a.is_archived),
    [accounts]
  );

  const initialSource =
    defaultSourceId ||
    activeAccounts.find((a) => a.id !== defaultDestinationId)?.id ||
    activeAccounts[0]?.id ||
    "";
  const initialDest =
    defaultDestinationId ||
    activeAccounts.find((a) => a.id !== initialSource)?.id ||
    "";

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<TransferFundsInput>({
    resolver: zodResolver(transferFundsSchema),
    defaultValues: {
      source_account_id: initialSource,
      destination_account_id: initialDest,
      amount: "",
      transaction_date: format(new Date(), "yyyy-MM-dd"),
      description: "",
      notes: "",
    },
  });

  React.useEffect(() => {
    if (open) {
      if (defaultSourceId) setValue("source_account_id", defaultSourceId);
      if (defaultDestinationId) setValue("destination_account_id", defaultDestinationId);
    }
  }, [open, defaultSourceId, defaultDestinationId, setValue]);

  const selectedSourceId = watch("source_account_id");
  const selectedDestId = watch("destination_account_id");

  const sourceAccount = activeAccounts.find((a) => a.id === selectedSourceId);
  const destAccount = activeAccounts.find((a) => a.id === selectedDestId);

  const onSubmit = async (data: TransferFundsInput) => {
    setIsSubmitting(true);
    try {
      const res = await transferFundsAction(data);
      if (res.success) {
        toast.success(res.message || "Transfer completed successfully");
        reset();
        setOpen(false);
      } else {
        toast.error(res.error || "Transfer failed");
      }
    } catch {
      toast.error("An unexpected error occurred during transfer");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger !== null && (
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" className="gap-2 rounded-xl border-border bg-surface text-text-primary hover:bg-surface-secondary">
              <ArrowLeftRight className="h-4 w-4 text-primary" />
              <span>Transfer Funds</span>
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[480px] bg-surface text-text-primary border-border p-5 rounded-2xl shadow-xl">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight text-text-primary">
            <ArrowLeftRight className="h-5 w-5 text-primary" />
            <span>Inter-Account Transfer</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-text-secondary">
            Move money seamlessly between two accounts with atomic balance updates.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Source Account */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="source-acc" className="text-xs font-medium text-text-secondary">
                From Account
              </Label>
              {sourceAccount && (
                <span className="text-xs text-text-secondary flex items-center gap-1">
                  Balance: <MoneyDisplay amount={sourceAccount.current_balance} />
                </span>
              )}
            </div>
            <Select
              value={selectedSourceId}
              onValueChange={(val) => {
                setValue("source_account_id", val);
                if (val === selectedDestId) {
                  const alt = activeAccounts.find((a) => a.id !== val);
                  if (alt) setValue("destination_account_id", alt.id);
                }
              }}
            >
              <SelectTrigger id="source-acc" className="h-9 text-xs bg-surface border-border">
                <SelectValue placeholder="Select source account" />
              </SelectTrigger>
              <SelectContent className="bg-surface text-text-primary border-border">
                {activeAccounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name} ({acc.institution_name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.source_account_id && (
              <p className="text-xs text-danger">
                {errors.source_account_id.message}
              </p>
            )}
          </div>

          {/* Destination Account */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="dest-acc" className="text-xs font-medium text-text-secondary">
                To Account
              </Label>
              {destAccount && (
                <span className="text-xs text-text-secondary flex items-center gap-1">
                  Balance: <MoneyDisplay amount={destAccount.current_balance} />
                </span>
              )}
            </div>
            <Select
              value={selectedDestId}
              onValueChange={(val) => setValue("destination_account_id", val)}
            >
              <SelectTrigger id="dest-acc" className="h-9 text-xs bg-surface border-border">
                <SelectValue placeholder="Select destination account" />
              </SelectTrigger>
              <SelectContent className="bg-surface text-text-primary border-border">
                {activeAccounts
                  .filter((acc) => acc.id !== selectedSourceId)
                  .map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({acc.institution_name})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {errors.destination_account_id && (
              <p className="text-xs text-danger">
                {errors.destination_account_id.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Transfer Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="transfer-amt" className="text-xs font-medium text-text-secondary">
                Transfer Amount (INR)
              </Label>
              <Input
                id="transfer-amt"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register("amount")}
                className="h-9 text-xs font-semibold tabular-nums bg-surface border-border"
              />
              {errors.amount && (
                <p className="text-xs text-danger">{errors.amount.message}</p>
              )}
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="transfer-date" className="text-xs font-medium text-text-secondary">
                Date
              </Label>
              <Input
                id="transfer-date"
                type="date"
                {...register("transaction_date")}
                className="h-9 text-xs bg-surface border-border"
              />
              {errors.transaction_date && (
                <p className="text-xs text-danger">
                  {errors.transaction_date.message}
                </p>
              )}
            </div>
          </div>

          {/* Optional Description */}
          <div className="space-y-1.5">
            <Label htmlFor="transfer-desc" className="text-xs font-medium text-text-secondary">
              Description (Optional)
            </Label>
            <Input
              id="transfer-desc"
              placeholder="e.g. Monthly Savings, Credit card bill"
              {...register("description")}
              className="h-9 text-xs bg-surface border-border"
            />
          </div>

          <DialogFooter className="pt-4 flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
              className="border-border text-text-secondary hover:text-text-primary rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary-hover text-surface font-semibold rounded-xl shadow-xs transition-colors"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Transfer Now
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

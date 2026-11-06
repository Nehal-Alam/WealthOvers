"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, PiggyBank, ArrowDownRight, ArrowUpRight, ShieldCheck } from "lucide-react";
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
import { contributeGoalSchema, ContributeGoalInput } from "@/lib/validations/goals";
import { contributeGoalAction } from "@/app/(dashboard)/goals/actions";
import { Tables } from "@/types/database";

interface ContributeGoalDialogProps {
  goal: Tables<"financial_goals"> | null;
  accounts?: Tables<"accounts">[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContributeGoalDialog({
  goal,
  accounts = [],
  open,
  onOpenChange,
}: ContributeGoalDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ContributeGoalInput>({
    resolver: zodResolver(contributeGoalSchema) as any,
    defaultValues: {
      goal_id: goal?.id || "",
      amount: "",
      contribution_type: "deposit",
      contribution_date: format(new Date(), "yyyy-MM-dd"),
      notes: "",
    },
  });

  const contributionType = watch("contribution_type") || "deposit";

  React.useEffect(() => {
    if (goal) {
      reset({
        goal_id: goal.id,
        amount: "",
        contribution_type: "deposit",
        contribution_date: format(new Date(), "yyyy-MM-dd"),
        notes: "",
      });
    }
  }, [goal, reset]);

  const onSubmit = async (data: ContributeGoalInput) => {
    setIsSubmitting(true);
    try {
      const res = await contributeGoalAction(data);
      if (res.success) {
        toast.success(res.message || "Goal balance updated");
        onOpenChange(false);
      } else {
        toast.error(res.error || "Failed to record contribution");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!goal) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] bg-surface text-text-primary border-border p-5 rounded-2xl shadow-xl">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight text-text-primary">
            <PiggyBank className="h-5 w-5 text-primary" />
            <span>Manage Funds — {goal.name}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-text-secondary">
            Deposit savings towards this goal or withdraw for planned milestone purchases.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Action Type Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-surface-secondary rounded-xl border border-border/60">
            <button
              type="button"
              onClick={() => setValue("contribution_type", "deposit")}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                contributionType === "deposit"
                  ? "bg-surface text-success shadow-2xs font-bold"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <ArrowUpRight className="h-3.5 w-3.5 text-success" />
              <span>Deposit (Save)</span>
            </button>

            <button
              type="button"
              onClick={() => setValue("contribution_type", "withdrawal")}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                contributionType === "withdrawal"
                  ? "bg-surface text-danger shadow-2xs font-bold"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <ArrowDownRight className="h-3.5 w-3.5 text-danger" />
              <span>Withdraw</span>
            </button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contrib-amt" className="text-xs font-medium text-text-secondary">
              Amount (₹) *
            </Label>
            <Input
              id="contrib-amt"
              type="number"
              step="0.01"
              placeholder="5000.00"
              autoFocus
              {...register("amount")}
              className="h-9 text-xs font-semibold tabular-nums bg-surface border-border text-text-primary"
            />
            {errors.amount && (
              <p className="text-xs text-danger">{errors.amount.message}</p>
            )}
          </div>

          {/* Source Account (Optional) */}
          {accounts.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-text-secondary">
                Linked Account (Optional)
              </Label>
              <Select onValueChange={(val) => setValue("account_id", val)}>
                <SelectTrigger className="h-9 text-xs bg-surface border-border">
                  <SelectValue placeholder="Select funding account" />
                </SelectTrigger>
                <SelectContent className="bg-surface text-text-primary border-border">
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({acc.institution_name || "Account"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="contrib-date" className="text-xs font-medium text-text-secondary">
              Date
            </Label>
            <Input
              id="contrib-date"
              type="date"
              {...register("contribution_date")}
              className="h-9 text-xs bg-surface border-border text-text-primary"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contrib-notes" className="text-xs font-medium text-text-secondary">
              Notes (Optional)
            </Label>
            <Input
              id="contrib-notes"
              placeholder="e.g. Monthly salary savings allocation"
              {...register("notes")}
              className="h-9 text-xs bg-surface border-border text-text-primary"
            />
          </div>

          {/* Guarantee Note */}
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-primary/5 border border-primary/20 text-[11px] text-text-secondary">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
            <span>
              Goal contributions represent targeted internal allocations and will never inflate your overall net worth.
            </span>
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
              className="bg-primary hover:bg-primary-hover text-surface font-semibold rounded-xl shadow-xs transition-colors"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {contributionType === "deposit" ? "Record Deposit" : "Record Withdrawal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

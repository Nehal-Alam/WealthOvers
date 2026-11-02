"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, PiggyBank } from "lucide-react";
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
import { contributeGoalSchema, ContributeGoalInput } from "@/lib/validations/goals";
import { contributeGoalAction } from "@/app/(dashboard)/goals/actions";
import { Tables } from "@/types/database";

interface ContributeGoalDialogProps {
  goal: Tables<"financial_goals"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContributeGoalDialog({
  goal,
  open,
  onOpenChange,
}: ContributeGoalDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContributeGoalInput>({
    resolver: zodResolver(contributeGoalSchema),
    defaultValues: {
      goal_id: goal?.id || "",
      amount: "",
      contribution_date: format(new Date(), "yyyy-MM-dd"),
      notes: "",
    },
  });

  React.useEffect(() => {
    if (goal) {
      reset({
        goal_id: goal.id,
        amount: "",
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
        toast.success(res.message || "Contribution added!");
        onOpenChange(false);
      } else {
        toast.error(res.error || "Failed to add contribution");
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
      <DialogContent className="sm:max-w-[420px] bg-surface text-text-primary border-border p-5 rounded-2xl shadow-xl">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight text-text-primary">
            <PiggyBank className="h-5 w-5 text-primary" />
            <span>Add Funds to {goal.name}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-text-secondary">
            Record a contribution towards your goal target.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="contrib-amt" className="text-xs font-medium text-text-secondary">
              Contribution Amount (INR)
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

          <DialogFooter className="pt-4 flex flex-col sm:flex-row gap-2">
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
              Save Contribution
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

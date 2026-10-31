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
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PiggyBank className="h-4 w-4 text-primary" />
            <span>Add Funds to {goal.name}</span>
          </DialogTitle>
          <DialogDescription>
            Record a contribution towards your goal target.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="contrib-amt">Contribution Amount (INR)</Label>
            <Input
              id="contrib-amt"
              type="number"
              step="0.01"
              placeholder="10000.00"
              autoFocus
              {...register("amount")}
            />
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contrib-date">Date</Label>
            <Input id="contrib-date" type="date" {...register("contribution_date")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contrib-notes">Notes (Optional)</Label>
            <Input
              id="contrib-notes"
              placeholder="e.g. Monthly SIP, Festival Bonus"
              {...register("notes")}
            />
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
              Save Contribution
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


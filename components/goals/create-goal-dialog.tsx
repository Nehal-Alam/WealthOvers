"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle, Loader2, Target, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { format, addYears } from "date-fns";

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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createGoalSchema,
  CreateGoalInput,
  goalCategoryValues,
  goalPriorityValues,
} from "@/lib/validations/goals";
import { createGoalAction } from "@/app/(dashboard)/goals/actions";

interface CreateGoalDialogProps {
  trigger?: React.ReactNode;
}

export function CreateGoalDialog({ trigger }: CreateGoalDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const defaultStartDate = format(new Date(), "yyyy-MM-dd");
  const defaultTargetDate = format(addYears(new Date(), 3), "yyyy-MM-dd");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateGoalInput>({
    resolver: zodResolver(createGoalSchema) as any,
    defaultValues: {
      name: "",
      target_amount: "",
      current_amount: "0.00",
      start_date: defaultStartDate,
      target_date: defaultTargetDate,
      category: "Emergency Fund",
      priority: "medium",
      contribution_frequency: "monthly",
      planned_contribution_amount: "",
      notes: "",
    },
  });

  const targetAmount = watch("target_amount");
  const currentAmount = watch("current_amount");
  const targetDate = watch("target_date");

  // Live estimated monthly savings recommendation
  const monthlyRecommendation = React.useMemo(() => {
    const t = parseFloat(targetAmount || "0");
    const c = parseFloat(currentAmount || "0");
    if (!t || isNaN(t) || t <= c) return null;
    if (!targetDate) return null;

    const months = Math.max(
      1,
      Math.round(
        (new Date(targetDate).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24 * 30.4375)
      )
    );
    const needed = (t - c) / months;
    return {
      months,
      monthlyNeeded: Math.ceil(needed),
    };
  }, [targetAmount, currentAmount, targetDate]);

  const onSubmit = async (data: CreateGoalInput) => {
    setIsSubmitting(true);
    try {
      const res = await createGoalAction(data);
      if (res.success) {
        toast.success(res.message || "Financial goal established");
        reset();
        setOpen(false);
      } else {
        toast.error(res.error || "Failed to create goal");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2 bg-primary hover:bg-primary-hover text-surface rounded-xl shadow-xs transition-colors">
            <PlusCircle className="h-4 w-4" />
            <span>New Financial Goal</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px] bg-surface text-text-primary border-border p-5 rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight text-text-primary">
            <Target className="h-5 w-5 text-primary" />
            <span>Create Financial Goal</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-text-secondary">
            Target savings goals with automated monthly milestone projections and ledger linking.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Goal Name */}
          <div className="space-y-1.5">
            <Label htmlFor="goal-name" className="text-xs font-medium text-text-secondary">
              Goal Name *
            </Label>
            <Input
              id="goal-name"
              placeholder="e.g. Emergency Fund, House Down Payment, Child Education"
              {...register("name")}
              className="h-9 text-xs bg-surface border-border text-text-primary"
            />
            {errors.name && (
              <p className="text-xs text-danger">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Category */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-text-secondary">
                Category
              </Label>
              <Select
                defaultValue="Emergency Fund"
                onValueChange={(val: any) => setValue("category", val)}
              >
                <SelectTrigger className="h-9 text-xs bg-surface border-border">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-surface text-text-primary border-border">
                  {goalCategoryValues.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-text-secondary">
                Priority
              </Label>
              <Select
                defaultValue="medium"
                onValueChange={(val: any) => setValue("priority", val)}
              >
                <SelectTrigger className="h-9 text-xs bg-surface border-border">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent className="bg-surface text-text-primary border-border">
                  {goalPriorityValues.map((p) => (
                    <SelectItem key={p} value={p}>
                      <span className="capitalize">{p} Priority</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Target Corpus */}
            <div className="space-y-1.5">
              <Label htmlFor="goal-target" className="text-xs font-medium text-text-secondary">
                Target Amount (₹) *
              </Label>
              <Input
                id="goal-target"
                type="number"
                step="0.01"
                placeholder="500000.00"
                {...register("target_amount")}
                className="h-9 text-xs font-semibold tabular-nums bg-surface border-border"
              />
              {errors.target_amount && (
                <p className="text-xs text-danger">
                  {errors.target_amount.message}
                </p>
              )}
            </div>

            {/* Current Seed Capital */}
            <div className="space-y-1.5">
              <Label htmlFor="goal-current" className="text-xs font-medium text-text-secondary">
                Initial Saved (₹)
              </Label>
              <Input
                id="goal-current"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register("current_amount")}
                className="h-9 text-xs font-semibold tabular-nums bg-surface border-border"
              />
              {errors.current_amount && (
                <p className="text-xs text-danger">
                  {errors.current_amount.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Start Date */}
            <div className="space-y-1.5">
              <Label htmlFor="goal-start-date" className="text-xs font-medium text-text-secondary">
                Start Date
              </Label>
              <Input
                id="goal-start-date"
                type="date"
                {...register("start_date")}
                className="h-9 text-xs bg-surface border-border"
              />
            </div>

            {/* Target Date */}
            <div className="space-y-1.5">
              <Label htmlFor="goal-target-date" className="text-xs font-medium text-text-secondary">
                Target Date *
              </Label>
              <Input
                id="goal-target-date"
                type="date"
                {...register("target_date")}
                className="h-9 text-xs bg-surface border-border"
              />
              {errors.target_date && (
                <p className="text-xs text-danger">
                  {errors.target_date.message}
                </p>
              )}
            </div>
          </div>

          {/* Monthly Recommendation Preview */}
          {monthlyRecommendation && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-text-primary">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <span>
                To reach target in <strong>{monthlyRecommendation.months} months</strong>, plan to save approximately{" "}
                <strong className="text-primary font-mono">
                  ₹{monthlyRecommendation.monthlyNeeded.toLocaleString("en-IN")}/month
                </strong>.
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* Planned Contribution Amount */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-text-secondary">
                Planned Contribution (₹)
              </Label>
              <Input
                type="number"
                step="0.01"
                placeholder={
                  monthlyRecommendation
                    ? `${monthlyRecommendation.monthlyNeeded}`
                    : "e.g. 10000"
                }
                {...register("planned_contribution_amount")}
                className="h-9 text-xs tabular-nums bg-surface border-border"
              />
            </div>

            {/* Contribution Frequency */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-text-secondary">
                Frequency
              </Label>
              <Select
                defaultValue="monthly"
                onValueChange={(val: any) => setValue("contribution_frequency", val)}
              >
                <SelectTrigger className="h-9 text-xs bg-surface border-border">
                  <SelectValue placeholder="Frequency" />
                </SelectTrigger>
                <SelectContent className="bg-surface text-text-primary border-border">
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-text-secondary">
              Notes (Optional)
            </Label>
            <Textarea
              placeholder="Rationale, target milestone, or strategy..."
              {...register("notes")}
              className="text-xs bg-surface border-border resize-none h-16"
            />
          </div>

          <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
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
              Create Goal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

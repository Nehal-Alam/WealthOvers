"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle, Loader2, Target } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createGoalSchema, CreateGoalInput } from "@/lib/validations/goals";
import { createGoalAction } from "@/app/(dashboard)/goals/actions";

interface CreateGoalDialogProps {
  trigger?: React.ReactNode;
}

export function CreateGoalDialog({ trigger }: CreateGoalDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const defaultTargetDate = format(addYears(new Date(), 3), "yyyy-MM-dd");

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateGoalInput>({
    resolver: zodResolver(createGoalSchema),
    defaultValues: {
      name: "",
      target_amount: "",
      current_amount: "0.00",
      target_date: defaultTargetDate,
      category: "General",
    },
  });

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
      <DialogContent className="sm:max-w-[460px] bg-surface text-text-primary border-border p-5 rounded-2xl shadow-xl">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight text-text-primary">
            <Target className="h-5 w-5 text-primary" />
            <span>Create Financial Goal</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-text-secondary">
            Target long-term savings goals with automated monthly milestone projections.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Goal Name */}
          <div className="space-y-1.5">
            <Label htmlFor="goal-name" className="text-xs font-medium text-text-secondary">
              Goal Name
            </Label>
            <Input
              id="goal-name"
              placeholder="e.g. Emergency Fund, Apartment Down Payment"
              {...register("name")}
              className="h-9 text-xs bg-surface border-border text-text-primary"
            />
            {errors.name && (
              <p className="text-xs text-danger">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Target Corpus */}
            <div className="space-y-1.5">
              <Label htmlFor="goal-target" className="text-xs font-medium text-text-secondary">
                Target Corpus (INR)
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
                Already Saved (INR)
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
            {/* Target Date */}
            <div className="space-y-1.5">
              <Label htmlFor="goal-date" className="text-xs font-medium text-text-secondary">
                Target Date
              </Label>
              <Input
                id="goal-date"
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

            {/* Category */}
            <div className="space-y-1.5">
              <Label htmlFor="goal-cat" className="text-xs font-medium text-text-secondary">
                Category
              </Label>
              <Select
                defaultValue="General"
                onValueChange={(val) => setValue("category", val)}
              >
                <SelectTrigger id="goal-cat" className="h-9 text-xs bg-surface border-border">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-surface text-text-primary border-border">
                  <SelectItem value="Emergency">Emergency Reserve</SelectItem>
                  <SelectItem value="Retirement">Retirement</SelectItem>
                  <SelectItem value="Home">Home & Real Estate</SelectItem>
                  <SelectItem value="Vehicle">Vehicle Purchase</SelectItem>
                  <SelectItem value="Vacation">Vacation / Travel</SelectItem>
                  <SelectItem value="Education">Education</SelectItem>
                  <SelectItem value="General">General Milestone</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
              Create Goal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

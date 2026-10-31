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
          <Button className="gap-2">
            <PlusCircle className="h-4 w-4" />
            <span>New Financial Goal</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <span>Create Financial Goal</span>
          </DialogTitle>
          <DialogDescription>
            Target long-term savings goals with automated monthly milestone projections.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Goal Name */}
          <div className="space-y-1.5">
            <Label htmlFor="goal-name">Goal Title</Label>
            <Input
              id="goal-name"
              placeholder="e.g. Emergency Fund, House Downpayment, Retirement"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select
              defaultValue="General"
              onValueChange={(val) => setValue("category", val)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Emergency Fund">Emergency Fund</SelectItem>
                <SelectItem value="Real Estate">House / Downpayment</SelectItem>
                <SelectItem value="Retirement">Retirement Corpus</SelectItem>
                <SelectItem value="Vehicle">Vehicle / Automobile</SelectItem>
                <SelectItem value="Education">Higher Education</SelectItem>
                <SelectItem value="Vacation">Vacation & Travel</SelectItem>
                <SelectItem value="Wealth Creation">Wealth Creation</SelectItem>
                <SelectItem value="General">General Savings</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Target Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="goal-target">Target Amount (INR)</Label>
              <Input
                id="goal-target"
                type="number"
                step="0.01"
                placeholder="1000000.00"
                {...register("target_amount")}
              />
              {errors.target_amount && (
                <p className="text-xs text-destructive">
                  {errors.target_amount.message}
                </p>
              )}
            </div>

            {/* Current Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="goal-current">Already Saved</Label>
              <Input
                id="goal-current"
                type="number"
                step="0.01"
                placeholder="100000.00"
                {...register("current_amount")}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="goal-date">Target Date</Label>
            <Input id="goal-date" type="date" {...register("target_date")} />
            {errors.target_date && (
              <p className="text-xs text-destructive">
                {errors.target_date.message}
              </p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Goal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


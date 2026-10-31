"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle, Loader2, PiggyBank, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { startOfMonth, endOfMonth, format } from "date-fns";

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
import { Switch } from "@/components/ui/switch";
import {
  createBudgetSchema,
  CreateBudgetInput,
} from "@/lib/validations/budgets";
import { createBudgetAction } from "@/app/(dashboard)/budgets/actions";
import { Tables } from "@/types/database";

interface CreateBudgetDialogProps {
  categories: Tables<"categories">[];
  trigger?: React.ReactNode;
}

export function CreateBudgetDialog({
  categories,
  trigger,
}: CreateBudgetDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const expenseCategories = React.useMemo(
    () => categories.filter((c) => c.type === "expense"),
    [categories]
  );

  const now = new Date();
  const defaultStart = format(startOfMonth(now), "yyyy-MM-dd");
  const defaultEnd = format(endOfMonth(now), "yyyy-MM-dd");

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateBudgetInput>({
    resolver: zodResolver(createBudgetSchema),
    defaultValues: {
      name: `${format(now, "MMMM yyyy")} Budget`,
      total_amount: "",
      period_type: "monthly",
      start_date: defaultStart,
      end_date: defaultEnd,
      rollover_enabled: false,
      alert_threshold_percent: 85,
      allocations: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "allocations",
  });

  const rollover = watch("rollover_enabled");

  const onSubmit = async (data: CreateBudgetInput) => {
    setIsSubmitting(true);
    try {
      const res = await createBudgetAction(data);
      if (res.success) {
        toast.success(res.message || "Budget created");
        reset();
        setOpen(false);
      } else {
        toast.error(res.error || "Failed to create budget");
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
            <span>Create Budget</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Create Monthly Budget</DialogTitle>
          <DialogDescription>
            Set spending limits and allocate budgets to expense categories.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Budget Name */}
          <div className="space-y-1.5">
            <Label htmlFor="bgt-name">Budget Title</Label>
            <Input id="bgt-name" placeholder="e.g. November 2026 Budget" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Total Budget Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="bgt-amt">Total Limit (INR)</Label>
              <Input
                id="bgt-amt"
                type="number"
                step="0.01"
                placeholder="50000.00"
                {...register("total_amount")}
              />
              {errors.total_amount && (
                <p className="text-xs text-destructive">
                  {errors.total_amount.message}
                </p>
              )}
            </div>

            {/* Threshold Percent */}
            <div className="space-y-1.5">
              <Label htmlFor="bgt-thresh">Alert Threshold (%)</Label>
              <Input
                id="bgt-thresh"
                type="number"
                min="1"
                max="100"
                defaultValue={85}
                {...register("alert_threshold_percent", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bgt-start">Start Date</Label>
              <Input id="bgt-start" type="date" {...register("start_date")} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bgt-end">End Date</Label>
              <Input id="bgt-end" type="date" {...register("end_date")} />
            </div>
          </div>

          {/* Category Allocations */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Category Allocations (Optional)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => {
                  if (expenseCategories.length > 0) {
                    append({
                      category_id: expenseCategories[0].id,
                      allocated_amount: "5000.00",
                    });
                  }
                }}
              >
                <Plus className="h-3 w-3" />
                Add Category Limit
              </Button>
            </div>

            {fields.map((field, idx) => (
              <div key={field.id} className="flex items-center gap-2">
                <div className="flex-1">
                  <Select
                    defaultValue={field.category_id}
                    onValueChange={(val) =>
                      setValue(`allocations.${idx}.category_id`, val)
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-32">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Limit"
                    className="h-8 text-xs"
                    {...register(`allocations.${idx}.allocated_amount`)}
                  />
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => remove(idx)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>

          {/* Rollover Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3 mt-2">
            <div className="space-y-0.5">
              <Label className="text-sm">Budget Rollover</Label>
              <p className="text-xs text-muted-foreground">
                Roll forward unused funds into next month&apos;s budget.
              </p>
            </div>
            <Switch
              checked={rollover}
              onCheckedChange={(val) => setValue("rollover_enabled", val)}
            />
          </div>

          <DialogFooter className="pt-4">
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
              Save Budget
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


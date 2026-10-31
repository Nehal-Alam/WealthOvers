"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle, Loader2, Calendar } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import {
  createRecurringSchema,
  CreateRecurringInput,
  recurrenceIntervalValues,
} from "@/lib/validations/recurring";
import { createRecurringAction } from "@/app/(dashboard)/recurring/actions";
import { Tables } from "@/types/database";

interface CreateRecurringDialogProps {
  accounts: Tables<"accounts">[];
  categories: Tables<"categories">[];
  trigger?: React.ReactNode;
}

export function CreateRecurringDialog({
  accounts,
  categories,
  trigger,
}: CreateRecurringDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const activeAccounts = React.useMemo(
    () => accounts.filter((a) => !a.is_archived),
    [accounts]
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateRecurringInput>({
    resolver: zodResolver(createRecurringSchema),
    defaultValues: {
      account_id: activeAccounts[0]?.id || "",
      category_id: null,
      name: "",
      amount: "",
      currency: "INR",
      transaction_type: "expense",
      recurrence_interval: "monthly",
      interval_count: 1,
      start_date: format(new Date(), "yyyy-MM-dd"),
      end_date: null,
      auto_record: false,
      is_active: true,
    },
  });

  const selectedType = watch("transaction_type");
  const selectedInterval = watch("recurrence_interval");
  const autoRecord = watch("auto_record");

  const relevantCategories = categories.filter((c) => c.type === selectedType);

  const onSubmit = async (data: CreateRecurringInput) => {
    setIsSubmitting(true);
    try {
      const res = await createRecurringAction(data);
      if (res.success) {
        toast.success(res.message || "Recurring rule created");
        reset();
        setOpen(false);
      } else {
        toast.error(res.error || "Failed to create rule");
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
            <span>New Recurring Bill</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add Recurring Transaction</DialogTitle>
          <DialogDescription>
            Schedule predictable subscriptions, rent, salaries, and recurring EMIs.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Rule Name */}
          <div className="space-y-1.5">
            <Label htmlFor="rec-name">Title</Label>
            <Input
              id="rec-name"
              placeholder="e.g. Netflix, Apartment Rent, SIP"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="rec-amt">Amount (INR)</Label>
              <Input
                id="rec-amt"
                type="number"
                step="0.01"
                placeholder="199.00"
                {...register("amount")}
              />
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              )}
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={selectedType}
                onValueChange={(val: any) => setValue("transaction_type", val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Account */}
            <div className="space-y-1.5">
              <Label>Account</Label>
              <Select
                value={watch("account_id")}
                onValueChange={(val) => setValue("account_id", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Account" />
                </SelectTrigger>
                <SelectContent>
                  {activeAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.account_id && (
                <p className="text-xs text-destructive">
                  {errors.account_id.message}
                </p>
              )}
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={watch("category_id") || "none"}
                onValueChange={(val) =>
                  setValue("category_id", val === "none" ? null : val)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Uncategorized</SelectItem>
                  {relevantCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Interval */}
            <div className="space-y-1.5">
              <Label>Frequency</Label>
              <Select
                value={selectedInterval}
                onValueChange={(val: any) => setValue("recurrence_interval", val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="half_yearly">Half Yearly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div className="space-y-1.5">
              <Label>First Due Date</Label>
              <Input type="date" {...register("start_date")} />
              {errors.start_date && (
                <p className="text-xs text-destructive">
                  {errors.start_date.message}
                </p>
              )}
            </div>
          </div>

          {/* Auto Record Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3 mt-2">
            <div className="space-y-0.5">
              <Label className="text-sm">Auto-Record on Due Date</Label>
              <p className="text-xs text-muted-foreground">
                Automatically book this transaction to the ledger when due.
              </p>
            </div>
            <Switch
              checked={autoRecord}
              onCheckedChange={(val) => setValue("auto_record", val)}
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
              Save Recurring Rule
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


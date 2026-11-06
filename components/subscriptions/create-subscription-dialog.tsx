"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format, addMonths } from "date-fns";

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
  createSubscriptionSchema,
  CreateSubscriptionInput,
} from "@/lib/validations/subscriptions";
import { createSubscriptionAction } from "@/app/(dashboard)/subscriptions/actions";
import { Tables } from "@/types/database";

interface CreateSubscriptionDialogProps {
  accounts: Tables<"accounts">[];
  categories: Tables<"categories">[];
  trigger?: React.ReactNode;
}

export function CreateSubscriptionDialog({
  accounts,
  categories,
  trigger,
}: CreateSubscriptionDialogProps) {
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
  } = useForm<CreateSubscriptionInput>({
    resolver: zodResolver(createSubscriptionSchema),
    defaultValues: {
      name: "",
      cost: "",
      currency: "INR",
      billing_cycle: "monthly",
      account_id: activeAccounts[0]?.id || null,
      category_id: null,
      renewal_date: format(addMonths(new Date(), 1), "yyyy-MM-dd"),
      cancellation_reminder_days: 3,
      status: "active",
    },
  });

  const selectedCycle = watch("billing_cycle");
  const selectedAccount = watch("account_id");
  const selectedCategory = watch("category_id");

  const onSubmit = async (data: CreateSubscriptionInput) => {
    setIsSubmitting(true);
    try {
      const res = await createSubscriptionAction(data);
      if (res.success) {
        toast.success(res.message || "Subscription added");
        reset();
        setOpen(false);
      } else {
        toast.error(res.error || "Failed to add subscription");
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
          <Button size="sm" className="gap-1.5 h-8 text-xs font-semibold">
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Add Subscription</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px] bg-card border-border">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Add New Subscription
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Track software, streaming, memberships, and recurring service commitments.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3.5 py-4">
            {/* Subscription Name */}
            <div className="space-y-1">
              <Label htmlFor="sub-name" className="text-xs font-medium text-foreground">
                Service / Subscription Name <span className="text-danger">*</span>
              </Label>
              <Input
                id="sub-name"
                placeholder="e.g. Netflix, GitHub Pro, Gym"
                className="h-8 text-xs bg-muted/30"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-[11px] text-danger">{errors.name.message}</p>
              )}
            </div>

            {/* Cost and Currency */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="sub-cost" className="text-xs font-medium text-foreground">
                  Recurring Cost (₹) <span className="text-danger">*</span>
                </Label>
                <Input
                  id="sub-cost"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="h-8 text-xs font-mono bg-muted/30"
                  {...register("cost")}
                />
                {errors.cost && (
                  <p className="text-[11px] text-danger">{errors.cost.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium text-foreground">
                  Billing Cadence
                </Label>
                <Select
                  value={selectedCycle}
                  onValueChange={(val: any) => setValue("billing_cycle", val)}
                >
                  <SelectTrigger className="h-8 text-xs bg-muted/30">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Annual / Yearly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Renewal Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="sub-renewal" className="text-xs font-medium text-foreground">
                  Next Renewal Date <span className="text-danger">*</span>
                </Label>
                <Input
                  id="sub-renewal"
                  type="date"
                  className="h-8 text-xs bg-muted/30"
                  {...register("renewal_date")}
                />
                {errors.renewal_date && (
                  <p className="text-[11px] text-danger">{errors.renewal_date.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="sub-reminder" className="text-xs font-medium text-foreground">
                  Reminder (Days Before)
                </Label>
                <Input
                  id="sub-reminder"
                  type="number"
                  min="0"
                  max="30"
                  className="h-8 text-xs font-mono bg-muted/30"
                  {...register("cancellation_reminder_days")}
                />
              </div>
            </div>

            {/* Account Payment Source */}
            <div className="space-y-1">
              <Label className="text-xs font-medium text-foreground">
                Payment Account (Optional)
              </Label>
              <Select
                value={selectedAccount || "none"}
                onValueChange={(val) => setValue("account_id", val === "none" ? null : val)}
              >
                <SelectTrigger className="h-8 text-xs bg-muted/30">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific account</SelectItem>
                  {activeAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({acc.institution_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="space-y-1">
              <Label className="text-xs font-medium text-foreground">
                Expense Category (Optional)
              </Label>
              <Select
                value={selectedCategory || "none"}
                onValueChange={(val) => setValue("category_id", val === "none" ? null : val)}
              >
                <SelectTrigger className="h-8 text-xs bg-muted/30">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Uncategorized</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="h-8 text-xs font-semibold gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Add Subscription</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


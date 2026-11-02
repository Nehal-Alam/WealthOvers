"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle, Loader2, CreditCard } from "lucide-react";
import { toast } from "sonner";

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
  createCreditCardSchema,
  CreateCreditCardInput,
} from "@/lib/validations/credit-cards";
import { createCreditCardAction } from "@/app/(dashboard)/credit-cards/actions";
import { Tables } from "@/types/database";

interface CreateCreditCardDialogProps {
  accounts: Tables<"accounts">[];
  trigger?: React.ReactNode;
}

export function CreateCreditCardDialog({
  accounts,
  trigger,
}: CreateCreditCardDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Filter accounts of type credit_card
  const creditCardAccounts = React.useMemo(
    () => accounts.filter((a) => a.account_type === "credit_card"),
    [accounts]
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateCreditCardInput>({
    resolver: zodResolver(createCreditCardSchema),
    defaultValues: {
      account_id: creditCardAccounts[0]?.id || "",
      card_name: "",
      issuer_name: "",
      last_four_digits: "",
      credit_limit: "100000.00",
      current_outstanding: "0.00",
      statement_date_day: 15,
      payment_due_day: 5,
      apr_percentage: 42.0,
    },
  });

  const onSubmit = async (data: CreateCreditCardInput) => {
    setIsSubmitting(true);
    try {
      const res = await createCreditCardAction(data);
      if (res.success) {
        toast.success(res.message || "Credit card registered successfully");
        reset();
        setOpen(false);
      } else {
        toast.error(res.error || "Failed to register card");
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
            <span>Add Credit Card</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <span>Register Credit Card</span>
          </DialogTitle>
          <DialogDescription>
            Configure credit limits, billing cycle days, and statement payment schedules.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Linked Account */}
          <div className="space-y-1.5">
            <Label>Linked Account</Label>
            <Select
              value={watch("account_id") || "auto"}
              onValueChange={(val) => setValue("account_id", val === "auto" ? "" : val)}
            >
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Auto-create card account" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="auto">
                  ✨ Auto-create linked card account
                </SelectItem>
                {creditCardAccounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name} ({acc.institution_name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-text-secondary">
              WealthOvers will automatically link or create an underlying double-entry account.
            </p>
            {errors.account_id && (
              <p className="text-xs text-destructive">{errors.account_id.message}</p>
            )}
          </div>

          {/* Card & Issuer Name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cc-name">Card Name</Label>
              <Input
                id="cc-name"
                placeholder="e.g. HDFC Regalia, ICICI Amazon"
                {...register("card_name")}
              />
              {errors.card_name && (
                <p className="text-xs text-destructive">{errors.card_name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cc-issuer">Issuer Bank</Label>
              <Input
                id="cc-issuer"
                placeholder="e.g. HDFC Bank, SBI Card"
                {...register("issuer_name")}
              />
              {errors.issuer_name && (
                <p className="text-xs text-destructive">
                  {errors.issuer_name.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Last 4 Digits */}
            <div className="space-y-1.5">
              <Label htmlFor="cc-digits">Last 4 Digits</Label>
              <Input
                id="cc-digits"
                maxLength={4}
                placeholder="4892"
                {...register("last_four_digits")}
              />
              {errors.last_four_digits && (
                <p className="text-xs text-destructive">
                  {errors.last_four_digits.message}
                </p>
              )}
            </div>

            {/* Credit Limit */}
            <div className="space-y-1.5">
              <Label htmlFor="cc-limit">Credit Limit (INR)</Label>
              <Input
                id="cc-limit"
                type="number"
                step="0.01"
                placeholder="200000.00"
                {...register("credit_limit")}
              />
              {errors.credit_limit && (
                <p className="text-xs text-destructive">
                  {errors.credit_limit.message}
                </p>
              )}
            </div>
          </div>

          {/* Statement & Due Days */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cc-stmt">Statement Date (Day of Month)</Label>
              <Input
                id="cc-stmt"
                type="number"
                min={1}
                max={31}
                defaultValue={15}
                {...register("statement_date_day", { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cc-due">Payment Due Day</Label>
              <Input
                id="cc-due"
                type="number"
                min={1}
                max={31}
                defaultValue={5}
                {...register("payment_due_day", { valueAsNumber: true })}
              />
            </div>
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
              Register Card
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


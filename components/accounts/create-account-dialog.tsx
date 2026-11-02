"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle, Loader2 } from "lucide-react";
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
  createAccountSchema,
  CreateAccountInput,
} from "@/lib/validations/accounts";
import { createAccountAction } from "@/app/(dashboard)/accounts/actions";

const COLOR_PRESETS = [
  "#244B3C", // Leftovers Forest Green
  "#8BA58C", // Leftovers Sage
  "#39805B", // Leftovers Success Green
  "#C77A65", // Leftovers Terracotta
  "#C39148", // Leftovers Amber
  "#3B82F6", // Classic Blue
  "#6366F1", // Indigo
  "#8B5CF6", // Purple
];

interface CreateAccountDialogProps {
  trigger?: React.ReactNode;
}

export function CreateAccountDialog({ trigger }: CreateAccountDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateAccountInput>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: {
      name: "",
      account_type: "savings",
      institution_name: "",
      account_number_masked: "",
      currency: "INR",
      initial_balance: "0.00",
      color: "#244B3C",
      icon: "Landmark",
    },
  });

  const selectedType = watch("account_type");
  const selectedColor = watch("color");

  const onSubmit = async (data: CreateAccountInput) => {
    setIsSubmitting(true);
    try {
      const res = await createAccountAction(data);
      if (res.success) {
        toast.success(res.message || "Account created successfully");
        reset();
        setOpen(false);
      } else {
        toast.error(res.error || "Failed to create account");
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
            <span>Add Account</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] bg-surface text-text-primary border-border p-5 rounded-2xl shadow-xl">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-bold tracking-tight text-text-primary">
            Add New Account
          </DialogTitle>
          <DialogDescription className="text-xs text-text-secondary">
            Register a bank account, cash wallet, or credit card.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Account Name */}
          <div className="space-y-1.5">
            <Label htmlFor="acc-name" className="text-xs font-medium text-text-secondary">
              Account Nickname
            </Label>
            <Input
              id="acc-name"
              placeholder="e.g. HDFC Salary, Emergency Cash"
              {...register("name")}
              className="h-9 text-xs bg-surface border-border text-text-primary"
            />
            {errors.name && (
              <p className="text-xs text-danger">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Account Type */}
            <div className="space-y-1.5">
              <Label htmlFor="acc-type" className="text-xs font-medium text-text-secondary">
                Account Type
              </Label>
              <Select
                value={selectedType}
                onValueChange={(val: any) => setValue("account_type", val)}
              >
                <SelectTrigger id="acc-type" className="h-9 text-xs bg-surface border-border">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-surface text-text-primary border-border">
                  <SelectItem value="savings">Savings Account</SelectItem>
                  <SelectItem value="salary">Salary Account</SelectItem>
                  <SelectItem value="current">Current Account</SelectItem>
                  <SelectItem value="cash">Cash Wallet</SelectItem>
                  <SelectItem value="upi_wallet">UPI / Digital Wallet</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="fixed_deposit">Fixed Deposit</SelectItem>
                  <SelectItem value="recurring_deposit">Recurring Deposit</SelectItem>
                  <SelectItem value="investment_demat">Demat / Stocks</SelectItem>
                  <SelectItem value="loan_account">Loan Account</SelectItem>
                  <SelectItem value="other">Other Account</SelectItem>
                </SelectContent>
              </Select>
              {errors.account_type && (
                <p className="text-xs text-danger">
                  {errors.account_type.message}
                </p>
              )}
            </div>

            {/* Institution Name */}
            <div className="space-y-1.5">
              <Label htmlFor="acc-inst" className="text-xs font-medium text-text-secondary">
                Institution / Bank
              </Label>
              <Input
                id="acc-inst"
                placeholder="e.g. HDFC Bank, SBI, Cash"
                {...register("institution_name")}
                className="h-9 text-xs bg-surface border-border text-text-primary"
              />
              {errors.institution_name && (
                <p className="text-xs text-danger">
                  {errors.institution_name.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Masked Account Number */}
            <div className="space-y-1.5">
              <Label htmlFor="acc-num" className="text-xs font-medium text-text-secondary">
                Masked No. (Optional)
              </Label>
              <Input
                id="acc-num"
                placeholder="e.g. •••• 4892"
                {...register("account_number_masked")}
                className="h-9 text-xs bg-surface border-border text-text-primary font-mono"
              />
              {errors.account_number_masked && (
                <p className="text-xs text-danger">
                  {errors.account_number_masked.message}
                </p>
              )}
            </div>

            {/* Initial Balance */}
            <div className="space-y-1.5">
              <Label htmlFor="acc-bal" className="text-xs font-medium text-text-secondary">
                Opening Balance (INR)
              </Label>
              <Input
                id="acc-bal"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register("initial_balance")}
                className="h-9 text-xs bg-surface border-border text-text-primary font-semibold tabular-nums"
              />
              {errors.initial_balance && (
                <p className="text-xs text-danger">
                  {errors.initial_balance.message}
                </p>
              )}
            </div>
          </div>

          {/* Color Preset */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-text-secondary">Accent Color</Label>
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setValue("color", color)}
                  className={`h-7 w-7 rounded-full transition-transform ${
                    selectedColor === color
                      ? "ring-2 ring-primary ring-offset-2 scale-110"
                      : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                />
              ))}
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
              Create Account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

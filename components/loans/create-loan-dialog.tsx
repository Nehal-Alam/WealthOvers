"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle, Loader2, Scale } from "lucide-react";
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
import { createLoanSchema, CreateLoanInput, loanTypeValues } from "@/lib/validations/loans";
import { createLoanAction } from "@/app/(dashboard)/loans/actions";
import { calculateLoanEMI } from "@/lib/calculations/financial";

interface CreateLoanDialogProps {
  trigger?: React.ReactNode;
}

export function CreateLoanDialog({ trigger }: CreateLoanDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const now = new Date();
  const defaultStart = format(now, "yyyy-MM-dd");
  const defaultMaturity = format(addMonths(now, 60), "yyyy-MM-dd");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateLoanInput>({
    resolver: zodResolver(createLoanSchema),
    defaultValues: {
      loan_type: "home",
      lender_or_borrower_name: "",
      principal_amount: "1000000.00",
      annual_interest_rate: "8.5",
      tenure_months: 60,
      start_date: defaultStart,
      maturity_date: defaultMaturity,
      notes: "",
    },
  });

  const principal = watch("principal_amount");
  const rate = watch("annual_interest_rate");
  const tenure = watch("tenure_months");

  // Dynamic preview of monthly EMI
  const emiPreview = React.useMemo(() => {
    try {
      const p = parseFloat(principal);
      const r = parseFloat(rate);
      const t = tenure || 1;
      if (p > 0 && r >= 0 && t > 0) {
        return calculateLoanEMI(p, r, t);
      }
    } catch {
      // ignore
    }
    return null;
  }, [principal, rate, tenure]);

  const onSubmit = async (data: CreateLoanInput) => {
    setIsSubmitting(true);
    try {
      const res = await createLoanAction(data);
      if (res.success) {
        toast.success(res.message || "Loan registered successfully");
        reset();
        setOpen(false);
      } else {
        toast.error(res.error || "Failed to register loan");
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
            <span>Add Loan / Debt</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            <span>Register Loan Account</span>
          </DialogTitle>
          <DialogDescription>
            Record home loans, personal loans, vehicle loans, or private liabilities.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Loan Type */}
          <div className="space-y-1.5">
            <Label>Loan Type</Label>
            <Select
              defaultValue="home"
              onValueChange={(val: any) => setValue("loan_type", val)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="home">Home Loan (Mortgage)</SelectItem>
                <SelectItem value="personal">Personal Loan</SelectItem>
                <SelectItem value="vehicle">Vehicle / Car Loan</SelectItem>
                <SelectItem value="education">Education Loan</SelectItem>
                <SelectItem value="credit_card_debt">Credit Card Debt</SelectItem>
                <SelectItem value="loan_received">Informal Debt (Received)</SelectItem>
                <SelectItem value="loan_given">Loan Given to Others</SelectItem>
                <SelectItem value="other">Other Liability</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lender Name */}
          <div className="space-y-1.5">
            <Label htmlFor="loan-lender">Lender / Bank / Borrower Name</Label>
            <Input
              id="loan-lender"
              placeholder="e.g. HDFC Home Loans, SBI, Friend"
              {...register("lender_or_borrower_name")}
            />
            {errors.lender_or_borrower_name && (
              <p className="text-xs text-destructive">
                {errors.lender_or_borrower_name.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Principal Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="loan-principal">Principal (INR)</Label>
              <Input
                id="loan-principal"
                type="number"
                step="0.01"
                placeholder="1000000.00"
                {...register("principal_amount")}
              />
              {errors.principal_amount && (
                <p className="text-xs text-destructive">
                  {errors.principal_amount.message}
                </p>
              )}
            </div>

            {/* Interest Rate */}
            <div className="space-y-1.5">
              <Label htmlFor="loan-rate">Annual Interest (%)</Label>
              <Input
                id="loan-rate"
                type="number"
                step="0.01"
                placeholder="8.5"
                {...register("annual_interest_rate")}
              />
              {errors.annual_interest_rate && (
                <p className="text-xs text-destructive">
                  {errors.annual_interest_rate.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {/* Tenure */}
            <div className="space-y-1.5">
              <Label htmlFor="loan-tenure">Tenure (Mos)</Label>
              <Input
                id="loan-tenure"
                type="number"
                min={1}
                defaultValue={60}
                {...register("tenure_months", { valueAsNumber: true })}
              />
            </div>

            {/* Start Date */}
            <div className="space-y-1.5">
              <Label htmlFor="loan-start">Start Date</Label>
              <Input id="loan-start" type="date" {...register("start_date")} />
            </div>

            {/* Maturity Date */}
            <div className="space-y-1.5">
              <Label htmlFor="loan-mat">Maturity Date</Label>
              <Input id="loan-mat" type="date" {...register("maturity_date")} />
            </div>
          </div>

          {/* EMI Preview Banner */}
          {emiPreview && (
            <div className="rounded-lg border bg-muted/40 p-3 text-xs flex justify-between items-center">
              <div>
                <span className="text-muted-foreground block">Calculated Monthly EMI</span>
                <span className="text-base font-bold font-mono text-primary">
                  ₹{parseFloat(emiPreview.monthlyEmi).toLocaleString()}
                </span>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground block">Total Interest Payable</span>
                <span className="font-mono font-semibold">
                  ₹{parseFloat(emiPreview.totalInterest).toLocaleString()}
                </span>
              </div>
            </div>
          )}

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
              Save Loan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Scale } from "lucide-react";
import { toast } from "sonner";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tables } from "@/types/database";
import { updateLoanSchema, UpdateLoanInput, loanTypeValues } from "@/lib/validations/loans";
import { updateLoanAction } from "@/app/(dashboard)/loans/actions";
import { calculateLoanEMI } from "@/lib/calculations/financial";

interface EditLoanDialogProps {
  loan: Tables<"loans"> | null;
  accounts?: Tables<"accounts">[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditLoanDialog({
  loan,
  accounts = [],
  open,
  onOpenChange,
}: EditLoanDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<UpdateLoanInput>({
    resolver: zodResolver(updateLoanSchema),
    defaultValues: {
      id: loan?.id || "",
      account_id: loan?.account_id || null,
      loan_type: (loan?.loan_type as any) || "personal",
      lender_or_borrower_name: loan?.lender_or_borrower_name || "",
      principal_amount: loan?.principal_amount?.toString() || "0",
      outstanding_balance: loan?.outstanding_balance?.toString() || "0",
      annual_interest_rate: loan?.annual_interest_rate?.toString() || "0",
      tenure_months: loan?.tenure_months || 12,
      start_date: loan?.start_date ? loan.start_date.slice(0, 10) : "",
      maturity_date: loan?.maturity_date ? loan.maturity_date.slice(0, 10) : "",
      notes: loan?.notes || "",
    },
  });

  React.useEffect(() => {
    if (loan) {
      reset({
        id: loan.id,
        account_id: loan.account_id || null,
        loan_type: loan.loan_type as any,
        lender_or_borrower_name: loan.lender_or_borrower_name,
        principal_amount: (loan.principal_amount ?? 0).toString(),
        outstanding_balance: (loan.outstanding_balance ?? 0).toString(),
        annual_interest_rate: (loan.annual_interest_rate ?? 0).toString(),
        tenure_months: loan.tenure_months || 12,
        start_date: loan.start_date ? loan.start_date.slice(0, 10) : "",
        maturity_date: loan.maturity_date ? loan.maturity_date.slice(0, 10) : "",
        notes: loan.notes || "",
      });
    }
  }, [loan, reset]);

  const principal = watch("principal_amount");
  const rate = watch("annual_interest_rate");
  const tenure = watch("tenure_months");
  const loanType = watch("loan_type");

  const isLending = loanType === "loan_given";

  // Dynamic preview of recalculated monthly EMI
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

  const onSubmit = async (data: UpdateLoanInput) => {
    setIsSubmitting(true);
    try {
      const res = await updateLoanAction(data);
      if (res.success) {
        toast.success(res.message || "Loan details updated");
        onOpenChange(false);
      } else {
        toast.error(res.error || "Failed to update loan");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!loan) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            <span>Edit Loan / Debt Details</span>
          </DialogTitle>
          <DialogDescription>
            Correct borrow or lend amounts, interest rates, tenure, or contact details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Loan Type */}
          <div className="space-y-1.5">
            <Label>Loan Type / Direction</Label>
            <Select
              value={watch("loan_type")}
              onValueChange={(val: any) => setValue("loan_type", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Personal Loan (Bank/NBFC)</SelectItem>
                <SelectItem value="home">Home Loan / Mortgage</SelectItem>
                <SelectItem value="vehicle">Vehicle / Car Loan</SelectItem>
                <SelectItem value="education">Education Loan</SelectItem>
                <SelectItem value="credit_card_debt">Credit Card Debt</SelectItem>
                <SelectItem value="loan_received">Money Borrowed (Private Debt)</SelectItem>
                <SelectItem value="loan_given">Money Lent to Someone (Receivable)</SelectItem>
                <SelectItem value="other">Other Debt</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lender or Borrower Name */}
          <div className="space-y-1.5">
            <Label>{isLending ? "Borrower Name (Who owes you?)" : "Lender / Institution Name"}</Label>
            <Input
              {...register("lender_or_borrower_name")}
              placeholder={isLending ? "e.g. Rahul Sharma" : "e.g. HDFC Bank, SBI"}
            />
            {errors.lender_or_borrower_name && (
              <p className="text-xs text-danger">{errors.lender_or_borrower_name.message}</p>
            )}
          </div>

          {/* Amounts: Principal & Outstanding */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{isLending ? "Total Lent Amount (₹)" : "Original Principal (₹)"}</Label>
              <Input
                {...register("principal_amount")}
                type="number"
                step="0.01"
                placeholder="100000"
              />
              {errors.principal_amount && (
                <p className="text-xs text-danger">{errors.principal_amount.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Current Outstanding (₹)</Label>
              <Input
                {...register("outstanding_balance")}
                type="number"
                step="0.01"
                placeholder="Remaining balance"
              />
              {errors.outstanding_balance && (
                <p className="text-xs text-danger">{errors.outstanding_balance.message}</p>
              )}
            </div>
          </div>

          {/* Interest Rate & Tenure */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Annual Interest (%)</Label>
              <Input
                {...register("annual_interest_rate")}
                type="number"
                step="0.01"
                placeholder="8.5"
              />
              {errors.annual_interest_rate && (
                <p className="text-xs text-danger">{errors.annual_interest_rate.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Tenure (Months)</Label>
              <Input
                type="number"
                value={watch("tenure_months")}
                onChange={(e) => setValue("tenure_months", parseInt(e.target.value) || 1)}
              />
              {errors.tenure_months && (
                <p className="text-xs text-danger">{errors.tenure_months.message}</p>
              )}
            </div>
          </div>

          {/* EMI Preview Card */}
          {emiPreview && (
            <div className="p-3 rounded-xl bg-surface-secondary/50 border border-border/80 flex items-center justify-between text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Recalculated Monthly EMI</span>
                <span className="font-bold text-sm text-primary font-mono">
                  ₹{parseFloat(emiPreview.monthlyEmi).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground block text-[11px]">Total Estimated Interest</span>
                <span className="font-semibold text-foreground font-mono">
                  ₹{parseFloat(emiPreview.totalInterest).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input type="date" {...register("start_date")} />
              {errors.start_date && (
                <p className="text-xs text-danger">{errors.start_date.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Maturity Date</Label>
              <Input type="date" {...register("maturity_date")} />
              {errors.maturity_date && (
                <p className="text-xs text-danger">{errors.maturity_date.message}</p>
              )}
            </div>
          </div>

          {/* Linked Account */}
          {accounts.length > 0 && (
            <div className="space-y-1.5">
              <Label>Associated Bank Account</Label>
              <Select
                value={watch("account_id") || "none"}
                onValueChange={(val) => setValue("account_id", val === "none" ? null : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Untracked bank account)</SelectItem>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({acc.institution_name || "Bank"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes & Reference</Label>
            <Input {...register("notes")} placeholder="Account number, loan agreement ref, etc." />
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
            <Button type="submit" disabled={isSubmitting} className="gap-2 bg-primary text-primary-foreground hover:bg-primary-hover">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Save Changes</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


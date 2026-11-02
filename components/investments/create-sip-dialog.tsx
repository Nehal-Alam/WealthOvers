"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Calendar, Loader2, PlusCircle, Repeat } from "lucide-react";
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
import { createSipSchema, CreateSipInput } from "@/lib/validations/investments";
import { createSipAction } from "@/app/(dashboard)/investments/actions";
import { Tables } from "@/types/database";

interface CreateSipDialogProps {
  investments: Tables<"investments">[];
  accounts: Tables<"accounts">[];
  trigger?: React.ReactNode;
}

export function CreateSipDialog({
  investments,
  accounts,
  trigger,
}: CreateSipDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Default next execution date = 5th of next month
  const defaultDate = React.useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(5);
    return d.toISOString().slice(0, 10);
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateSipInput>({
    resolver: zodResolver(createSipSchema),
    defaultValues: {
      investment_id: investments[0]?.id || "",
      account_id: accounts[0]?.id || "",
      sip_name: "",
      amount: "5000",
      frequency: "monthly",
      deduction_day: 5,
      next_due_date: defaultDate,
      notes: "",
    },
  });

  const selectedInvestmentId = watch("investment_id");

  React.useEffect(() => {
    const target = investments.find((i) => i.id === selectedInvestmentId);
    if (target && !watch("sip_name")) {
      setValue("sip_name", `${target.name} SIP`);
    }
  }, [selectedInvestmentId, investments, setValue, watch]);

  const onSubmit = async (data: CreateSipInput) => {
    setIsSubmitting(true);
    try {
      const res = await createSipAction(data);
      if (res.success) {
        toast.success(res.message || "SIP schedule created successfully");
        reset();
        setOpen(false);
      } else {
        toast.error(res.error || "Failed to create SIP");
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
          <Button
            variant="outline"
            className="gap-2 border-primary/30 text-primary hover:bg-primary/10 rounded-xl"
          >
            <Repeat className="h-4 w-4" />
            <span>Schedule SIP</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-surface text-text-primary border-border">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Repeat className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Automate Systematic Investment Plan (SIP)
              </DialogTitle>
              <DialogDescription className="text-xs text-text-secondary">
                Configure scheduled recurring deductions from bank to investments.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Investment Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-text-primary">
              Target Investment Holding <span className="text-danger">*</span>
            </Label>
            <Select
              value={watch("investment_id")}
              onValueChange={(val) => setValue("investment_id", val)}
            >
              <SelectTrigger className="bg-surface border-border text-xs">
                <SelectValue placeholder="Select target investment" />
              </SelectTrigger>
              <SelectContent className="bg-surface border-border text-xs">
                {investments.map((inv) => (
                  <SelectItem key={inv.id} value={inv.id}>
                    {inv.name} ({inv.broker_name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.investment_id && (
              <p className="text-[11px] text-danger">{errors.investment_id.message}</p>
            )}
          </div>

          {/* Funding Account Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-text-primary">
              Funding Bank Account <span className="text-danger">*</span>
            </Label>
            <Select
              value={watch("account_id")}
              onValueChange={(val) => setValue("account_id", val)}
            >
              <SelectTrigger className="bg-surface border-border text-xs">
                <SelectValue placeholder="Select debit account" />
              </SelectTrigger>
              <SelectContent className="bg-surface border-border text-xs">
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name} ({acc.account_type.replace("_", " ")})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.account_id && (
              <p className="text-[11px] text-danger">{errors.account_id.message}</p>
            )}
          </div>

          {/* SIP Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-text-primary">
              SIP Name / Identifier <span className="text-danger">*</span>
            </Label>
            <Input
              {...register("sip_name")}
              placeholder="e.g. Parag Parikh Flexi Cap Monthly"
              className="bg-surface border-border text-xs"
            />
            {errors.sip_name && (
              <p className="text-[11px] text-danger">{errors.sip_name.message}</p>
            )}
          </div>

          {/* Amount & Frequency */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-text-primary">
                Installment Amount (₹) <span className="text-danger">*</span>
              </Label>
              <Input
                {...register("amount")}
                type="number"
                step="any"
                placeholder="5000"
                className="bg-surface border-border text-xs font-mono"
              />
              {errors.amount && (
                <p className="text-[11px] text-danger">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-text-primary">
                Frequency
              </Label>
              <Select
                value={watch("frequency")}
                onValueChange={(val: any) => setValue("frequency", val)}
              >
                <SelectTrigger className="bg-surface border-border text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-surface border-border text-xs">
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Deduction Day & Next Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-text-primary">
                Deduction Day of Month
              </Label>
              <Input
                {...register("deduction_day", { valueAsNumber: true })}
                type="number"
                min={1}
                max={31}
                className="bg-surface border-border text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-text-primary">
                Next Execution Date
              </Label>
              <Input
                {...register("next_due_date")}
                type="date"
                className="bg-surface border-border text-xs"
              />
              {errors.next_due_date && (
                <p className="text-[11px] text-danger">{errors.next_due_date.message}</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-text-primary">
              Notes (Optional)
            </Label>
            <Input
              {...register("notes")}
              placeholder="e.g. Wealth growth for retirement"
              className="bg-surface border-border text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-border text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary-hover text-surface text-xs font-semibold gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Scheduling...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Schedule SIP</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


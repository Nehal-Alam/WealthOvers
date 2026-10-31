"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Receipt } from "lucide-react";
import { toast } from "sonner";
import { format, subMonths } from "date-fns";

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
  createCreditCardStatementSchema,
  CreateCreditCardStatementInput,
} from "@/lib/validations/credit-cards";
import { createCreditCardStatementAction } from "@/app/(dashboard)/credit-cards/actions";
import { Tables } from "@/types/database";

interface RecordStatementDialogProps {
  card: Tables<"credit_cards"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecordStatementDialog({
  card,
  open,
  onOpenChange,
}: RecordStatementDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const now = new Date();
  const prevMonth = subMonths(now, 1);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateCreditCardStatementInput>({
    resolver: zodResolver(createCreditCardStatementSchema),
    defaultValues: {
      credit_card_id: card?.id || "",
      statement_period_start: format(prevMonth, "yyyy-MM-15"),
      statement_period_end: format(now, "yyyy-MM-14"),
      total_due: "",
      minimum_due: "0.00",
      due_date: format(now, "yyyy-MM-28"),
      is_settled: false,
    },
  });

  React.useEffect(() => {
    if (card) {
      const today = new Date();
      const lastMonth = subMonths(today, 1);
      reset({
        credit_card_id: card.id,
        statement_period_start: format(lastMonth, "yyyy-MM-15"),
        statement_period_end: format(today, "yyyy-MM-14"),
        total_due: "",
        minimum_due: "0.00",
        due_date: format(today, "yyyy-MM-28"),
        is_settled: false,
      });
    }
  }, [card, reset]);

  const onSubmit = async (data: CreateCreditCardStatementInput) => {
    setIsSubmitting(true);
    try {
      const res = await createCreditCardStatementAction(data);
      if (res.success) {
        toast.success(res.message || "Statement recorded");
        onOpenChange(false);
      } else {
        toast.error(res.error || "Failed to record statement");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!card) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            <span>Record Statement for {card.card_name}</span>
          </DialogTitle>
          <DialogDescription>
            Record total due, minimum payment, and bill due date.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Statement Start</Label>
              <Input type="date" {...register("statement_period_start")} />
            </div>
            <div className="space-y-1.5">
              <Label>Statement End</Label>
              <Input type="date" {...register("statement_period_end")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="stmt-total">Total Due (INR)</Label>
              <Input
                id="stmt-total"
                type="number"
                step="0.01"
                placeholder="25400.00"
                autoFocus
                {...register("total_due")}
              />
              {errors.total_due && (
                <p className="text-xs text-destructive">{errors.total_due.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="stmt-due-date">Due Date</Label>
              <Input id="stmt-due-date" type="date" {...register("due_date")} />
              {errors.due_date && (
                <p className="text-xs text-destructive">{errors.due_date.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="stmt-min">Minimum Due (INR)</Label>
            <Input
              id="stmt-min"
              type="number"
              step="0.01"
              placeholder="1270.00"
              {...register("minimum_due")}
            />
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Statement
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

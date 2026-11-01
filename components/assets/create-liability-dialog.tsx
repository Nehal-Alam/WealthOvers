"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle, Loader2, AlertCircle } from "lucide-react";
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
import { createLiabilitySchema, CreateLiabilityInput } from "@/lib/validations/assets";
import { createLiabilityAction } from "@/app/(dashboard)/assets/actions";

interface CreateLiabilityDialogProps {
  trigger?: React.ReactNode;
}

export function CreateLiabilityDialog({ trigger }: CreateLiabilityDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateLiabilityInput>({
    resolver: zodResolver(createLiabilitySchema),
    defaultValues: {
      name: "",
      category: "Personal Debt",
      total_amount: "",
      outstanding_amount: "",
      due_date: "",
      notes: "",
    },
  });

  const onSubmit = async (data: CreateLiabilityInput) => {
    setIsSubmitting(true);
    try {
      const res = await createLiabilityAction(data);
      if (res.success) {
        toast.success(res.message || "Liability added");
        reset();
        setOpen(false);
      } else {
        toast.error(res.error || "Failed to add liability");
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
          <Button variant="outline" className="gap-2">
            <PlusCircle className="h-4 w-4" />
            <span>Add Liability</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span>Add External Liability</span>
          </DialogTitle>
          <DialogDescription>
            Record private debts, family loans, or outstanding financial obligations.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="lia-name">Liability / Creditor</Label>
            <Input
              id="lia-name"
              placeholder="e.g. Loan from Uncle, Private Promissory Note"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select
              defaultValue="Personal Debt"
              onValueChange={(val) => setValue("category", val)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Personal Debt">Personal / Informal Debt</SelectItem>
                <SelectItem value="Private Mortgage">Private Mortgage</SelectItem>
                <SelectItem value="Tax Liability">Tax Obligation</SelectItem>
                <SelectItem value="Other">Other Obligation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lia-tot">Total Amount (INR)</Label>
              <Input
                id="lia-tot"
                type="number"
                step="0.01"
                placeholder="200000.00"
                {...register("total_amount")}
              />
              {errors.total_amount && (
                <p className="text-xs text-destructive">{errors.total_amount.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lia-out">Outstanding Amount</Label>
              <Input
                id="lia-out"
                type="number"
                step="0.01"
                placeholder="150000.00"
                {...register("outstanding_amount")}
              />
              {errors.outstanding_amount && (
                <p className="text-xs text-destructive">
                  {errors.outstanding_amount.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lia-due">Settlement Due Date (Optional)</Label>
            <Input id="lia-due" type="date" {...register("due_date")} />
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
              Save Liability
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


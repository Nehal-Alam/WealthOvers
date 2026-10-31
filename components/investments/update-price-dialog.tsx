"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

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
  updateInvestmentPriceSchema,
  UpdateInvestmentPriceInput,
} from "@/lib/validations/investments";
import { updateInvestmentPriceAction } from "@/app/(dashboard)/investments/actions";
import { Tables } from "@/types/database";

interface UpdatePriceDialogProps {
  investment: Tables<"investments"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpdatePriceDialog({
  investment,
  open,
  onOpenChange,
}: UpdatePriceDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateInvestmentPriceInput>({
    resolver: zodResolver(updateInvestmentPriceSchema),
    defaultValues: {
      id: investment?.id || "",
      current_nav_or_price: investment?.current_nav_or_price?.toString() || "",
    },
  });

  React.useEffect(() => {
    if (investment) {
      reset({
        id: investment.id,
        current_nav_or_price: investment.current_nav_or_price.toString(),
      });
    }
  }, [investment, reset]);

  const onSubmit = async (data: UpdateInvestmentPriceInput) => {
    setIsSubmitting(true);
    try {
      const res = await updateInvestmentPriceAction(data);
      if (res.success) {
        toast.success(res.message || "Price updated");
        onOpenChange(false);
      } else {
        toast.error(res.error || "Failed to update price");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!investment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-primary" />
            <span>Update Market Price</span>
          </DialogTitle>
          <DialogDescription>
            Update latest NAV or market price for{" "}
            <span className="font-semibold text-foreground">{investment.name}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>Current Price ({investment.currency})</span>
              {investment.last_price_update_at && (
                <span>
                  Last updated:{" "}
                  {format(new Date(investment.last_price_update_at), "dd MMM HH:mm")}
                </span>
              )}
            </div>
            <Input
              type="number"
              step="0.0001"
              autoFocus
              {...register("current_nav_or_price")}
            />
            {errors.current_nav_or_price && (
              <p className="text-xs text-destructive">
                {errors.current_nav_or_price.message}
              </p>
            )}
          </div>

          <div className="rounded-lg border bg-muted/30 p-2.5 text-xs text-muted-foreground">
            Price updates recalculate your holding&apos;s total valuation and profit/loss
            in real time.
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save New Price
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


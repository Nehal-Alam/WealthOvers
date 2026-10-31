"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  updateTransactionSchema,
  UpdateTransactionInput,
} from "@/lib/validations/transactions";
import { updateTransactionAction } from "@/app/(dashboard)/transactions/actions";
import { Tables } from "@/types/database";

interface EditTransactionDialogProps {
  transaction: any | null;
  accounts: Tables<"accounts">[];
  categories: (Tables<"categories"> & { subcategories?: Tables<"subcategories">[] })[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTransactionDialog({
  transaction,
  accounts,
  categories,
  open,
  onOpenChange,
}: EditTransactionDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<UpdateTransactionInput>({
    resolver: zodResolver(updateTransactionSchema),
    defaultValues: {
      id: transaction?.id || "",
      account_id: transaction?.account_id || "",
      destination_account_id: transaction?.destination_account_id || null,
      category_id: transaction?.category_id || null,
      subcategory_id: transaction?.subcategory_id || null,
      amount: transaction?.amount?.toString() || "",
      transaction_type: transaction?.transaction_type || "expense",
      transaction_date: transaction?.transaction_date
        ? format(new Date(transaction.transaction_date), "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd"),
      description: transaction?.description || "",
      notes: transaction?.notes || "",
      reference_number: transaction?.reference_number || "",
      tags: transaction?.tags || [],
    },
  });

  React.useEffect(() => {
    if (transaction) {
      reset({
        id: transaction.id,
        account_id: transaction.account_id,
        destination_account_id: transaction.destination_account_id || null,
        category_id: transaction.category_id || null,
        subcategory_id: transaction.subcategory_id || null,
        amount: transaction.amount?.toString() || "",
        transaction_type: transaction.transaction_type,
        transaction_date: format(new Date(transaction.transaction_date), "yyyy-MM-dd"),
        description: transaction.description || "",
        notes: transaction.notes || "",
        reference_number: transaction.reference_number || "",
        tags: transaction.tags || [],
      });
    }
  }, [transaction, reset]);

  const selectedType = watch("transaction_type");
  const selectedCategoryId = watch("category_id");

  const relevantCategories = categories.filter((c) => c.type === selectedType);
  const selectedCategoryObj = categories.find((c) => c.id === selectedCategoryId);
  const availableSubcategories = selectedCategoryObj?.subcategories || [];

  const onSubmit = async (data: UpdateTransactionInput) => {
    setIsSubmitting(true);
    try {
      const res = await updateTransactionAction(data);
      if (res.success) {
        toast.success(res.message || "Transaction updated");
        onOpenChange(false);
      } else {
        toast.error(res.error || "Failed to update transaction");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
          <DialogDescription>
            Update transaction details or reassess category mapping.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-txn-amount">Amount (INR)</Label>
              <Input
                id="edit-txn-amount"
                type="number"
                step="0.01"
                {...register("amount")}
              />
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-txn-date">Date</Label>
              <Input
                id="edit-txn-date"
                type="date"
                {...register("transaction_date")}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-txn-desc">Description</Label>
            <Input id="edit-txn-desc" {...register("description")} />
            {errors.description && (
              <p className="text-xs text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Account</Label>
              <Select
                value={watch("account_id")}
                onValueChange={(val) => setValue("account_id", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedType !== "transfer" && (
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={selectedCategoryId || "none"}
                  onValueChange={(val) => {
                    setValue("category_id", val === "none" ? null : val);
                    setValue("subcategory_id", null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Uncategorized</SelectItem>
                    {relevantCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {selectedType !== "transfer" && availableSubcategories.length > 0 && (
            <div className="space-y-1.5">
              <Label>Subcategory</Label>
              <Select
                value={watch("subcategory_id") || "none"}
                onValueChange={(val) =>
                  setValue("subcategory_id", val === "none" ? null : val)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subcategory" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {availableSubcategories.map((sub) => (
                    <SelectItem key={sub.id} value={sub.id}>
                      {sub.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="edit-txn-ref">Reference (Optional)</Label>
            <Input id="edit-txn-ref" {...register("reference_number")} />
          </div>

          <DialogFooter className="pt-4">
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
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


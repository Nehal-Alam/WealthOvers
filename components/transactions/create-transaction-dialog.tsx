"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle, Loader2, TrendingDown, TrendingUp, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  createTransactionSchema,
  CreateTransactionInput,
} from "@/lib/validations/transactions";
import { createTransactionAction } from "@/app/(dashboard)/transactions/actions";
import { Tables } from "@/types/database";

interface CreateTransactionDialogProps {
  accounts: Tables<"accounts">[];
  categories: (Tables<"categories"> & { subcategories?: Tables<"subcategories">[] })[];
  defaultType?: "expense" | "income" | "transfer";
  trigger?: React.ReactNode;
}

export function CreateTransactionDialog({
  accounts,
  categories,
  defaultType = "expense",
  trigger,
}: CreateTransactionDialogProps) {
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
  } = useForm<CreateTransactionInput>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      account_id: activeAccounts[0]?.id || "",
      destination_account_id: null,
      category_id: null,
      subcategory_id: null,
      amount: "",
      currency: "INR",
      transaction_type: defaultType,
      transaction_date: format(new Date(), "yyyy-MM-dd"),
      description: "",
      notes: "",
      reference_number: "",
      tags: [],
    },
  });

  const selectedType = watch("transaction_type");
  const selectedAccountId = watch("account_id");
  const selectedDestAccountId = watch("destination_account_id");
  const selectedCategoryId = watch("category_id");

  // Filter categories by type
  const relevantCategories = React.useMemo(() => {
    if (selectedType === "transfer") return [];
    return categories.filter((c) => c.type === selectedType);
  }, [categories, selectedType]);

  // Subcategories for chosen category
  const selectedCategoryObj = categories.find((c) => c.id === selectedCategoryId);
  const availableSubcategories = selectedCategoryObj?.subcategories || [];

  const handleTypeChange = (type: "expense" | "income" | "transfer") => {
    setValue("transaction_type", type);
    setValue("category_id", null);
    setValue("subcategory_id", null);
    if (type === "transfer") {
      const dest = activeAccounts.find((a) => a.id !== selectedAccountId)?.id || null;
      setValue("destination_account_id", dest);
    } else {
      setValue("destination_account_id", null);
    }
  };

  const onSubmit = async (data: CreateTransactionInput) => {
    setIsSubmitting(true);
    try {
      const res = await createTransactionAction(data);
      if (res.success) {
        toast.success(res.message || "Transaction added");
        reset({
          account_id: activeAccounts[0]?.id || "",
          destination_account_id: null,
          category_id: null,
          subcategory_id: null,
          amount: "",
          currency: "INR",
          transaction_type: "expense",
          transaction_date: format(new Date(), "yyyy-MM-dd"),
          description: "",
          notes: "",
          reference_number: "",
          tags: [],
        });
        setOpen(false);
      } else {
        toast.error(res.error || "Failed to record transaction");
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
            <span>Add Transaction</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
          <DialogDescription>
            Record a new expense, income, or transfer between your accounts.
          </DialogDescription>
        </DialogHeader>

        {/* Transaction Type Tabs */}
        <Tabs
          value={selectedType}
          onValueChange={(val: any) => handleTypeChange(val)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="expense" className="gap-1.5 data-[state=active]:text-rose-600">
              <TrendingDown className="h-4 w-4" />
              <span>Expense</span>
            </TabsTrigger>
            <TabsTrigger value="income" className="gap-1.5 data-[state=active]:text-emerald-600">
              <TrendingUp className="h-4 w-4" />
              <span>Income</span>
            </TabsTrigger>
            <TabsTrigger value="transfer" className="gap-1.5 data-[state=active]:text-blue-600">
              <ArrowLeftRight className="h-4 w-4" />
              <span>Transfer</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="txn-amount">Amount (INR)</Label>
              <Input
                id="txn-amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                autoFocus
                {...register("amount")}
              />
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="txn-date">Date</Label>
              <Input
                id="txn-date"
                type="date"
                {...register("transaction_date")}
              />
              {errors.transaction_date && (
                <p className="text-xs text-destructive">
                  {errors.transaction_date.message}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="txn-desc">Description</Label>
            <Input
              id="txn-desc"
              placeholder={
                selectedType === "expense"
                  ? "e.g. Swiggy, Groceries, Electricity Bill"
                  : selectedType === "income"
                  ? "e.g. October Salary, Freelance Payment"
                  : "e.g. Transfer to Savings"
              }
              {...register("description")}
            />
            {errors.description && (
              <p className="text-xs text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Accounts Section */}
          {selectedType === "transfer" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>From Account</Label>
                <Select
                  value={selectedAccountId}
                  onValueChange={(val) => {
                    setValue("account_id", val);
                    if (val === selectedDestAccountId) {
                      const alt = activeAccounts.find((a) => a.id !== val);
                      setValue("destination_account_id", alt ? alt.id : null);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="From account" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.account_id && (
                  <p className="text-xs text-destructive">
                    {errors.account_id.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>To Account</Label>
                <Select
                  value={selectedDestAccountId || ""}
                  onValueChange={(val) => setValue("destination_account_id", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="To account" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeAccounts
                      .filter((acc) => acc.id !== selectedAccountId)
                      .map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {errors.destination_account_id && (
                  <p className="text-xs text-destructive">
                    {errors.destination_account_id.message}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Account</Label>
                <Select
                  value={selectedAccountId}
                  onValueChange={(val) => setValue("account_id", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name} ({acc.institution_name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.account_id && (
                  <p className="text-xs text-destructive">
                    {errors.account_id.message}
                  </p>
                )}
              </div>

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
            </div>
          )}

          {/* Subcategory (if category selected) */}
          {selectedType !== "transfer" && availableSubcategories.length > 0 && (
            <div className="space-y-1.5">
              <Label>Subcategory (Optional)</Label>
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

          {/* Optional Reference Number */}
          <div className="space-y-1.5">
            <Label htmlFor="txn-ref">Reference / UPI ID (Optional)</Label>
            <Input
              id="txn-ref"
              placeholder="e.g. UPI/123456789, Cheque #004"
              {...register("reference_number")}
            />
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
              Save Transaction
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


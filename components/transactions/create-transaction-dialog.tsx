"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle, Loader2, TrendingDown, TrendingUp, ArrowLeftRight, Split, Plus, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
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
import {
  createTransactionAction,
  createSplitTransactionAction,
} from "@/app/(dashboard)/transactions/actions";
import { validateSplitAmounts } from "@/lib/calculations/financial";
import { Tables } from "@/types/database";

interface CreateTransactionDialogProps {
  accounts: Tables<"accounts">[];
  categories: (Tables<"categories"> & { subcategories?: Tables<"subcategories">[] })[];
  defaultType?: "expense" | "income" | "transfer";
  trigger?: React.ReactNode | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateTransactionDialog({
  accounts,
  categories,
  defaultType = "expense",
  trigger,
  open: controlledOpen,
  onOpenChange,
}: CreateTransactionDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = React.useCallback(
    (newOpen: boolean) => {
      if (isControlled) {
        onOpenChange?.(newOpen);
      } else {
        setInternalOpen(newOpen);
      }
    },
    [isControlled, onOpenChange]
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSplitMode, setIsSplitMode] = React.useState(false);
  const [splitItems, setSplitItems] = React.useState<
    Array<{
      id: string;
      amount: string;
      category_id: string | null;
      subcategory_id: string | null;
      description: string;
    }>
  >([
    { id: "1", amount: "", category_id: null, subcategory_id: null, description: "" },
    { id: "2", amount: "", category_id: null, subcategory_id: null, description: "" },
  ]);

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

  React.useEffect(() => {
    if (open && defaultType) {
      setValue("transaction_type", defaultType);
    }
  }, [open, defaultType, setValue]);

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
      setIsSplitMode(false);
      const dest = activeAccounts.find((a) => a.id !== selectedAccountId)?.id || null;
      setValue("destination_account_id", dest);
    } else {
      setValue("destination_account_id", null);
    }
  };

  const watchedAmount = watch("amount");
  const splitAllocation = React.useMemo(() => {
    return validateSplitAmounts(
      watchedAmount || "0",
      splitItems.map((s) => ({ amount: s.amount || "0" }))
    );
  }, [watchedAmount, splitItems]);

  const handleAddSplitItem = () => {
    setSplitItems((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        amount: "",
        category_id: null,
        subcategory_id: null,
        description: "",
      },
    ]);
  };

  const handleRemoveSplitItem = (id: string) => {
    if (splitItems.length <= 2) return;
    setSplitItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateSplitItem = (
    id: string,
    field: "amount" | "category_id" | "subcategory_id" | "description",
    value: any
  ) => {
    setSplitItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          if (field === "category_id") {
            return { ...item, category_id: value, subcategory_id: null };
          }
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  React.useEffect(() => {
    if (!open) {
      setIsSplitMode(false);
      setSplitItems([
        { id: "1", amount: "", category_id: null, subcategory_id: null, description: "" },
        { id: "2", amount: "", category_id: null, subcategory_id: null, description: "" },
      ]);
    }
  }, [open]);

  const onSubmit = async (data: CreateTransactionInput) => {
    setIsSubmitting(true);
    try {
      if (isSplitMode && selectedType !== "transfer") {
        if (!splitAllocation.isValid) {
          toast.error(
            `Split allocations must match the total receipt amount exactly. Remaining: ₹${splitAllocation.remaining}`
          );
          setIsSubmitting(false);
          return;
        }

        for (let i = 0; i < splitItems.length; i++) {
          const item = splitItems[i];
          if (!item.amount || parseFloat(item.amount) <= 0) {
            toast.error(`Please enter a valid amount for split item #${i + 1}`);
            setIsSubmitting(false);
            return;
          }
        }

        const res = await createSplitTransactionAction({
          account_id: data.account_id,
          transaction_date: data.transaction_date,
          transaction_type: data.transaction_type as "expense" | "income",
          currency: data.currency,
          parent_description: data.description,
          total_amount: data.amount,
          notes: data.notes || null,
          reference_number: data.reference_number || null,
          splits: splitItems.map((s, idx) => ({
            amount: s.amount,
            category_id: s.category_id,
            subcategory_id: s.subcategory_id,
            description: s.description.trim() || `${data.description} (Part ${idx + 1})`,
          })),
        });

        if (res.success) {
          toast.success(res.message || "Split transaction added");
          reset();
          setIsSplitMode(false);
          setOpen(false);
        } else {
          toast.error(res.error || "Failed to record split transaction");
        }
      } else {
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
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger !== null && (
        <DialogTrigger asChild>
          {trigger || (
            <Button className="gap-2">
              <PlusCircle className="h-4 w-4" />
              <span>Add Transaction</span>
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className={`${isSplitMode ? "sm:max-w-[620px]" : "sm:max-w-[500px]"} max-h-[90vh] overflow-y-auto`}>
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
            <TabsTrigger value="expense" className="gap-1.5 data-[state=active]:text-destructive">
              <TrendingDown className="h-4 w-4" />
              <span>Expense</span>
            </TabsTrigger>
            <TabsTrigger value="income" className="gap-1.5 data-[state=active]:text-emerald-500">
              <TrendingUp className="h-4 w-4" />
              <span>Income</span>
            </TabsTrigger>
            <TabsTrigger value="transfer" className="gap-1.5 data-[state=active]:text-primary">
              <ArrowLeftRight className="h-4 w-4" />
              <span>Transfer</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="txn-amount">{isSplitMode ? "Total Receipt (INR)" : "Amount (INR)"}</Label>
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
            <Label htmlFor="txn-desc">{isSplitMode ? "Merchant / Main Description" : "Description"}</Label>
            <Input
              id="txn-desc"
              placeholder={
                isSplitMode
                  ? "e.g. Costco Wholesale, Amazon Superstore"
                  : selectedType === "expense"
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

          {/* Split Mode Toggle (for Non-transfer transactions) */}
          {selectedType !== "transfer" && (
            <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-3">
              <div className="space-y-0.5">
                <Label htmlFor="split-toggle" className="text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
                  <Split className="h-3.5 w-3.5 text-primary" />
                  <span>Split Across Multiple Categories</span>
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Allocate receipt portions to different spending envelopes.
                </p>
              </div>
              <Switch
                id="split-toggle"
                checked={isSplitMode}
                onCheckedChange={setIsSplitMode}
              />
            </div>
          )}

          {/* Accounts & Category Section */}
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
          ) : isSplitMode ? (
            /* Split Allocation Builder */
            <div className="space-y-3 pt-1">
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

              {/* Allocation Summary Card */}
              <div className="rounded-xl border p-3 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Allocation Balance:</span>
                  {splitAllocation.isValid ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" /> 100% Balanced (₹0.00 left)
                    </span>
                  ) : parseFloat(splitAllocation.difference) > 0 ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                      <AlertCircle className="h-3.5 w-3.5" /> ₹{splitAllocation.remaining} remaining
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-semibold text-destructive">
                      <AlertCircle className="h-3.5 w-3.5" /> Over-allocated by ₹{Math.abs(parseFloat(splitAllocation.difference)).toFixed(2)}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 text-center border-t border-border/50">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Total Receipt</span>
                    <span className="text-xs font-bold">₹{watchedAmount || "0.00"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Allocated</span>
                    <span className="text-xs font-bold text-foreground">₹{parseFloat(splitAllocation.totalAllocated).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Remaining</span>
                    <span className={`text-xs font-bold ${splitAllocation.isValid ? "text-emerald-600" : "text-amber-600"}`}>
                      ₹{splitAllocation.remaining}
                    </span>
                  </div>
                </div>
              </div>

              {/* Split Lines List */}
              <div className="space-y-2.5">
                <Label className="text-xs font-semibold">Split Allocations ({splitItems.length} lines)</Label>
                {splitItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-lg border bg-card space-y-2 relative group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-muted-foreground">
                        Line #{index + 1}
                      </span>
                      {splitItems.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveSplitItem(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Category</Label>
                        <Select
                          value={item.category_id || "none"}
                          onValueChange={(val) =>
                            handleUpdateSplitItem(
                              item.id,
                              "category_id",
                              val === "none" ? null : val
                            )
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Category" />
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

                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Amount (INR)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={item.amount}
                          onChange={(e) =>
                            handleUpdateSplitItem(item.id, "amount", e.target.value)
                          }
                          className="h-8 text-xs font-semibold"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Input
                        placeholder={`Description for line #${index + 1} (optional)`}
                        value={item.description}
                        onChange={(e) =>
                          handleUpdateSplitItem(item.id, "description", e.target.value)
                        }
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddSplitItem}
                  className="w-full gap-1.5 text-xs h-8"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Another Split Line</span>
                </Button>
              </div>
            </div>
          ) : (
            /* Standard Single Transaction Account & Category */
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

          {/* Subcategory (if standard mode and category selected) */}
          {!isSplitMode && selectedType !== "transfer" && availableSubcategories.length > 0 && (
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
            <Button
              type="submit"
              disabled={isSubmitting || (isSplitMode && selectedType !== "transfer" && !splitAllocation.isValid)}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSplitMode ? "Save Split Transactions" : "Save Transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  PlusCircle,
  Loader2,
  TrendingDown,
  TrendingUp,
  ArrowLeftRight,
  Split,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Delete,
  Calendar,
  Tag,
  FileText,
  ChevronDown,
  ChevronUp,
  Utensils,
  ShoppingCart,
  Car,
  ShoppingBag,
  Zap,
  HeartPulse,
  Plane,
  Briefcase,
  Layers,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { format, subDays } from "date-fns";

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

// Category icon resolver helper
function getCategoryIcon(name: string, iconStr?: string | null) {
  const lower = (name || "").toLowerCase();
  if (lower.includes("food") || lower.includes("dining") || lower.includes("restaurant")) {
    return <Utensils className="h-3.5 w-3.5" />;
  }
  if (lower.includes("grocer") || lower.includes("supermarket") || lower.includes("provision")) {
    return <ShoppingCart className="h-3.5 w-3.5" />;
  }
  if (lower.includes("transport") || lower.includes("fuel") || lower.includes("cab") || lower.includes("commute")) {
    return <Car className="h-3.5 w-3.5" />;
  }
  if (lower.includes("shop") || lower.includes("clothing") || lower.includes("electronics")) {
    return <ShoppingBag className="h-3.5 w-3.5" />;
  }
  if (lower.includes("bill") || lower.includes("utility") || lower.includes("electricity") || lower.includes("internet")) {
    return <Zap className="h-3.5 w-3.5" />;
  }
  if (lower.includes("health") || lower.includes("medical") || lower.includes("pharma")) {
    return <HeartPulse className="h-3.5 w-3.5" />;
  }
  if (lower.includes("travel") || lower.includes("flight") || lower.includes("hotel")) {
    return <Plane className="h-3.5 w-3.5" />;
  }
  if (lower.includes("salary") || lower.includes("wage") || lower.includes("income") || lower.includes("freelance")) {
    return <Briefcase className="h-3.5 w-3.5" />;
  }
  return <Tag className="h-3.5 w-3.5" />;
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
  const [showKeypad, setShowKeypad] = React.useState(true);
  const [showMoreDetails, setShowMoreDetails] = React.useState(false);
  const [showCustomDate, setShowCustomDate] = React.useState(false);
  const [showAllCategories, setShowAllCategories] = React.useState(false);

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

  const todayStr = React.useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const yesterdayStr = React.useMemo(() => format(subDays(new Date(), 1), "yyyy-MM-dd"), []);

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
      transaction_date: todayStr,
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
  const watchedAmount = watch("amount") || "";
  const selectedDate = watch("transaction_date");

  React.useEffect(() => {
    if (open && defaultType) {
      setValue("transaction_type", defaultType);
    }
  }, [open, defaultType, setValue]);

  // Categories filtered by transaction type
  const relevantCategories = React.useMemo(() => {
    if (selectedType === "transfer") return [];
    return categories.filter((c) => (c as any).type === selectedType || !(c as any).type);
  }, [categories, selectedType]);

  const topCategories = React.useMemo(() => {
    return relevantCategories.slice(0, 8);
  }, [relevantCategories]);

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

  // Keypad Handlers
  const handleKeypadPress = React.useCallback(
    (key: string) => {
      const current = watchedAmount || "";
      if (key === "backspace") {
        setValue("amount", current.slice(0, -1), { shouldValidate: true });
        return;
      }
      if (key === "clear") {
        setValue("amount", "", { shouldValidate: true });
        return;
      }
      if (key === ".") {
        if (!current) {
          setValue("amount", "0.", { shouldValidate: true });
        } else if (!current.includes(".")) {
          setValue("amount", current + ".", { shouldValidate: true });
        }
        return;
      }
      // Digit key 0-9
      if (current === "0" && key !== ".") {
        setValue("amount", key, { shouldValidate: true });
        return;
      }
      // Check decimal places
      if (current.includes(".")) {
        const parts = current.split(".");
        if (parts[1] && parts[1].length >= 2) {
          return; // Max 2 decimal digits
        }
      }
      // Max total length
      if (current.length >= 10) return;

      setValue("amount", current + key, { shouldValidate: true });
    },
    [watchedAmount, setValue]
  );

  // Physical keyboard listener for digits when dialog is open and not focusing an input
  React.useEffect(() => {
    if (!open || isSplitMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl?.tagName === "INPUT" ||
        activeEl?.tagName === "TEXTAREA" ||
        activeEl?.getAttribute("contenteditable") === "true";

      if (isInput) return;

      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        handleKeypadPress(e.key);
      } else if (e.key === ".") {
        e.preventDefault();
        handleKeypadPress(".");
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleKeypadPress("backspace");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, isSplitMode, handleKeypadPress]);

  // Split allocation
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
      setShowAllCategories(false);
      setShowMoreDetails(false);
      setSplitItems([
        { id: "1", amount: "", category_id: null, subcategory_id: null, description: "" },
        { id: "2", amount: "", category_id: null, subcategory_id: null, description: "" },
      ]);
    }
  }, [open]);

  const onSubmit = async (data: CreateTransactionInput) => {
    // If description is empty, auto-fill sensible description
    let finalDescription = (data.description || "").trim();
    if (!finalDescription) {
      if (data.transaction_type === "transfer") {
        const fromAcc = activeAccounts.find((a) => a.id === data.account_id);
        const toAcc = activeAccounts.find((a) => a.id === data.destination_account_id);
        finalDescription = `Transfer: ${fromAcc?.name || "Account"} to ${toAcc?.name || "Account"}`;
      } else {
        const cat = categories.find((c) => c.id === data.category_id);
        finalDescription = cat?.name || (data.transaction_type === "expense" ? "General Expense" : "General Income");
      }
    }

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
          parent_description: finalDescription,
          total_amount: data.amount,
          notes: data.notes || null,
          reference_number: data.reference_number || null,
          splits: splitItems.map((s, idx) => ({
            amount: s.amount,
            category_id: s.category_id,
            subcategory_id: s.subcategory_id,
            description: s.description.trim() || `${finalDescription} (Part ${idx + 1})`,
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
        const res = await createTransactionAction({
          ...data,
          description: finalDescription,
        });
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
            transaction_date: todayStr,
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
            <Button className="gap-2 bg-primary hover:bg-primary-hover text-surface shadow-xs transition-colors">
              <PlusCircle className="h-4 w-4" />
              <span>Add Transaction</span>
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent
        className={`${
          isSplitMode ? "sm:max-w-[620px]" : "sm:max-w-[500px]"
        } max-h-[92vh] overflow-y-auto bg-surface text-text-primary border-border p-5 rounded-2xl shadow-xl`}
      >
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-bold tracking-tight text-text-primary">
            Add Transaction
          </DialogTitle>
          <DialogDescription className="text-xs text-text-secondary">
            Quick Leftovers-style entry. Type amount, pick a category and account.
          </DialogDescription>
        </DialogHeader>

        {/* Transaction Type Segmented Pills */}
        <div className="flex items-center justify-between gap-1 p-1 bg-surface-secondary/70 rounded-xl border border-border/70 mt-1">
          <button
            type="button"
            onClick={() => handleTypeChange("expense")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
              selectedType === "expense"
                ? "bg-danger/15 text-danger border border-danger/30 shadow-2xs"
                : "text-text-secondary hover:text-text-primary hover:bg-surface/50"
            }`}
          >
            <TrendingDown className="h-3.5 w-3.5" />
            <span>Expense</span>
          </button>

          <button
            type="button"
            onClick={() => handleTypeChange("income")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
              selectedType === "income"
                ? "bg-success/15 text-success border border-success/30 shadow-2xs"
                : "text-text-secondary hover:text-text-primary hover:bg-surface/50"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Income</span>
          </button>

          <button
            type="button"
            onClick={() => handleTypeChange("transfer")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
              selectedType === "transfer"
                ? "bg-primary/15 text-primary border border-primary/30 shadow-2xs"
                : "text-text-secondary hover:text-text-primary hover:bg-surface/50"
            }`}
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            <span>Transfer</span>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          {/* Hero Tabular Amount Display */}
          <div className="relative flex flex-col items-center justify-center py-5 px-4 bg-surface-secondary/40 rounded-2xl border border-border/70 group">
            <span className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">
              {isSplitMode ? "Total Receipt Amount" : "Transaction Amount"}
            </span>
            <div className="flex items-baseline justify-center gap-1 mt-1 text-center">
              <span className="text-2xl font-bold text-text-secondary">₹</span>
              <span className="text-4xl sm:text-5xl font-extrabold tabular-nums tracking-tight text-text-primary">
                {watchedAmount || "0"}
              </span>
            </div>

            {/* Clear button if amount exists */}
            {watchedAmount && (
              <button
                type="button"
                onClick={() => handleKeypadPress("clear")}
                className="absolute right-3 top-3 text-xs text-text-secondary hover:text-danger p-1 rounded-md transition-colors"
                title="Clear amount"
              >
                Clear
              </button>
            )}

            {/* Hidden native input so screen readers and direct copy-paste work */}
            <input
              type="text"
              className="sr-only"
              {...register("amount")}
              readOnly
            />

            {errors.amount && (
              <p className="text-xs text-danger mt-1 font-medium">{errors.amount.message}</p>
            )}
          </div>

          {/* Numeric Keypad (Keypad-First Leftovers UX) */}
          {!isSplitMode && showKeypad && (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0"].map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleKeypadPress(key)}
                    className="h-11 sm:h-12 rounded-xl bg-surface-secondary/60 hover:bg-surface-secondary text-text-primary text-xl font-semibold border border-border/60 transition-transform active:scale-95 flex items-center justify-center shadow-2xs"
                  >
                    {key}
                  </button>
                ))}
                {/* Backspace Key */}
                <button
                  type="button"
                  onClick={() => handleKeypadPress("backspace")}
                  className="h-11 sm:h-12 rounded-xl bg-surface-secondary/60 hover:bg-surface-secondary text-text-secondary hover:text-danger text-lg font-medium border border-border/60 transition-transform active:scale-95 flex items-center justify-center shadow-2xs"
                  aria-label="Backspace"
                >
                  <Delete className="h-5 w-5" />
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowKeypad(false)}
                  className="text-[11px] text-text-secondary hover:text-primary transition-colors py-0.5"
                >
                  Hide Keypad (Use Keyboard)
                </button>
              </div>
            </div>
          )}

          {!isSplitMode && !showKeypad && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="manual-amount" className="text-xs font-medium text-text-secondary">
                  Direct Amount Input (INR)
                </Label>
                <button
                  type="button"
                  onClick={() => setShowKeypad(true)}
                  className="text-[11px] text-primary hover:underline font-medium"
                >
                  Show Keypad
                </button>
              </div>
              <Input
                id="manual-amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={watchedAmount}
                onChange={(e) => setValue("amount", e.target.value, { shouldValidate: true })}
                className="h-10 text-base font-semibold tabular-nums bg-surface border-border"
              />
            </div>
          )}

          {/* 1-Tap Category Selector (For Expense & Income) */}
          {selectedType !== "transfer" && !isSplitMode && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-text-secondary">Category</Label>
                <button
                  type="button"
                  onClick={() => setShowAllCategories(!showAllCategories)}
                  className="text-[11px] text-primary hover:underline font-medium"
                >
                  {showAllCategories ? "Show Top" : "All Categories"}
                </button>
              </div>

              {/* Quick Tap Category Chips */}
              <div className="flex flex-wrap gap-1.5">
                {(showAllCategories ? relevantCategories : topCategories).map((cat) => {
                  const isSelected = selectedCategoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setValue("category_id", isSelected ? null : cat.id);
                        setValue("subcategory_id", null);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                        isSelected
                          ? "bg-primary-soft text-primary border-primary ring-1 ring-primary/40 font-semibold"
                          : "bg-surface hover:bg-surface-secondary text-text-secondary hover:text-text-primary border-border/80"
                      }`}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: (cat as any).color || "#244B3C" }}
                      />
                      {getCategoryIcon(cat.name, (cat as any).icon)}
                      <span>{cat.name}</span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => {
                    setValue("category_id", null);
                    setValue("subcategory_id", null);
                  }}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all border ${
                    !selectedCategoryId
                      ? "bg-surface-secondary text-text-primary border-border font-semibold"
                      : "bg-surface text-text-secondary border-border/60 hover:bg-surface-secondary"
                  }`}
                >
                  Uncategorized
                </button>
              </div>

              {/* Subcategories pill selection if category chosen and subcategories exist */}
              {availableSubcategories.length > 0 && (
                <div className="pt-1.5 space-y-1">
                  <span className="text-[11px] text-text-secondary font-medium">Subcategory:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {availableSubcategories.map((sub) => {
                      const isSubSelected = watch("subcategory_id") === sub.id;
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() =>
                            setValue("subcategory_id", isSubSelected ? null : sub.id)
                          }
                          className={`text-[11px] px-2.5 py-1 rounded-md border transition-all ${
                            isSubSelected
                              ? "bg-primary text-surface border-primary font-medium"
                              : "bg-surface-secondary/50 text-text-secondary hover:text-text-primary border-border/60"
                          }`}
                        >
                          {sub.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Account Selection (1-Tap Horizontal Chips) */}
          {selectedType === "transfer" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-text-secondary">From Account</Label>
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
                  <SelectTrigger className="h-9 text-xs bg-surface border-border">
                    <SelectValue placeholder="From account" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name} ({acc.institution_name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-text-secondary">To Account</Label>
                <Select
                  value={selectedDestAccountId || ""}
                  onValueChange={(val) => setValue("destination_account_id", val)}
                >
                  <SelectTrigger className="h-9 text-xs bg-surface border-border">
                    <SelectValue placeholder="To account" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeAccounts
                      .filter((acc) => acc.id !== selectedAccountId)
                      .map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name} ({acc.institution_name})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-text-secondary">Account</Label>
              <div className="flex flex-wrap gap-1.5">
                {activeAccounts.map((acc) => {
                  const isAccSelected = selectedAccountId === acc.id;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => setValue("account_id", acc.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all border ${
                        isAccSelected
                          ? "bg-primary text-surface border-primary font-semibold shadow-xs"
                          : "bg-surface hover:bg-surface-secondary text-text-primary border-border/80"
                      }`}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: acc.color || "#244B3C" }}
                      />
                      <span>{acc.name}</span>
                      <span className={`text-[10px] ${isAccSelected ? "text-surface/80" : "text-text-secondary"}`}>
                        ₹{parseFloat(String(acc.current_balance)).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Date Selection & Merchant Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Quick Date Presets */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-text-secondary">Date</Label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setValue("transaction_date", todayStr);
                    setShowCustomDate(false);
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border transition-all ${
                    selectedDate === todayStr && !showCustomDate
                      ? "bg-primary-soft text-primary border-primary font-semibold"
                      : "bg-surface text-text-secondary hover:text-text-primary border-border/70"
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setValue("transaction_date", yesterdayStr);
                    setShowCustomDate(false);
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border transition-all ${
                    selectedDate === yesterdayStr && !showCustomDate
                      ? "bg-primary-soft text-primary border-primary font-semibold"
                      : "bg-surface text-text-secondary hover:text-text-primary border-border/70"
                  }`}
                >
                  Yesterday
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomDate(!showCustomDate)}
                  className={`p-2 rounded-lg text-xs border transition-all ${
                    showCustomDate
                      ? "bg-primary-soft text-primary border-primary"
                      : "bg-surface text-text-secondary hover:text-text-primary border-border/70"
                  }`}
                  title="Pick custom date"
                >
                  <Calendar className="h-3.5 w-3.5" />
                </button>
              </div>

              {showCustomDate && (
                <Input
                  type="date"
                  {...register("transaction_date")}
                  className="h-8 text-xs bg-surface border-border mt-1"
                />
              )}
            </div>

            {/* Merchant / Description */}
            <div className="space-y-1.5">
              <Label htmlFor="txn-desc" className="text-xs font-medium text-text-secondary">
                {selectedType === "transfer" ? "Transfer Note" : "Merchant / Description"}
              </Label>
              <Input
                id="txn-desc"
                placeholder={
                  selectedType === "expense"
                    ? "e.g. Swiggy, Groceries, Starbucks"
                    : selectedType === "income"
                    ? "e.g. Salary, Client Invoice"
                    : "e.g. Savings Transfer"
                }
                {...register("description")}
                className="h-9 text-xs bg-surface border-border"
              />
            </div>
          </div>

          {/* Split Mode Toggle (for Non-transfer transactions) */}
          {selectedType !== "transfer" && (
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-surface-secondary/30 p-2.5">
              <div className="space-y-0.5">
                <Label htmlFor="split-toggle" className="text-xs font-semibold flex items-center gap-1.5 cursor-pointer text-text-primary">
                  <Split className="h-3.5 w-3.5 text-primary" />
                  <span>Split Receipt Across Multiple Categories</span>
                </Label>
                <p className="text-[11px] text-text-secondary">
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

          {/* Split Allocation Builder (When Split Mode is ON) */}
          {isSplitMode && selectedType !== "transfer" && (
            <div className="space-y-3 pt-1 border-t border-border/60">
              <div className="rounded-xl border border-border/70 p-3 bg-surface-secondary/40 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary font-medium">Allocation Balance:</span>
                  {splitAllocation.isValid ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" /> 100% Balanced (₹0.00 left)
                    </span>
                  ) : parseFloat(splitAllocation.difference) > 0 ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-warning">
                      <AlertCircle className="h-3.5 w-3.5" /> ₹{splitAllocation.remaining} remaining
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-semibold text-danger">
                      <AlertCircle className="h-3.5 w-3.5" /> Over-allocated by ₹{Math.abs(parseFloat(splitAllocation.difference)).toFixed(2)}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 text-center border-t border-border/50">
                  <div>
                    <span className="text-[10px] text-text-secondary block">Total Receipt</span>
                    <span className="text-xs font-bold text-text-primary">₹{watchedAmount || "0.00"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-secondary block">Allocated</span>
                    <span className="text-xs font-bold text-text-primary">₹{parseFloat(splitAllocation.totalAllocated).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-secondary block">Remaining</span>
                    <span className={`text-xs font-bold ${splitAllocation.isValid ? "text-success" : "text-warning"}`}>
                      ₹{splitAllocation.remaining}
                    </span>
                  </div>
                </div>
              </div>

              {/* Split Lines */}
              <div className="space-y-2.5">
                <Label className="text-xs font-semibold text-text-primary">
                  Split Lines ({splitItems.length})
                </Label>
                {splitItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl border border-border/70 bg-surface space-y-2 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-text-secondary">
                        Line #{index + 1}
                      </span>
                      {splitItems.length > 2 && (
                        <button
                          type="button"
                          className="text-text-secondary hover:text-danger p-1 rounded-md transition-colors"
                          onClick={() => handleRemoveSplitItem(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-text-secondary">Category</Label>
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
                          <SelectTrigger className="h-8 text-xs bg-surface border-border">
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
                        <Label className="text-[11px] text-text-secondary">Amount (INR)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={item.amount}
                          onChange={(e) =>
                            handleUpdateSplitItem(item.id, "amount", e.target.value)
                          }
                          className="h-8 text-xs font-semibold tabular-nums bg-surface border-border"
                        />
                      </div>
                    </div>

                    <Input
                      placeholder={`Description for line #${index + 1} (optional)`}
                      value={item.description}
                      onChange={(e) =>
                        handleUpdateSplitItem(item.id, "description", e.target.value)
                      }
                      className="h-7 text-xs bg-surface border-border"
                    />
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddSplitItem}
                  className="w-full gap-1.5 text-xs h-8 border-dashed border-border text-text-secondary hover:text-text-primary"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Another Split Line</span>
                </Button>
              </div>
            </div>
          )}

          {/* More Details Collapsible (Notes, Reference UPI, Tags) */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowMoreDetails(!showMoreDetails)}
              className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors py-1"
            >
              {showMoreDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              <span>{showMoreDetails ? "Hide additional details" : "Add note, reference or UPI ID"}</span>
            </button>

            {showMoreDetails && (
              <div className="space-y-3 pt-2 animate-in fade-in">
                <div className="space-y-1">
                  <Label htmlFor="txn-ref" className="text-xs text-text-secondary">
                    Reference / UPI ID
                  </Label>
                  <Input
                    id="txn-ref"
                    placeholder="e.g. UPI/32849102482, Cheque #004"
                    {...register("reference_number")}
                    className="h-8 text-xs bg-surface border-border"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="txn-notes" className="text-xs text-text-secondary">
                    Personal Notes
                  </Label>
                  <Input
                    id="txn-notes"
                    placeholder="e.g. Dinner with team, reimbursed later"
                    {...register("notes")}
                    className="h-8 text-xs bg-surface border-border"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
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
              disabled={isSubmitting || (isSplitMode && selectedType !== "transfer" && !splitAllocation.isValid)}
              className="bg-primary hover:bg-primary-hover text-surface font-semibold rounded-xl px-5 shadow-xs transition-colors"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSplitMode
                ? "Save Split Transactions"
                : selectedType === "expense"
                ? `Save Expense ${watchedAmount ? `· ₹${watchedAmount}` : ""}`
                : selectedType === "income"
                ? `Save Income ${watchedAmount ? `· ₹${watchedAmount}` : ""}`
                : `Record Transfer ${watchedAmount ? `· ₹${watchedAmount}` : ""}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import * as React from "react";
import { format, subDays, addDays } from "date-fns";
import {
  X,
  TrendingDown,
  TrendingUp,
  ArrowLeftRight,
  Check,
  ChevronDown,
  Calendar as CalendarIcon,
  Tag,
  Split,
  Camera,
  Layers,
  Utensils,
  ShoppingCart,
  Car,
  Home,
  ShoppingBag,
  Zap,
  Briefcase,
  Coins,
  Delete,
  Loader2,
  Landmark,
  Wallet,
  CreditCard,
  Building,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { Tables } from "@/types/database";
import { createTransactionAction } from "@/app/(dashboard)/transactions/actions";
import {
  createCategoryAction,
  createTagAction,
  getUserTagsAction,
} from "@/app/(dashboard)/categories/actions";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface MobileKeypadComposerProps {
  accounts: Tables<"accounts">[];
  categories: (Tables<"categories"> & { subcategories?: Tables<"subcategories">[] })[];
  defaultType?: "expense" | "income" | "transfer";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Category icon helper
function getCategoryIcon(name: string) {
  const lower = (name || "").toLowerCase();
  if (lower.includes("food") || lower.includes("dining") || lower.includes("restaurant") || lower.includes("cafe")) {
    return <Utensils className="h-3.5 w-3.5" />;
  }
  if (lower.includes("grocer") || lower.includes("supermarket") || lower.includes("provision")) {
    return <ShoppingCart className="h-3.5 w-3.5" />;
  }
  if (lower.includes("transport") || lower.includes("fuel") || lower.includes("cab") || lower.includes("commute")) {
    return <Car className="h-3.5 w-3.5" />;
  }
  if (lower.includes("rent") || lower.includes("housing") || lower.includes("home")) {
    return <Home className="h-3.5 w-3.5" />;
  }
  if (lower.includes("shop") || lower.includes("clothing") || lower.includes("electronics")) {
    return <ShoppingBag className="h-3.5 w-3.5" />;
  }
  if (lower.includes("bill") || lower.includes("utility") || lower.includes("electric") || lower.includes("recharge")) {
    return <Zap className="h-3.5 w-3.5" />;
  }
  if (lower.includes("sip") || lower.includes("invest") || lower.includes("mutual") || lower.includes("stock")) {
    return <Coins className="h-3.5 w-3.5" />;
  }
  if (lower.includes("salary") || lower.includes("wage") || lower.includes("payroll") || lower.includes("business")) {
    return <Briefcase className="h-3.5 w-3.5" />;
  }
  return <Tag className="h-3.5 w-3.5" />;
}

export function MobileKeypadComposer({
  accounts,
  categories,
  defaultType = "expense",
  open,
  onOpenChange,
}: MobileKeypadComposerProps) {
  const [transactionType, setTransactionType] = React.useState<"expense" | "income" | "transfer">(defaultType);
  const [amountStr, setAmountStr] = React.useState<string>("0");
  const [note, setNote] = React.useState<string>("");
  const [showNoteInput, setShowNoteInput] = React.useState<boolean>(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = React.useState<boolean>(false);
  const [isDestAccountMenuOpen, setIsDestAccountMenuOpen] = React.useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  const activeAccounts = React.useMemo(() => accounts.filter((a) => !a.is_archived), [accounts]);
  const [selectedAccountId, setSelectedAccountId] = React.useState<string>(activeAccounts[0]?.id || "");
  const [selectedDestAccountId, setSelectedDestAccountId] = React.useState<string>(
    activeAccounts.find((a) => a.id !== activeAccounts[0]?.id)?.id || ""
  );

  // Date selection state
  const today = React.useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = React.useState<string>(format(today, "yyyy-MM-dd"));

  const dateOptions = React.useMemo(() => {
    const yesterday = subDays(today, 1);
    const tomorrow = addDays(today, 1);
    return [
      { label: "Yesterday", dayNum: format(yesterday, "d"), value: format(yesterday, "yyyy-MM-dd") },
      { label: "Today", dayNum: format(today, "d"), value: format(today, "yyyy-MM-dd") },
      { label: "Tomorrow", dayNum: format(tomorrow, "d"), value: format(tomorrow, "yyyy-MM-dd") },
    ];
  }, [today]);

  // Categories filtered by type
  const relevantCategories = React.useMemo(() => {
    if (transactionType === "transfer") return [];
    return categories.filter((c) => {
      const type = (c as any).type;
      return !type || type === transactionType;
    });
  }, [categories, transactionType]);

  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string | null>(null);

  // Custom Tags
  const [availableTags, setAvailableTags] = React.useState<Tables<"tags">[]>([]);
  const [selectedTagNames, setSelectedTagNames] = React.useState<string[]>([]);

  // Quick inline creation states
  const [isQuickAddCategoryOpen, setIsQuickAddCategoryOpen] = React.useState(false);
  const [newCatName, setNewCatName] = React.useState("");
  const [isQuickAddTagOpen, setIsQuickAddTagOpen] = React.useState(false);
  const [newTagName, setNewTagName] = React.useState("");

  // Load user tags on open
  React.useEffect(() => {
    if (open) {
      getUserTagsAction().then((res) => {
        if (res.success && res.data) {
          setAvailableTags(res.data);
        }
      });
    }
  }, [open]);

  // Sync default type when opened
  React.useEffect(() => {
    if (open) {
      setTransactionType(defaultType);
      setAmountStr("0");
      setNote("");
      setShowNoteInput(false);
      setSelectedDate(format(new Date(), "yyyy-MM-dd"));
      setSelectedTagNames([]);
      if (activeAccounts.length > 0 && !selectedAccountId) {
        setSelectedAccountId(activeAccounts[0].id);
      }
    }
  }, [open, defaultType, activeAccounts, selectedAccountId]);

  // Selected account object
  const selectedAccount = activeAccounts.find((a) => a.id === selectedAccountId);
  const selectedDestAccount = activeAccounts.find((a) => a.id === selectedDestAccountId);

  // Keypad Handlers
  const handleKeypadPress = (key: string) => {
    if (key === "backspace") {
      if (amountStr.length <= 1) {
        setAmountStr("0");
      } else {
        setAmountStr(amountStr.slice(0, -1));
      }
      return;
    }

    if (key === ".") {
      if (!amountStr.includes(".")) {
        setAmountStr(amountStr + ".");
      }
      return;
    }

    if (key === "00") {
      if (amountStr === "0") return;
      if (!amountStr.includes(".") || (amountStr.split(".")[1] || "").length < 2) {
        setAmountStr(amountStr + "00");
      }
      return;
    }

    // Digit key
    if (amountStr === "0") {
      setAmountStr(key);
    } else {
      if (amountStr.includes(".")) {
        const decimals = amountStr.split(".")[1] || "";
        if (decimals.length >= 2) return;
      }
      if (amountStr.length < 11) {
        setAmountStr(amountStr + key);
      }
    }
  };

  const handleToggleTag = (tagName: string) => {
    setSelectedTagNames((prev) =>
      prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName]
    );
  };

  const handleQuickCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      const res = await createCategoryAction({
        name: newCatName.trim(),
        type: transactionType === "transfer" ? "transfer" : transactionType,
        color: "#376FE5",
        icon: "Folder",
      });
      if (res.success && res.data) {
        toast.success(`Category "${newCatName}" created!`);
        setSelectedCategoryId((res.data as any).id);
        setNewCatName("");
        setIsQuickAddCategoryOpen(false);
      } else {
        toast.error(res.error || "Failed to create category");
      }
    } catch {
      toast.error("Error creating category");
    }
  };

  const handleQuickCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    try {
      const cleanName = newTagName.trim().replace(/^#/, "");
      const res = await createTagAction({
        name: cleanName,
        color: "#376FE5",
      });
      if (res.success && res.data) {
        toast.success(`Tag #${cleanName} created!`);
        setAvailableTags((prev) => [...prev, res.data as Tables<"tags">]);
        setSelectedTagNames((prev) => [...prev, cleanName]);
        setNewTagName("");
        setIsQuickAddTagOpen(false);
      } else {
        toast.error(res.error || "Failed to create tag");
      }
    } catch {
      toast.error("Error creating tag");
    }
  };

  // Submit Handler
  const handleSubmit = async () => {
    const num = parseFloat(amountStr);
    if (!num || num <= 0) {
      toast.error("Please enter a valid amount greater than ₹0");
      return;
    }

    if (!selectedAccountId) {
      toast.error("Please select a source account");
      return;
    }

    if (transactionType === "transfer" && !selectedDestAccountId) {
      toast.error("Please select a destination account for transfer");
      return;
    }

    if (transactionType === "transfer" && selectedAccountId === selectedDestAccountId) {
      toast.error("Source and destination accounts must be different");
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedCategoryObj = categories.find((c) => c.id === selectedCategoryId);
      const desc = note.trim() || (
        transactionType === "transfer"
          ? `Transfer: ${selectedAccount?.name} to ${selectedDestAccount?.name}`
          : selectedCategoryObj?.name || (transactionType === "income" ? "Income" : "Expense")
      );

      const res = await createTransactionAction({
        account_id: selectedAccountId,
        destination_account_id: transactionType === "transfer" ? selectedDestAccountId : null,
        category_id: transactionType !== "transfer" ? selectedCategoryId : null,
        amount: num.toFixed(2),
        currency: "INR",
        transaction_type: transactionType,
        transaction_date: selectedDate,
        description: desc,
        notes: note.trim() || null,
        tags: selectedTagNames,
      });

      if (res.success) {
        toast.success(res.message || "Transaction recorded successfully");
        onOpenChange(false);
      } else {
        toast.error(res.error || "Failed to save transaction");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-mobile-bg text-mobile-primary animate-in fade-in zoom-in-95 duration-150 overflow-hidden select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Add Transaction"
    >
      {/* ─────────────────────────────────────────────────────────────
          1. TOP NAVIGATION BAR (Close, Type Selector, Note Trigger)
      ────────────────────────────────────────────────────────────── */}
      <div className="px-4 pt-safe pt-3 pb-2 flex items-center justify-between gap-2 border-b border-mobile-border">
        {/* Close Button */}
        <button
          onClick={() => onOpenChange(false)}
          className="h-10 w-10 rounded-full bg-mobile-surface border border-mobile-border flex items-center justify-center text-mobile-secondaryText hover:text-mobile-primary active:scale-95 transition-all cursor-pointer"
          aria-label="Close composer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* 3-State Segmented Pill Switcher (Expense | Income | Transfer) */}
        <div className="flex items-center p-1 bg-mobile-surface border border-mobile-border rounded-full">
          <button
            onClick={() => setTransactionType("expense")}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-mono font-medium transition-all cursor-pointer",
              transactionType === "expense"
                ? "bg-mobile-expense text-white font-bold shadow-xs"
                : "text-mobile-secondaryText hover:text-mobile-primary"
            )}
          >
            Expense
          </button>
          <button
            onClick={() => setTransactionType("income")}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-mono font-medium transition-all cursor-pointer",
              transactionType === "income"
                ? "bg-mobile-income text-white font-bold shadow-xs"
                : "text-mobile-secondaryText hover:text-mobile-primary"
            )}
          >
            Income
          </button>
          <button
            onClick={() => setTransactionType("transfer")}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-mono font-medium transition-all cursor-pointer",
              transactionType === "transfer"
                ? "bg-mobile-accent text-white font-bold shadow-xs"
                : "text-mobile-secondaryText hover:text-mobile-primary"
            )}
          >
            Transfer
          </button>
        </div>

        {/* Note / Tag toggle icon */}
        <button
          onClick={() => setShowNoteInput(!showNoteInput)}
          className={cn(
            "h-10 w-10 rounded-full border border-mobile-border flex items-center justify-center transition-all cursor-pointer",
            showNoteInput || note
              ? "bg-mobile-accent text-background"
              : "bg-mobile-surface text-mobile-secondaryText hover:text-mobile-primary"
          )}
          title="Add note / merchant"
        >
          <Tag className="h-4 w-4" />
        </button>
      </div>

      {/* Optional Note / Merchant Input */}
      {showNoteInput && (
        <div className="px-4 py-2 bg-mobile-surface/80 border-b border-mobile-border animate-in slide-in-from-top-2 duration-150">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add note, payee, or description..."
            className="w-full bg-mobile-secondary border border-mobile-border rounded-xl px-3 py-2 text-xs font-mono text-mobile-primary placeholder:text-mobile-secondaryText focus:outline-none focus:border-mobile-accent"
            autoFocus
          />
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. LARGE DISPLAY AMOUNT HERO
      ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-3 min-h-[110px]">
        <div className="flex items-baseline justify-center gap-1.5 font-mono">
          <span
            className={cn(
              "text-3xl font-light",
              transactionType === "expense"
                ? "text-mobile-expense"
                : transactionType === "income"
                ? "text-mobile-income"
                : "text-mobile-accent"
            )}
          >
            ₹
          </span>
          <span
            className={cn(
              "text-5xl sm:text-6xl font-extrabold tracking-tight tabular-nums",
              amountStr === "0" ? "text-mobile-secondaryText" : "text-mobile-primary"
            )}
          >
            {amountStr}
          </span>
        </div>

        {/* Selected Category or Transfer label */}
        <div className="mt-1 text-xs font-mono text-mobile-secondaryText flex items-center gap-1">
          {transactionType === "transfer" ? (
            <span>
              Transfer {selectedAccount?.name} → {selectedDestAccount?.name}
            </span>
          ) : selectedCategoryId ? (
            <span className="text-mobile-accent font-semibold">
              {categories.find((c) => c.id === selectedCategoryId)?.name}
            </span>
          ) : (
            <span className="italic">Tap a category below</span>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. COMPACT ACCOUNT PICKER CHIPS
      ────────────────────────────────────────────────────────────── */}
      <div className="px-4 py-2 border-t border-mobile-border bg-mobile-bg/50 flex items-center justify-between gap-2 relative">
        {/* Source Account Button */}
        <div className="relative">
          <button
            onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
            className="flex items-center gap-1.5 bg-mobile-surface border border-mobile-border rounded-full px-3 py-1.5 text-xs text-mobile-primary font-medium cursor-pointer"
          >
            <div className="h-4 w-4 rounded-full bg-mobile-secondary flex items-center justify-center text-mobile-accent shrink-0">
              {selectedAccount?.account_type === "cash" ? (
                <Wallet className="h-3 w-3" />
              ) : selectedAccount?.account_type === "credit_card" ? (
                <CreditCard className="h-3 w-3" />
              ) : (
                <Landmark className="h-3 w-3" />
              )}
            </div>
            <span className="font-mono">{selectedAccount?.name || "Account"}</span>
            <ChevronDown className="h-3 w-3 text-mobile-secondaryText" />
          </button>

          {/* Account Dropdown */}
          {isAccountMenuOpen && (
            <div className="absolute left-0 bottom-full mb-2 w-56 bg-mobile-surface border border-mobile-border rounded-2xl shadow-2xl p-2 z-50 max-h-60 overflow-y-auto">
              <span className="text-[10px] font-mono uppercase text-mobile-secondaryText px-2 py-1 block">
                Select Account
              </span>
              {activeAccounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => {
                    setSelectedAccountId(acc.id);
                    setIsAccountMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-mobile-primary hover:bg-mobile-secondary text-left cursor-pointer"
                >
                  <span className="truncate">{acc.name}</span>
                  {acc.id === selectedAccountId && <Check className="h-4 w-4 text-mobile-accent" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Transfer Destination Account Picker */}
        {transactionType === "transfer" && (
          <div className="relative">
            <button
              onClick={() => setIsDestAccountMenuOpen(!isDestAccountMenuOpen)}
              className="flex items-center gap-1.5 bg-mobile-surface border border-mobile-border rounded-full px-3 py-1.5 text-xs text-mobile-accent font-medium cursor-pointer"
            >
              <span>To: {selectedDestAccount?.name || "Account"}</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            {isDestAccountMenuOpen && (
              <div className="absolute right-0 bottom-full mb-2 w-56 bg-mobile-surface border border-mobile-border rounded-2xl shadow-2xl p-2 z-50 max-h-60 overflow-y-auto">
                <span className="text-[10px] font-mono uppercase text-mobile-secondaryText px-2 py-1 block">
                  Transfer Destination
                </span>
                {activeAccounts.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => {
                      setSelectedDestAccountId(acc.id);
                      setIsDestAccountMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-mobile-primary hover:bg-mobile-secondary text-left cursor-pointer"
                  >
                    <span className="truncate">{acc.name}</span>
                    {acc.id === selectedDestAccountId && <Check className="h-4 w-4 text-mobile-accent" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action Icon Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setTransactionType(transactionType === "transfer" ? "expense" : "transfer")}
            className={cn(
              "h-8 w-8 rounded-full border border-mobile-border flex items-center justify-center transition-all cursor-pointer",
              transactionType === "transfer"
                ? "bg-mobile-accent text-background"
                : "bg-mobile-surface text-mobile-secondaryText hover:text-mobile-primary"
            )}
            title="Transfer between accounts"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. HORIZONTAL DATE SELECTOR CHIPS
      ────────────────────────────────────────────────────────────── */}
      <div className="px-4 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {dateOptions.map((opt) => {
          const isSelected = selectedDate === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setSelectedDate(opt.value)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1",
                isSelected
                  ? "bg-mobile-accent text-background font-bold shadow-xs"
                  : "bg-mobile-surface border border-mobile-border text-mobile-secondaryText hover:text-mobile-primary"
              )}
            >
              <span>{opt.label}</span>
              <span className="opacity-80 font-mono text-[11px]">{opt.dayNum}</span>
            </button>
          );
        })}

        {/* Custom Calendar Picker */}
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-mobile-surface border border-mobile-border rounded-full px-2.5 py-1 text-xs text-mobile-secondaryText font-mono cursor-pointer"
          title="Pick custom date"
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. CATEGORIES & TAGS SELECTOR CHIPS (+ Add Category & + Add Tag)
      ────────────────────────────────────────────────────────────── */}
      {transactionType !== "transfer" && (
        <div className="px-4 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-mobile-border/80">
          {/* Quick Add Category Chip */}
          <button
            onClick={() => setIsQuickAddCategoryOpen(true)}
            className="px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 bg-mobile-surface border border-dashed border-mobile-border text-mobile-accent hover:bg-mobile-secondary shrink-0"
            title="Create new category"
          >
            <Plus className="h-3 w-3" />
            <span>Category</span>
          </button>

          {relevantCategories.slice(0, 10).map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(isSelected ? null : cat.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0",
                  isSelected
                    ? "bg-mobile-secondary text-mobile-accent border border-mobile-accent/50 font-bold"
                    : "bg-mobile-surface border border-mobile-border text-mobile-secondaryText hover:text-mobile-primary"
                )}
              >
                {getCategoryIcon(cat.name)}
                <span>{cat.name}</span>
              </button>
            );
          })}

          {/* Quick Add Tag Chip */}
          <button
            onClick={() => setIsQuickAddTagOpen(true)}
            className="px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 bg-mobile-surface border border-dashed border-mobile-border text-mobile-income hover:bg-mobile-secondary shrink-0 ml-1"
            title="Create new tag"
          >
            <Plus className="h-3 w-3" />
            <span>Tag</span>
          </button>

          {/* User Tag Chips */}
          {availableTags.map((t) => {
            const isSelected = selectedTagNames.includes(t.name);
            return (
              <button
                key={t.id}
                onClick={() => handleToggleTag(t.name)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-mono font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 shrink-0",
                  isSelected
                    ? "bg-mobile-income/20 text-mobile-income border border-mobile-income/50 font-bold"
                    : "bg-mobile-surface border border-mobile-border text-mobile-secondaryText hover:text-mobile-primary"
                )}
              >
                <span>#{t.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. NUMERIC KEYPAD WITH PROMINENT ADD BUTTON
      ────────────────────────────────────────────────────────────── */}
      <div className="p-4 bg-mobile-bg pb-safe">
        <div className="grid grid-cols-4 gap-2.5 max-w-sm mx-auto">
          {/* Row 1 */}
          <button
            onClick={() => handleKeypadPress("1")}
            className="h-14 rounded-2xl bg-mobile-surface hover:bg-mobile-secondary text-2xl font-mono font-medium text-mobile-primary flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xs border border-mobile-border/40"
          >
            1
          </button>
          <button
            onClick={() => handleKeypadPress("2")}
            className="h-14 rounded-2xl bg-mobile-surface hover:bg-mobile-secondary text-2xl font-mono font-medium text-mobile-primary flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xs border border-mobile-border/40"
          >
            2
          </button>
          <button
            onClick={() => handleKeypadPress("3")}
            className="h-14 rounded-2xl bg-mobile-surface hover:bg-mobile-secondary text-2xl font-mono font-medium text-mobile-primary flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xs border border-mobile-border/40"
          >
            3
          </button>
          <button
            onClick={() => handleKeypadPress("backspace")}
            className="h-14 rounded-2xl bg-mobile-surface hover:bg-mobile-secondary text-mobile-secondaryText hover:text-mobile-expense flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xs border border-mobile-border/40"
            aria-label="Backspace"
          >
            <Delete className="h-6 w-6" />
          </button>

          {/* Row 2 */}
          <button
            onClick={() => handleKeypadPress("4")}
            className="h-14 rounded-2xl bg-mobile-surface hover:bg-mobile-secondary text-2xl font-mono font-medium text-mobile-primary flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xs border border-mobile-border/40"
          >
            4
          </button>
          <button
            onClick={() => handleKeypadPress("5")}
            className="h-14 rounded-2xl bg-mobile-surface hover:bg-mobile-secondary text-2xl font-mono font-medium text-mobile-primary flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xs border border-mobile-border/40"
          >
            5
          </button>
          <button
            onClick={() => handleKeypadPress("6")}
            className="h-14 rounded-2xl bg-mobile-surface hover:bg-mobile-secondary text-2xl font-mono font-medium text-mobile-primary flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xs border border-mobile-border/40"
          >
            6
          </button>
          <button
            onClick={() => handleKeypadPress(".")}
            className="h-14 rounded-2xl bg-mobile-surface hover:bg-mobile-secondary text-2xl font-mono font-bold text-mobile-primary flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xs border border-mobile-border/40"
          >
            .
          </button>

          {/* Row 3 & 4 Grid: Digits on left 3 columns, Tall Action button on right */}
          <div className="col-span-3 grid grid-cols-3 gap-2.5">
            <button
              onClick={() => handleKeypadPress("7")}
              className="h-14 rounded-2xl bg-mobile-surface hover:bg-mobile-secondary text-2xl font-mono font-medium text-mobile-primary flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xs border border-mobile-border/40"
            >
              7
            </button>
            <button
              onClick={() => handleKeypadPress("8")}
              className="h-14 rounded-2xl bg-mobile-surface hover:bg-mobile-secondary text-2xl font-mono font-medium text-mobile-primary flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xs border border-mobile-border/40"
            >
              8
            </button>
            <button
              onClick={() => handleKeypadPress("9")}
              className="h-14 rounded-2xl bg-mobile-surface hover:bg-mobile-secondary text-2xl font-mono font-medium text-mobile-primary flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xs border border-mobile-border/40"
            >
              9
            </button>

            <button
              onClick={() => handleKeypadPress("00")}
              className="h-14 rounded-2xl bg-mobile-surface hover:bg-mobile-secondary text-xl font-mono font-medium text-mobile-secondaryText flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xs border border-mobile-border/40"
            >
              00
            </button>
            <button
              onClick={() => handleKeypadPress("0")}
              className="h-14 rounded-2xl bg-mobile-surface hover:bg-mobile-secondary text-2xl font-mono font-medium text-mobile-primary flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xs border border-mobile-border/40"
            >
              0
            </button>
            <button
              onClick={() => setAmountStr("0")}
              className="h-14 rounded-2xl bg-mobile-surface hover:bg-mobile-secondary text-xs font-mono font-semibold text-mobile-secondaryText flex items-center justify-center active:scale-95 transition-all cursor-pointer uppercase shadow-xs border border-mobile-border/40"
            >
              C
            </button>
          </div>

          {/* Large Prominent Action Add Button */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="h-[120px] rounded-2xl bg-mobile-accent hover:bg-mobile-accent/90 text-background flex flex-col items-center justify-center gap-1 font-bold shadow-lg shadow-mobile-accent/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="h-6 w-6 animate-spin text-background" />
            ) : (
              <>
                <Check className="h-6 w-6 stroke-[3]" />
                <span className="text-xs uppercase tracking-wider font-mono">Add</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Quick Add Category Dialog */}
      <Dialog open={isQuickAddCategoryOpen} onOpenChange={setIsQuickAddCategoryOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleQuickCreateCategory}>
            <DialogHeader>
              <DialogTitle className="text-base font-mono">Quick Add Category</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder="Category name (e.g. Groceries, Gym)"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsQuickAddCategoryOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Create & Select
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick Add Tag Dialog */}
      <Dialog open={isQuickAddTagOpen} onOpenChange={setIsQuickAddTagOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleQuickCreateTag}>
            <DialogHeader>
              <DialogTitle className="text-base font-mono">Quick Add Tag</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder="Tag name (e.g. vacation, diwali)"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsQuickAddTagOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Create & Select
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
} from "lucide-react";
import { toast } from "sonner";
import { Tables } from "@/types/database";
import { createTransactionAction } from "@/app/(dashboard)/transactions/actions";
import { cn } from "@/lib/utils";

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
  const [customDatePickerOpen, setCustomDatePickerOpen] = React.useState<boolean>(false);

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
    const list = categories.filter((c) => {
      const type = (c as any).type;
      return !type || type === transactionType;
    });
    return list;
  }, [categories, transactionType]);

  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string | null>(null);

  // Sync default type when opened
  React.useEffect(() => {
    if (open) {
      setTransactionType(defaultType);
      setAmountStr("0");
      setNote("");
      setShowNoteInput(false);
      setSelectedDate(format(new Date(), "yyyy-MM-dd"));
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
      // Limit to 2 decimal places
      if (amountStr.includes(".")) {
        const decimals = amountStr.split(".")[1] || "";
        if (decimals.length >= 2) return;
      }
      // Max 10 digits
      if (amountStr.length < 11) {
        setAmountStr(amountStr + key);
      }
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
        tags: [],
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
      className="fixed inset-0 z-50 flex flex-col bg-[#050505] text-[#F5F5F5] animate-in fade-in zoom-in-95 duration-150 overflow-hidden select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Transaction Entry"
    >
      {/* ─────────────────────────────────────────────────────────────
          1. TOP BAR: CLOSE BUTTON & EXPENSE / INCOME SWITCHER
      ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        {/* Close Button */}
        <button
          onClick={() => onOpenChange(false)}
          className="h-10 w-10 rounded-full bg-[#151515] border border-[#303030] flex items-center justify-center text-[#99999F] hover:text-[#F5F5F5] active:scale-95 transition-all cursor-pointer"
          aria-label="Close composer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Expense / Income / Transfer Segmented Switch */}
        <div className="flex items-center p-1 bg-[#151515] border border-[#303030] rounded-full">
          <button
            type="button"
            onClick={() => setTransactionType("expense")}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer",
              transactionType === "expense"
                ? "bg-[#202020] text-[#F5F5F5] shadow-xs"
                : "text-[#99999F] hover:text-[#F5F5F5]"
            )}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => setTransactionType("income")}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer",
              transactionType === "income"
                ? "bg-[#202020] text-[#80D5AE] shadow-xs"
                : "text-[#99999F] hover:text-[#F5F5F5]"
            )}
          >
            Income
          </button>
        </div>

        {/* Spacer for symmetry */}
        <div className="w-10" />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. HERO TABULAR AMOUNT DISPLAY & NOTE INPUT
      ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-2 min-h-[120px]">
        {/* Amount */}
        <div className="flex items-baseline justify-center gap-1.5">
          <span
            className={cn(
              "text-3xl sm:text-4xl font-bold transition-colors font-mono",
              transactionType === "income"
                ? "text-[#80D5AE]"
                : transactionType === "transfer"
                ? "text-[#A8C7FA]"
                : "text-[#F5F5F5]"
            )}
          >
            ₹
          </span>
          <span
            className={cn(
              "text-5xl sm:text-6xl font-extrabold tracking-tight tabular-nums transition-colors font-mono",
              transactionType === "income"
                ? "text-[#80D5AE]"
                : transactionType === "transfer"
                ? "text-[#A8C7FA]"
                : "text-[#F5F5F5]"
            )}
          >
            {amountStr}
          </span>
        </div>

        {/* Note / Description */}
        <div className="mt-3 w-full max-w-xs flex justify-center">
          {showNoteInput ? (
            <input
              type="text"
              autoFocus
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What was this for?"
              className="w-full bg-[#151515] border border-[#303030] rounded-full px-4 py-1.5 text-xs text-center text-[#F5F5F5] placeholder-[#99999F] focus:outline-none focus:border-[#A8C7FA]"
            />
          ) : (
            <button
              onClick={() => setShowNoteInput(true)}
              className="text-xs text-[#99999F] hover:text-[#F5F5F5] bg-[#151515]/60 hover:bg-[#151515] border border-[#303030] px-3.5 py-1.5 rounded-full transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>+ Add a note</span>
            </button>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. CONTROLS ROW: ACCOUNT SELECTOR PILL & ACTION ICONS
      ────────────────────────────────────────────────────────────── */}
      <div className="px-4 py-2 border-t border-[#202020] bg-[#050505]/50 flex items-center justify-between gap-2 relative">
        {/* Account Selector Pill */}
        <div className="relative">
          <button
            onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
            className="flex items-center gap-2 bg-[#151515] border border-[#303030] hover:border-[#404040] rounded-full px-3 py-1.5 text-xs text-[#F5F5F5] font-medium transition-all cursor-pointer active:scale-95"
          >
            <Landmark className="h-3.5 w-3.5 text-[#A8C7FA]" />
            <span className="truncate max-w-[120px]">{selectedAccount?.name || "Select Account"}</span>
            <ChevronDown className="h-3.5 w-3.5 text-[#99999F]" />
          </button>

          {/* Account Picker Dropdown Menu (Reference 10) */}
          {isAccountMenuOpen && (
            <div className="absolute left-0 bottom-full mb-2 w-56 bg-[#151515] border border-[#303030] rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150 max-h-60 overflow-y-auto">
              <span className="text-[10px] font-mono uppercase text-[#99999F] px-2 py-1 block">
                Choose Account
              </span>
              {activeAccounts.map((acc) => {
                const isSelected = acc.id === selectedAccountId;
                return (
                  <button
                    key={acc.id}
                    onClick={() => {
                      setSelectedAccountId(acc.id);
                      setIsAccountMenuOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer text-left",
                      isSelected
                        ? "bg-[#202020] text-[#A8C7FA] font-bold"
                        : "text-[#F5F5F5] hover:bg-[#202020]/60"
                    )}
                  >
                    <div className="truncate">
                      <p className="truncate">{acc.name}</p>
                      <p className="text-[10px] text-[#99999F] font-mono">{acc.institution_name || "Bank"}</p>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-[#A8C7FA] shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Transfer Destination (Only visible if transfer mode) */}
        {transactionType === "transfer" && (
          <div className="relative">
            <button
              onClick={() => setIsDestAccountMenuOpen(!isDestAccountMenuOpen)}
              className="flex items-center gap-1.5 bg-[#151515] border border-[#303030] rounded-full px-3 py-1.5 text-xs text-[#A8C7FA] font-medium cursor-pointer"
            >
              <span>To: {selectedDestAccount?.name || "Account"}</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            {isDestAccountMenuOpen && (
              <div className="absolute right-0 bottom-full mb-2 w-56 bg-[#151515] border border-[#303030] rounded-2xl shadow-2xl p-2 z-50 max-h-60 overflow-y-auto">
                <span className="text-[10px] font-mono uppercase text-[#99999F] px-2 py-1 block">
                  Transfer Destination
                </span>
                {activeAccounts.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => {
                      setSelectedDestAccountId(acc.id);
                      setIsDestAccountMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-[#F5F5F5] hover:bg-[#202020] text-left cursor-pointer"
                  >
                    <span className="truncate">{acc.name}</span>
                    {acc.id === selectedDestAccountId && <Check className="h-4 w-4 text-[#A8C7FA]" />}
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
              "h-8 w-8 rounded-full border border-[#303030] flex items-center justify-center transition-all cursor-pointer",
              transactionType === "transfer"
                ? "bg-[#A8C7FA] text-[#050505]"
                : "bg-[#151515] text-[#99999F] hover:text-[#F5F5F5]"
            )}
            title="Transfer between accounts"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => toast.info("Split transaction mode available")}
            className="h-8 w-8 rounded-full bg-[#151515] border border-[#303030] flex items-center justify-center text-[#99999F] hover:text-[#F5F5F5] transition-all cursor-pointer"
            title="Split transaction"
          >
            <Split className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => toast.info("Receipt photo attach")}
            className="h-8 w-8 rounded-full bg-[#151515] border border-[#303030] flex items-center justify-center text-[#99999F] hover:text-[#F5F5F5] transition-all cursor-pointer"
            title="Attach receipt"
          >
            <Camera className="h-3.5 w-3.5" />
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
                  ? "bg-[#A8C7FA] text-[#050505] font-bold shadow-xs"
                  : "bg-[#151515] border border-[#303030] text-[#99999F] hover:text-[#F5F5F5]"
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
          className="bg-[#151515] border border-[#303030] rounded-full px-2.5 py-1 text-xs text-[#99999F] font-mono cursor-pointer"
          title="Pick custom date"
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. HORIZONTAL CATEGORY SELECTOR CHIPS
      ────────────────────────────────────────────────────────────── */}
      {transactionType !== "transfer" && (
        <div className="px-4 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-[#202020]">
          {relevantCategories.slice(0, 10).map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(isSelected ? null : cat.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5",
                  isSelected
                    ? "bg-[#202020] text-[#A8C7FA] border border-[#A8C7FA]/50 font-bold"
                    : "bg-[#151515] border border-[#303030] text-[#99999F] hover:text-[#F5F5F5]"
                )}
              >
                {getCategoryIcon(cat.name)}
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. NUMERIC KEYPAD WITH PROMINENT ADD BUTTON (References 3 & 10)
      ────────────────────────────────────────────────────────────── */}
      <div className="p-4 bg-[#050505] pb-safe">
        <div className="grid grid-cols-4 gap-2.5 max-w-sm mx-auto">
          {/* Row 1 */}
          <button
            onClick={() => handleKeypadPress("1")}
            className="h-14 rounded-2xl bg-[#151515] hover:bg-[#202020] text-2xl font-mono font-medium text-[#F5F5F5] flex items-center justify-center active:scale-95 transition-all cursor-pointer"
          >
            1
          </button>
          <button
            onClick={() => handleKeypadPress("2")}
            className="h-14 rounded-2xl bg-[#151515] hover:bg-[#202020] text-2xl font-mono font-medium text-[#F5F5F5] flex items-center justify-center active:scale-95 transition-all cursor-pointer"
          >
            2
          </button>
          <button
            onClick={() => handleKeypadPress("3")}
            className="h-14 rounded-2xl bg-[#151515] hover:bg-[#202020] text-2xl font-mono font-medium text-[#F5F5F5] flex items-center justify-center active:scale-95 transition-all cursor-pointer"
          >
            3
          </button>
          <button
            onClick={() => handleKeypadPress("backspace")}
            className="h-14 rounded-2xl bg-[#151515] hover:bg-[#202020] text-[#99999F] hover:text-[#E58A91] flex items-center justify-center active:scale-95 transition-all cursor-pointer"
            aria-label="Backspace"
          >
            <Delete className="h-6 w-6" />
          </button>

          {/* Row 2 */}
          <button
            onClick={() => handleKeypadPress("4")}
            className="h-14 rounded-2xl bg-[#151515] hover:bg-[#202020] text-2xl font-mono font-medium text-[#F5F5F5] flex items-center justify-center active:scale-95 transition-all cursor-pointer"
          >
            4
          </button>
          <button
            onClick={() => handleKeypadPress("5")}
            className="h-14 rounded-2xl bg-[#151515] hover:bg-[#202020] text-2xl font-mono font-medium text-[#F5F5F5] flex items-center justify-center active:scale-95 transition-all cursor-pointer"
          >
            5
          </button>
          <button
            onClick={() => handleKeypadPress("6")}
            className="h-14 rounded-2xl bg-[#151515] hover:bg-[#202020] text-2xl font-mono font-medium text-[#F5F5F5] flex items-center justify-center active:scale-95 transition-all cursor-pointer"
          >
            6
          </button>
          <button
            onClick={() => handleKeypadPress(".")}
            className="h-14 rounded-2xl bg-[#151515] hover:bg-[#202020] text-2xl font-mono font-bold text-[#F5F5F5] flex items-center justify-center active:scale-95 transition-all cursor-pointer"
          >
            .
          </button>

          {/* Row 3 & 4 Grid: Digits on left 3 columns, Tall Blue Add button on right */}
          <div className="col-span-3 grid grid-cols-3 gap-2.5">
            <button
              onClick={() => handleKeypadPress("7")}
              className="h-14 rounded-2xl bg-[#151515] hover:bg-[#202020] text-2xl font-mono font-medium text-[#F5F5F5] flex items-center justify-center active:scale-95 transition-all cursor-pointer"
            >
              7
            </button>
            <button
              onClick={() => handleKeypadPress("8")}
              className="h-14 rounded-2xl bg-[#151515] hover:bg-[#202020] text-2xl font-mono font-medium text-[#F5F5F5] flex items-center justify-center active:scale-95 transition-all cursor-pointer"
            >
              8
            </button>
            <button
              onClick={() => handleKeypadPress("9")}
              className="h-14 rounded-2xl bg-[#151515] hover:bg-[#202020] text-2xl font-mono font-medium text-[#F5F5F5] flex items-center justify-center active:scale-95 transition-all cursor-pointer"
            >
              9
            </button>

            <button
              onClick={() => handleKeypadPress("00")}
              className="h-14 rounded-2xl bg-[#151515] hover:bg-[#202020] text-xl font-mono font-medium text-[#99999F] flex items-center justify-center active:scale-95 transition-all cursor-pointer"
            >
              00
            </button>
            <button
              onClick={() => handleKeypadPress("0")}
              className="h-14 rounded-2xl bg-[#151515] hover:bg-[#202020] text-2xl font-mono font-medium text-[#F5F5F5] flex items-center justify-center active:scale-95 transition-all cursor-pointer"
            >
              0
            </button>
            <button
              onClick={() => {
                // Clear
                setAmountStr("0");
              }}
              className="h-14 rounded-2xl bg-[#151515] hover:bg-[#202020] text-xs font-mono font-semibold text-[#99999F] flex items-center justify-center active:scale-95 transition-all cursor-pointer uppercase"
            >
              C
            </button>
          </div>

          {/* Large Prominent Blue Add Button (Reference 3 & 10) */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="h-[120px] rounded-2xl bg-[#A8C7FA] hover:bg-[#A8C7FA]/90 text-[#050505] flex flex-col items-center justify-center gap-1 font-bold shadow-lg shadow-[#A8C7FA]/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="h-6 w-6 animate-spin text-[#050505]" />
            ) : (
              <>
                <Check className="h-6 w-6 stroke-[3]" />
                <span className="text-xs uppercase tracking-wider font-mono">Add</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

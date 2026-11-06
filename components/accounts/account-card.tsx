"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Landmark,
  Wallet,
  CreditCard,
  Building,
  PiggyBank,
  TrendingUp,
  MoreVertical,
  Pencil,
  ArrowLeftRight,
  Archive,
  RotateCcw,
  Trash2,
  Scale,
  Receipt,
  CreditCard as CardIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Tables } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoneyDisplay } from "@/components/financial/money-display";
import {
  archiveAccountAction,
  deleteAccountAction,
} from "@/app/(dashboard)/accounts/actions";
import { ReconcileAccountDialog } from "@/components/accounts/reconcile-account-dialog";

interface AccountCardProps {
  account: Tables<"accounts">;
  allAccounts: Tables<"accounts">[];
  onEdit: (account: Tables<"accounts">) => void;
  onTransfer: (account: Tables<"accounts">) => void;
  onViewHistory?: (account: Tables<"accounts">) => void;
}

export function AccountCard({
  account,
  allAccounts,
  onEdit,
  onTransfer,
  onViewHistory,
}: AccountCardProps) {
  const router = useRouter();
  const [isReconcileOpen, setIsReconcileOpen] = React.useState(false);

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case "credit_card":
        return <CreditCard className="h-4 w-4" />;
      case "cash":
      case "upi_wallet":
        return <Wallet className="h-4 w-4" />;
      case "fixed_deposit":
      case "recurring_deposit":
        return <PiggyBank className="h-4 w-4" />;
      case "investment_demat":
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Landmark className="h-4 w-4" />;
    }
  };

  const handleToggleArchive = async () => {
    const res = await archiveAccountAction(account.id, !account.is_archived);
    if (res.success) {
      toast.success(res.message);
    } else {
      toast.error(res.error || "Failed to update archive status");
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${account.name}"? This cannot be undone.`)) {
      return;
    }
    const res = await deleteAccountAction(account.id);
    if (res.success) {
      toast.success(res.message || "Account deleted");
    } else {
      toast.error(res.error || "Failed to delete account");
    }
  };

  const formatAccountType = (type: string) => {
    return type
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  const isDebt = account.account_type === "credit_card" || account.account_type === "loan_account";

  return (
    <Card
      className={`relative overflow-hidden transition-all duration-200 hover:shadow-xs border border-border/80 bg-surface rounded-2xl ${
        account.is_archived ? "opacity-60 bg-surface-secondary/40" : ""
      }`}
    >
      {/* Top Accent Strip */}
      <div
        className="h-1 w-full"
        style={{ backgroundColor: account.color || "var(--primary)" }}
      />

      <CardContent className="p-4 pt-3.5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center space-x-3 min-w-0">
            {/* Account Icon */}
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border border-border/60"
              style={{
                backgroundColor: account.color ? `${account.color}15` : "var(--primary-soft)",
                color: account.color || "var(--primary)",
              }}
            >
              {getAccountTypeIcon(account.account_type)}
            </div>

            <div className="min-w-0">
              <h3 className="font-semibold text-sm sm:text-base leading-tight text-text-primary truncate">
                {account.name}
              </h3>
              <p className="text-xs text-text-secondary mt-0.5 truncate">
                {account.institution_name}
                {account.account_number_masked && (
                  <span className="ml-1.5 font-mono opacity-80">
                    {account.account_number_masked}
                  </span>
                )}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-text-secondary hover:text-text-primary shrink-0"
                aria-label="Account options"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 bg-surface text-text-primary border-border">
              {!account.is_archived && (
                <>
                  <DropdownMenuItem onClick={() => onTransfer(account)}>
                    <ArrowLeftRight className="mr-2 h-4 w-4" />
                    <span>Transfer Funds</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsReconcileOpen(true)}>
                    <Scale className="mr-2 h-4 w-4" />
                    <span>Reconcile Balance</span>
                  </DropdownMenuItem>
                </>
              )}
              {onViewHistory && (
                <DropdownMenuItem onClick={() => onViewHistory(account)}>
                  <Receipt className="mr-2 h-4 w-4 text-primary" />
                  <span className="font-medium text-primary">Running Ledger History</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => router.push(`/transactions?accountId=${account.id}`)}>
                <Receipt className="mr-2 h-4 w-4" />
                <span>View Transactions</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(account)}>
                <Pencil className="mr-2 h-4 w-4" />
                <span>Edit Account</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggleArchive}>
                {account.is_archived ? (
                  <>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    <span>Restore Account</span>
                  </>
                ) : (
                  <>
                    <Archive className="mr-2 h-4 w-4" />
                    <span>Archive Account</span>
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-danger focus:text-danger"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete Account</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Balance Section */}
        <div className="pt-2.5 border-t border-border/60 flex items-baseline justify-between gap-2">
          <div className="flex flex-col gap-1">
            <Badge
              variant="outline"
              className="text-[11px] font-medium bg-surface-secondary text-text-secondary border-border/80 px-2 py-0.5 rounded-lg w-fit"
            >
              {formatAccountType(account.account_type)}
            </Badge>
            {account.updated_at && (
              <span className="text-[10px] text-text-secondary font-mono">
                Updated {format(new Date(account.updated_at), "dd MMM yyyy")}
              </span>
            )}
          </div>

          <div className="text-right">
            <span className="text-[11px] text-text-secondary block font-medium">
              {account.account_type === "credit_card"
                ? "Outstanding Balance"
                : account.account_type === "loan_account"
                ? "Remaining Debt"
                : "Available Balance"}
            </span>
            <span
              className={`text-lg font-bold tabular-nums tracking-tight font-mono ${
                isDebt ? "text-negative" : "text-text-primary"
              }`}
            >
              ₹{parseFloat(account.current_balance as any).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>

        {/* Mobile Quick Action Strip (Transfer & History) */}
        <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
          {onViewHistory && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewHistory(account)}
              className="h-7 text-[11px] font-mono text-terminalAccent hover:text-terminalAccent/80 p-0 flex items-center gap-1 cursor-pointer"
            >
              <Receipt className="h-3.5 w-3.5" />
              <span>History</span>
            </Button>
          )}

          {!account.is_archived && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsReconcileOpen(true)}
                className="h-7 text-[11px] font-mono text-text-secondary hover:text-text-primary px-2 cursor-pointer"
              >
                Reconcile
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onTransfer(account)}
                className="h-7 text-[11px] font-mono border-border px-2 cursor-pointer"
              >
                Transfer
              </Button>
            </div>
          )}
        </div>
      </CardContent>

      {/* Account Balance Reconciliation Dialog */}
      <ReconcileAccountDialog
        account={account}
        open={isReconcileOpen}
        onOpenChange={setIsReconcileOpen}
      />
    </Card>
  );
}

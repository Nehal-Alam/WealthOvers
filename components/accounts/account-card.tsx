"use client";

import * as React from "react";
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

interface AccountCardProps {
  account: Tables<"accounts">;
  allAccounts: Tables<"accounts">[];
  onEdit: (account: Tables<"accounts">) => void;
  onTransfer: (account: Tables<"accounts">) => void;
}

export function AccountCard({
  account,
  allAccounts,
  onEdit,
  onTransfer,
}: AccountCardProps) {
  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case "credit_card":
        return <CreditCard className="h-5 w-5" />;
      case "cash":
      case "upi_wallet":
        return <Wallet className="h-5 w-5" />;
      case "fixed_deposit":
      case "recurring_deposit":
        return <PiggyBank className="h-5 w-5" />;
      case "investment_demat":
        return <TrendingUp className="h-5 w-5" />;
      default:
        return <Landmark className="h-5 w-5" />;
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

  return (
    <Card
      className={`relative overflow-hidden transition-all hover:shadow-md border ${
        account.is_archived ? "opacity-60 bg-muted/40" : ""
      }`}
    >
      {/* Top Accent Strip */}
      <div
        className="h-1.5 w-full"
        style={{ backgroundColor: account.color || "#3B82F6" }}
      />

      <CardContent className="p-4 pt-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
              style={{
                backgroundColor: `${account.color || "#3B82F6"}20`,
                color: account.color || "#3B82F6",
              }}
            >
              {getAccountTypeIcon(account.account_type)}
            </div>

            <div>
              <h3 className="font-semibold text-base leading-tight">
                {account.name}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {account.institution_name}
                {account.account_number_masked && (
                  <span className="ml-1.5 font-mono">
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
                className="h-8 w-8 text-muted-foreground"
                aria-label="Account options"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {!account.is_archived && (
                <DropdownMenuItem onClick={() => onTransfer(account)}>
                  <ArrowLeftRight className="mr-2 h-4 w-4" />
                  <span>Transfer From</span>
                </DropdownMenuItem>
              )}
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
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete Account</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Balance Section */}
        <div className="mt-4 pt-3 border-t flex items-baseline justify-between">
          <Badge variant="outline" className="text-xs font-normal capitalize">
            {formatAccountType(account.account_type)}
          </Badge>

          <div className="text-right">
            <span className="text-xs text-muted-foreground block">
              {account.account_type === "credit_card"
                ? "Outstanding Balance"
                : "Current Balance"}
            </span>
            <MoneyDisplay
              amount={account.current_balance}
              currency={account.currency}
              className="text-lg font-bold"
              colored={account.account_type === "credit_card"}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

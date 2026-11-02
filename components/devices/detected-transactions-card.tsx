"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Edit2,
  X,
  Check,
  Smartphone,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldAlert,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Tables } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoneyDisplay } from "@/components/financial/money-display";
import {
  approveDetectedTransactionAction,
  dismissDetectedTransactionAction,
  editDetectedTransactionAction,
} from "@/app/(dashboard)/devices/actions";

interface DetectedTransactionItem extends Tables<"transactions"> {
  accountName?: string;
}

interface DetectedTransactionsCardProps {
  transactions: Tables<"transactions">[];
  accounts: Tables<"accounts">[];
  categories: Tables<"categories">[];
}

export function DetectedTransactionsCard({
  transactions,
  accounts,
  categories,
}: DetectedTransactionsCardProps) {
  const [editingTx, setEditingTx] = React.useState<Tables<"transactions"> | null>(null);
  const [editAmount, setEditAmount] = React.useState("");
  const [editDescription, setEditDescription] = React.useState("");
  const [editAccountId, setEditAccountId] = React.useState("");
  const [editCategoryId, setEditCategoryId] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Filter for unreviewed or android_sms_sync / notification_sync detected suggestions
  const detectedSuggestions = React.useMemo(() => {
    return transactions.filter(
      (t) => !t.is_reviewed || t.source === "android_sms_sync" || t.source === "notification_sync"
    );
  }, [transactions]);

  const unreviewedCount = React.useMemo(() => {
    return detectedSuggestions.filter((t) => !t.is_reviewed).length;
  }, [detectedSuggestions]);

  const handleApprove = async (txId: string) => {
    try {
      const res = await approveDetectedTransactionAction(txId);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.error || "Failed to approve transaction");
      }
    } catch {
      toast.error("Failed to approve transaction");
    }
  };

  const handleDismiss = async (txId: string) => {
    try {
      const res = await dismissDetectedTransactionAction(txId);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.error || "Failed to dismiss suggestion");
      }
    } catch {
      toast.error("Failed to dismiss suggestion");
    }
  };

  const openEditModal = (tx: Tables<"transactions">) => {
    setEditingTx(tx);
    setEditAmount(String(tx.amount));
    setEditDescription(tx.description);
    setEditAccountId(tx.account_id);
    setEditCategoryId(tx.category_id || null);
  };

  const handleSaveEdit = async () => {
    if (!editingTx) return;
    const num = parseFloat(editAmount);
    if (isNaN(num) || num <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!editDescription.trim()) {
      toast.error("Please enter a description or merchant name");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await editDetectedTransactionAction({
        id: editingTx.id,
        amount: num,
        description: editDescription.trim(),
        accountId: editAccountId || editingTx.account_id,
        categoryId: editCategoryId,
      });

      if (res.success) {
        toast.success(res.message);
        setEditingTx(null);
      } else {
        toast.error(res.error || "Failed to save edited transaction");
      }
    } catch {
      toast.error("Failed to save edited transaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSourceAppDisplay = (tx: Tables<"transactions">) => {
    const text = `${tx.description} ${tx.notes || ""} ${tx.reference_number || ""}`.toLowerCase();
    if (text.includes("phonepe") || text.includes("ybl")) return "PhonePe";
    if (text.includes("gpay") || text.includes("google pay") || text.includes("okhdfcbank") || text.includes("okicici")) return "Google Pay";
    if (text.includes("paytm")) return "Paytm";
    if (text.includes("cred")) return "CRED";
    if (text.includes("hdfc")) return "HDFC Bank Alert";
    if (text.includes("icici")) return "ICICI Bank Alert";
    if (text.includes("sbi")) return "SBI Alert";
    if (text.includes("axis")) return "Axis Bank";
    return "Android Companion Sync";
  };

  const getConfidenceBadge = (confidence: number | null) => {
    const confVal = confidence !== null ? Math.round(confidence * 100) : 95;
    if (confVal >= 90) {
      return (
        <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/30 font-medium">
          {confVal}% High Confidence
        </Badge>
      );
    }
    if (confVal >= 70) {
      return (
        <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/30 font-medium">
          {confVal}% Probable
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[10px] bg-danger/10 text-danger border-danger/30 font-medium">
        {confVal}% Review Needed
      </Badge>
    );
  };

  return (
    <Card className="border border-border/80 bg-card rounded-2xl shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <CardTitle className="text-base font-bold text-foreground">
                Detected Transaction Suggestions
              </CardTitle>
              {unreviewedCount > 0 ? (
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-xs font-semibold">
                  {unreviewedCount} Awaiting Review
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs font-medium">
                  All Reviewed
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs mt-0.5">
              Financial notifications parsed on-device. Review and approve before confirming into your balance sheet.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {detectedSuggestions.length === 0 ? (
          <div className="text-center py-8 rounded-xl border border-dashed border-border/80 bg-surface-secondary/20 p-6 space-y-2">
            <CheckCircle2 className="mx-auto h-8 w-8 text-success/80" />
            <h4 className="text-sm font-bold text-foreground">No Pending Transaction Suggestions</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Transactions captured by your Android phone will appear here for 1-tap approval. Non-financial messages are never imported.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {detectedSuggestions.map((tx) => {
              const account = accounts.find((a) => a.id === tx.account_id);
              const category = categories.find((c) => c.id === tx.category_id);
              const sourceApp = getSourceAppDisplay(tx);
              const isExpense = tx.transaction_type === "expense";

              return (
                <div
                  key={tx.id}
                  className={`p-3.5 sm:p-4 rounded-xl border transition-colors ${
                    !tx.is_reviewed
                      ? "border-primary/40 bg-primary-soft/15 dark:bg-primary-soft/5 shadow-xs"
                      : "border-border/60 bg-surface-secondary/30"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Merchant & Source Info */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-[10px] py-0 px-2 h-4.5 bg-surface-secondary text-text-secondary border border-border/60 gap-1 font-medium">
                          <Smartphone className="h-2.5 w-2.5 text-primary" />
                          {sourceApp}
                        </Badge>
                        {getConfidenceBadge(tx.parser_confidence)}
                        {!tx.is_reviewed && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4.5 text-primary border-primary/30 font-semibold">
                            Suggestion
                          </Badge>
                        )}
                      </div>

                      <div className="font-bold text-sm text-foreground flex items-center gap-1.5 pt-0.5">
                        <span>{tx.description}</span>
                        {category && (
                          <span className="text-[11px] font-normal text-muted-foreground">
                            • {category.name}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>{format(new Date(tx.transaction_date), "dd MMM yyyy, h:mm a")}</span>
                        <span>•</span>
                        <span>Account: <strong className="text-foreground">{account?.name || "Primary Bank"}</strong></span>
                        {tx.reference_number && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-[11px]">Ref: {tx.reference_number}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Right: Amount & Direct Action Buttons */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
                      <div
                        className={`font-mono text-base font-bold flex items-center gap-1 ${
                          isExpense ? "text-danger" : "text-success"
                        }`}
                      >
                        {isExpense ? (
                          <ArrowDownLeft className="h-4 w-4" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4" />
                        )}
                        <span>{isExpense ? "-" : "+"}₹{parseFloat(String(tx.amount)).toLocaleString("en-IN")}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {!tx.is_reviewed && (
                          <Button
                            size="sm"
                            className="h-7 px-2.5 text-xs bg-primary hover:bg-primary-hover text-primary-foreground gap-1 font-medium"
                            onClick={() => handleApprove(tx.id)}
                            title="Approve and save to ledger"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Approve</span>
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs border-border/80 text-muted-foreground hover:text-foreground gap-1"
                          onClick={() => openEditModal(tx)}
                          title="Edit before saving"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span className="hidden sm:inline">Edit</span>
                        </Button>

                        {!tx.is_reviewed && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-danger hover:bg-danger/10"
                            onClick={() => handleDismiss(tx.id)}
                            title="Dismiss suggestion"
                          >
                            <X className="h-3.5 w-3.5" />
                            <span className="sr-only">Dismiss</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Edit Suggestion Modal */}
      {editingTx && (
        <Dialog open={!!editingTx} onOpenChange={(open) => !open && setEditingTx(null)}>
          <DialogContent className="sm:max-w-md bg-card border-border/80">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground">Edit Detected Transaction</DialogTitle>
              <DialogDescription className="text-xs">
                Refine the merchant description, amount, category, or destination account before confirming.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="tx-desc" className="text-xs font-semibold">Merchant / Description</Label>
                <Input
                  id="tx-desc"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="e.g. Swiggy, Uber, DMart"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tx-amount" className="text-xs font-semibold">Amount (₹)</Label>
                <Input
                  id="tx-amount"
                  type="number"
                  step="any"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  placeholder="0.00"
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tx-account" className="text-xs font-semibold">Account</Label>
                <Select value={editAccountId} onValueChange={setEditAccountId}>
                  <SelectTrigger id="tx-account" className="h-9 text-xs">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id} className="text-xs">
                        {acc.name} (₹{parseFloat(String(acc.current_balance)).toLocaleString("en-IN")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {categories.length > 0 && (
                <div className="space-y-1.5">
                  <Label htmlFor="tx-category" className="text-xs font-semibold">Category (Optional)</Label>
                  <Select
                    value={editCategoryId || "none"}
                    onValueChange={(val) => setEditCategoryId(val === "none" ? null : val)}
                  >
                    <SelectTrigger id="tx-category" className="h-9 text-xs">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">Uncategorized</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id} className="text-xs">
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-border/80"
                onClick={() => setEditingTx(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs bg-primary hover:bg-primary-hover text-primary-foreground font-medium"
                disabled={isSubmitting}
                onClick={handleSaveEdit}
              >
                {isSubmitting ? "Saving..." : "Save & Confirm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

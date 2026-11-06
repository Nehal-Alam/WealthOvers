"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Calendar,
  CreditCard,
  Building,
  Tag,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Pencil,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Scale,
  TrendingUp,
  TrendingDown,
  Layers,
  FileText,
  User,
  Hash,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoneyDisplay } from "@/components/financial/money-display";
import { reverseTransactionAction, getLedgerEntriesAction } from "@/app/(dashboard)/transactions/actions";
import { getTransactionDisplayInfo } from "@/lib/calculations/financial";
import { Tables } from "@/types/database";

interface TransactionDetailModalProps {
  transaction: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (txn: any) => void;
  onSelectRelatedTransaction?: (txnId: string) => void;
}

export function TransactionDetailModal({
  transaction,
  open,
  onOpenChange,
  onEdit,
  onSelectRelatedTransaction,
}: TransactionDetailModalProps) {
  const [isReversing, setIsReversing] = React.useState(false);
  const [reversalReason, setReversalReason] = React.useState("");
  const [showReversalPrompt, setShowReversalPrompt] = React.useState(false);
  const [fetchedLedgerEntries, setFetchedLedgerEntries] = React.useState<Tables<"ledger_entries">[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = React.useState(false);

  React.useEffect(() => {
    if (open && transaction?.id && (!transaction.ledger_entries || transaction.ledger_entries.length === 0)) {
      setIsLoadingEntries(true);
      getLedgerEntriesAction(transaction.id)
        .then((res) => {
          if (res.success && res.data) {
            setFetchedLedgerEntries(res.data);
          }
        })
        .finally(() => setIsLoadingEntries(false));
    } else {
      setFetchedLedgerEntries([]);
    }
  }, [open, transaction?.id, transaction?.ledger_entries]);

  if (!transaction) return null;

  const displayInfo = getTransactionDisplayInfo(transaction);
  const ledgerEntries = (transaction.ledger_entries && transaction.ledger_entries.length > 0)
    ? transaction.ledger_entries
    : fetchedLedgerEntries;

  // Check double-entry balance:
  let totalDebits = 0;
  let totalCredits = 0;
  for (const entry of ledgerEntries) {
    if (entry.entry_type === "debit") {
      totalDebits += parseFloat(String(entry.amount || 0));
    } else if (entry.entry_type === "credit") {
      totalCredits += parseFloat(String(entry.amount || 0));
    }
  }
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.001;

  const handleReverse = async () => {
    if (!reversalReason.trim()) {
      toast.error("Please provide a reason for the reversal");
      return;
    }

    setIsReversing(true);
    try {
      const res = await reverseTransactionAction({
        transaction_id: transaction.id,
        reason: reversalReason.trim(),
      });

      if (res.success) {
        toast.success(res.message || "Transaction reversed with immutable ledger audit trail");
        setShowReversalPrompt(false);
        setReversalReason("");
        onOpenChange(false);
      } else {
        toast.error(res.error || "Failed to reverse transaction");
      }
    } catch {
      toast.error("An unexpected error occurred while reversing transaction");
    } finally {
      setIsReversing(false);
    }
  };

  const formattedDate = transaction.transaction_date && !isNaN(new Date(transaction.transaction_date).getTime())
    ? format(new Date(transaction.transaction_date), "EEEE, dd MMMM yyyy")
    : "N/A";

  const getStatusBadge = (status: string) => {
    if (status === "reversed") {
      return (
        <Badge variant="outline" className="border-danger/60 text-danger bg-danger/10 gap-1 text-[11px]">
          <RotateCcw className="h-3 w-3" />
          <span>Reversed</span>
        </Badge>
      );
    }
    if (status === "pending") {
      return (
        <Badge variant="outline" className="border-warning/60 text-warning bg-warning/10 gap-1 text-[11px]">
          <AlertCircle className="h-3 w-3" />
          <span>Pending</span>
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-success/60 text-success bg-success/10 gap-1 text-[11px]">
        <CheckCircle2 className="h-3 w-3" />
        <span>Completed</span>
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[92vh] overflow-y-auto p-6">
        <DialogHeader className="pb-3 border-b border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-[11px] bg-surface-secondary/50 border-border/80">
                  {transaction.transaction_number || `TXN-${transaction.id.slice(0, 8)}`}
                </Badge>
                {getStatusBadge(transaction.status || "completed")}
                <Badge variant="outline" className="text-[11px] capitalize border-border/80">
                  {(transaction.transaction_type || "").replace(/_/g, " ")}
                </Badge>
              </div>
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground mt-2">
                {transaction.description || "Financial Transaction"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {formattedDate}
              </DialogDescription>
            </div>

            {/* Prominent Amount Display */}
            <div className="text-left sm:text-right mt-1 sm:mt-0">
              <span className="text-[11px] font-semibold text-muted-foreground block">
                {displayInfo.isDebit ? "Cash Outflow" : displayInfo.isCredit ? "Cash Inflow" : "Transfer / Neutral"}
              </span>
              <div className={`text-2xl font-mono font-bold tracking-tight ${displayInfo.textColorClass}`}>
                {displayInfo.displaySign}
                <MoneyDisplay amount={transaction.amount} currency={transaction.currency || "INR"} />
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-3">
          {/* Reversal Alert if already reversed */}
          {transaction.status === "reversed" && (
            <div className="p-3.5 rounded-xl border border-danger/40 bg-danger/5 flex items-start gap-2.5 text-xs text-danger">
              <RotateCcw className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold block">This transaction has been reversed.</span>
                <span className="text-[11px] text-muted-foreground block mt-0.5">
                  An immutable contra-entry was posted to the ledger, and the account balance was restored.
                </span>
              </div>
            </div>
          )}

          {/* Key Attributes Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl border border-border/70 bg-surface-secondary/30 text-xs">
            <div>
              <span className="text-[11px] text-muted-foreground block">Funding Account</span>
              <span className="font-medium text-foreground flex items-center gap-1.5 mt-0.5">
                <Building className="h-3.5 w-3.5 text-primary" />
                <span>{transaction.account?.name || "Unspecified"}</span>
              </span>
            </div>

            {transaction.destination_account && (
              <div>
                <span className="text-[11px] text-muted-foreground block">Destination Account</span>
                <span className="font-medium text-foreground flex items-center gap-1.5 mt-0.5">
                  <ArrowLeftRight className="h-3.5 w-3.5 text-success" />
                  <span>{transaction.destination_account.name}</span>
                </span>
              </div>
            )}

            <div>
              <span className="text-[11px] text-muted-foreground block">Category</span>
              <span className="font-medium text-foreground flex items-center gap-1.5 mt-0.5">
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{transaction.category?.name || "General"}</span>
              </span>
            </div>

            {transaction.merchant_or_person && (
              <div>
                <span className="text-[11px] text-muted-foreground block">Merchant / Person</span>
                <span className="font-medium text-foreground flex items-center gap-1.5 mt-0.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{transaction.merchant_or_person}</span>
                </span>
              </div>
            )}

            {transaction.payment_method && (
              <div>
                <span className="text-[11px] text-muted-foreground block">Payment Method</span>
                <span className="font-medium text-foreground uppercase tracking-wider text-[11px] mt-0.5">
                  {transaction.payment_method}
                </span>
              </div>
            )}

            {transaction.reference_number && (
              <div>
                <span className="text-[11px] text-muted-foreground block">Reference #</span>
                <span className="font-mono text-muted-foreground text-[11px] mt-0.5">
                  {transaction.reference_number}
                </span>
              </div>
            )}

            <div>
              <span className="text-[11px] text-muted-foreground block">Source Module</span>
              <span className="font-mono text-muted-foreground capitalize text-[11px] mt-0.5">
                {transaction.source_module || "transactions"}
              </span>
            </div>
          </div>

          {/* Notes */}
          {transaction.notes && (
            <div className="p-3 rounded-lg border border-border/60 bg-card text-xs space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground block">Notes & Annotations</span>
              <p className="text-foreground leading-relaxed whitespace-pre-wrap">{transaction.notes}</p>
            </div>
          )}

          {/* Double-Entry Accounting Ledger Breakdown */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Scale className="h-3.5 w-3.5 text-primary" />
                <span>Double-Entry Ledger Postings</span>
              </span>
              {isBalanced ? (
                <Badge variant="outline" className="border-success/50 text-success bg-success/5 text-[10px] gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  <span>Balanced (₹{totalDebits.toFixed(2)} Debits = Credits)</span>
                </Badge>
              ) : (
                <Badge variant="outline" className="border-danger/50 text-danger bg-danger/5 text-[10px] gap-1">
                  <AlertCircle className="h-3 w-3" />
                  <span>Imbalanced</span>
                </Badge>
              )}
            </div>

            {ledgerEntries.length > 0 ? (
              <div className="border border-border/70 rounded-xl overflow-hidden bg-card text-xs">
                <div className="grid grid-cols-12 py-2 px-3 bg-surface-secondary/60 text-[11px] font-bold text-muted-foreground border-b border-border/60">
                  <span className="col-span-4">Entity / Account</span>
                  <span className="col-span-3">Entity Type</span>
                  <span className="col-span-2 text-center">Entry</span>
                  <span className="col-span-3 text-right">Amount</span>
                </div>
                <div className="divide-y divide-border/50">
                  {ledgerEntries.map((entry: any) => {
                    const isDebit = entry.entry_type === "debit";
                    return (
                      <div key={entry.id} className="grid grid-cols-12 py-2 px-3 items-center">
                        <span className="col-span-4 font-medium text-foreground truncate">
                          {entry.account_id ? transaction.account?.name || "Bank Account" : entry.description || "General Entity"}
                        </span>
                        <span className="col-span-3 font-mono text-[11px] text-muted-foreground capitalize">
                          {entry.entity_type.replace(/_/g, " ")}
                        </span>
                        <span className="col-span-2 text-center">
                          <Badge
                            variant="outline"
                            className={`text-[10px] uppercase font-mono ${
                              isDebit ? "text-primary border-primary/40 bg-primary/5" : "text-muted-foreground border-border"
                            }`}
                          >
                            {entry.entry_type}
                          </Badge>
                        </span>
                        <span className="col-span-3 text-right font-mono font-semibold text-foreground">
                          ₹{parseFloat(String(entry.amount || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg border border-dashed border-border text-center text-xs text-muted-foreground">
                No ledger entries registered for this historical transaction.
              </div>
            )}
          </div>

          {/* Linked Transaction History & Entity Relationships */}
          {(transaction.loan_id || transaction.credit_card_id || transaction.investment_id || transaction.related_transaction_id) && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" />
                <span>Linked Financial Entity</span>
              </span>

              <div className="p-3 rounded-xl border border-border/70 bg-surface-secondary/20 text-xs space-y-2">
                {transaction.loan_id && (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-muted-foreground block">Linked Loan Account</span>
                      <span className="font-semibold text-foreground">
                        {transaction.loan?.lender_or_borrower_name || "Loan Account"}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {transaction.loan?.loan_type?.replace(/_/g, " ") || "Debt"}
                    </Badge>
                  </div>
                )}

                {transaction.investment_id && (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-muted-foreground block">Linked Investment Holding</span>
                      <span className="font-semibold text-foreground">
                        {transaction.investment?.name || "Investment"}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {transaction.investment?.asset_type?.replace(/_/g, " ") || "Asset"}
                    </Badge>
                  </div>
                )}

                {transaction.credit_card_id && (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-muted-foreground block">Linked Credit Card</span>
                      <span className="font-semibold text-foreground">
                        {transaction.credit_card?.card_name || "Credit Card"}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      •••• {transaction.credit_card?.last_four_digits || "Card"}
                    </span>
                  </div>
                )}

                {transaction.related_transaction && (
                  <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-muted-foreground block">Related Parent Transaction</span>
                      <span className="font-mono text-xs font-semibold text-primary">
                        {transaction.related_transaction.transaction_number || transaction.related_transaction.id}
                      </span>
                      <span className="text-[11px] text-muted-foreground block">
                        {transaction.related_transaction.description}
                      </span>
                    </div>
                    {onSelectRelatedTransaction && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1 text-primary hover:text-primary-hover"
                        onClick={() => onSelectRelatedTransaction(transaction.related_transaction.id)}
                      >
                        <span>View</span>
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reversal Confirmation Form */}
          {showReversalPrompt && transaction.status !== "reversed" && (
            <div className="p-4 rounded-xl border border-danger/40 bg-danger/5 space-y-3">
              <div className="flex items-start gap-2 text-danger">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold block">Confirm Transaction Reversal</span>
                  <span className="text-[11px] text-muted-foreground block mt-0.5">
                    This will create an immutable contra-entry in the ledger, reverse the cash flow, and restore your account balance without deleting financial history.
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-foreground block">Reason for Reversal *</label>
                <input
                  type="text"
                  placeholder="e.g. Incorrect charge, duplicate deduction, customer refund"
                  className="w-full h-8 px-2.5 rounded-lg border border-border bg-card text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setShowReversalPrompt(false)}
                  disabled={isReversing}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs bg-danger hover:bg-danger/90 text-white"
                  onClick={handleReverse}
                  disabled={isReversing}
                >
                  {isReversing ? "Reversing..." : "Confirm & Post Contra-Entry"}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-3 border-t border-border/60 flex items-center justify-between sm:justify-between w-full">
          <div>
            {transaction.status !== "reversed" && !showReversalPrompt && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-danger/40 text-danger hover:bg-danger/10 gap-1.5"
                onClick={() => setShowReversalPrompt(true)}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reverse Transaction</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onEdit && transaction.status !== "reversed" && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(transaction);
                }}
              >
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Edit Metadata</span>
              </Button>
            )}

            <Button
              variant="default"
              size="sm"
              className="h-8 text-xs bg-primary hover:bg-primary-hover text-primary-foreground"
              onClick={() => onOpenChange(false)}
            >
              Done
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


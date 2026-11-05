"use client";

import * as React from "react";
import { TransactionTimeline } from "@/components/transactions/transaction-timeline";

interface TransactionMobileFeedProps {
  transactions: any[];
  onEdit: (transaction: any) => void;
  onInspect?: (transaction: any) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  selectedAccountId?: string;
}

export const TransactionMobileFeed = React.memo(function TransactionMobileFeed({
  transactions,
  onEdit,
  onInspect,
  selectedIds,
  onToggleSelect,
  selectedAccountId,
}: TransactionMobileFeedProps) {
  return (
    <TransactionTimeline
      transactions={transactions}
      onEdit={onEdit}
      onInspect={onInspect}
      selectedIds={selectedIds}
      onToggleSelect={onToggleSelect}
      selectedAccountId={selectedAccountId}
    />
  );
});

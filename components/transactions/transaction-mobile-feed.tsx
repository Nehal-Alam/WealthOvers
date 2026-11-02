"use client";

import * as React from "react";
import { TransactionTimeline } from "@/components/transactions/transaction-timeline";

interface TransactionMobileFeedProps {
  transactions: any[];
  onEdit: (transaction: any) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

export const TransactionMobileFeed = React.memo(function TransactionMobileFeed({
  transactions,
  onEdit,
  selectedIds,
  onToggleSelect,
}: TransactionMobileFeedProps) {
  return (
    <TransactionTimeline
      transactions={transactions}
      onEdit={onEdit}
      selectedIds={selectedIds}
      onToggleSelect={onToggleSelect}
    />
  );
});

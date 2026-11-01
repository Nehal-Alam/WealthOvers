"use client";

import * as React from "react";
import { useUIStore } from "@/stores/ui-store";
import { CreateTransactionDialog } from "@/components/transactions/create-transaction-dialog";
import { Tables } from "@/types/database";

interface GlobalQuickTransactionProps {
  accounts: Tables<"accounts">[];
  categories: (Tables<"categories"> & { subcategories?: Tables<"subcategories">[] })[];
}

export function GlobalQuickTransaction({
  accounts,
  categories,
}: GlobalQuickTransactionProps) {
  const { isQuickTransactionOpen, quickTransactionType, closeQuickTransaction } =
    useUIStore();

  return (
    <CreateTransactionDialog
      accounts={accounts}
      categories={categories}
      defaultType={quickTransactionType}
      open={isQuickTransactionOpen}
      onOpenChange={(val) => {
        if (!val) {
          closeQuickTransaction();
        }
      }}
      trigger={null}
    />
  );
}

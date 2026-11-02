"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useUIStore } from "@/stores/ui-store";
import { Tables } from "@/types/database";

const CreateTransactionDialog = dynamic(
  () =>
    import("@/components/transactions/create-transaction-dialog").then(
      (mod) => mod.CreateTransactionDialog
    ),
  { ssr: false }
);

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

  if (!isQuickTransactionOpen) {
    return null;
  }

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

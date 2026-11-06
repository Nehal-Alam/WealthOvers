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

const MobileKeypadComposer = dynamic(
  () =>
    import("@/components/transactions/mobile-keypad-composer").then(
      (mod) => mod.MobileKeypadComposer
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
    <>
      {/* Mobile Experience: Dedicated Keypad-First Composer (References 3 & 10) */}
      <div className="block lg:hidden">
        <MobileKeypadComposer
          accounts={accounts}
          categories={categories}
          defaultType={quickTransactionType}
          open={isQuickTransactionOpen}
          onOpenChange={(val) => {
            if (!val) {
              closeQuickTransaction();
            }
          }}
        />
      </div>

      {/* Desktop Experience: Bloomberg Terminal Dialog */}
      <div className="hidden lg:block">
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
      </div>
    </>
  );
}

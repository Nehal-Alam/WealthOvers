"use client";

import * as React from "react";
import {
  Landmark,
  PlusCircle,
  ArrowLeftRight,
  Wallet,
  CreditCard,
  TrendingUp,
  Archive,
  Layers,
} from "lucide-react";

import { Tables } from "@/types/database";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";

const CreateAccountDialog = dynamic(
  () =>
    import("@/components/accounts/create-account-dialog").then(
      (m) => m.CreateAccountDialog
    ),
  { ssr: false }
);

const EditAccountDialog = dynamic(
  () =>
    import("@/components/accounts/edit-account-dialog").then(
      (m) => m.EditAccountDialog
    ),
  { ssr: false }
);

const TransferFundsDialog = dynamic(
  () =>
    import("@/components/accounts/transfer-funds-dialog").then(
      (m) => m.TransferFundsDialog
    ),
  { ssr: false }
);

import { AccountCard } from "@/components/accounts/account-card";
import { MetricCard } from "@/components/financial/metric-card";
import { toDecimal, subtractMoney, addMoney } from "@/lib/calculations/financial";

interface AccountGridProps {
  accounts: Tables<"accounts">[];
}

export function AccountGrid({ accounts }: AccountGridProps) {
  const [editingAccount, setEditingAccount] = React.useState<Tables<"accounts"> | null>(null);
  const [transferSourceAccount, setTransferSourceAccount] = React.useState<Tables<"accounts"> | null>(null);
  const [isTransferOpen, setIsTransferOpen] = React.useState(false);

  // Group accounts
  const activeAccounts = accounts.filter((a) => !a.is_archived);
  const archivedAccounts = accounts.filter((a) => a.is_archived);

  // Financial calculations
  const { totalLiquid, totalCredit, netPosition } = React.useMemo(() => {
    let liquid = "0.0000";
    let credit = "0.0000";

    for (const acc of activeAccounts) {
      if (acc.account_type === "credit_card" || acc.account_type === "loan_account") {
        credit = addMoney(credit, acc.current_balance);
      } else {
        liquid = addMoney(liquid, acc.current_balance);
      }
    }

    const net = subtractMoney(liquid, credit);
    return { totalLiquid: liquid, totalCredit: credit, netPosition: net };
  }, [activeAccounts]);

  // Group by category
  const bankAccounts = activeAccounts.filter((a) =>
    ["savings", "salary", "current"].includes(a.account_type)
  );
  const cashAndWallets = activeAccounts.filter((a) =>
    ["cash", "upi_wallet"].includes(a.account_type)
  );
  const creditCardsAndLoans = activeAccounts.filter((a) =>
    ["credit_card", "loan_account"].includes(a.account_type)
  );
  const investmentsAndDeposits = activeAccounts.filter((a) =>
    ["fixed_deposit", "recurring_deposit", "investment_demat", "other"].includes(
      a.account_type
    )
  );

  const handleOpenTransfer = (acc?: Tables<"accounts">) => {
    setTransferSourceAccount(acc || null);
    setIsTransferOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Accounts & Balances</h2>
          <p className="text-sm text-muted-foreground">
            Manage your bank accounts, wallets, credit cards, and transfer funds.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeAccounts.length >= 2 && (
            <Button
              variant="outline"
              onClick={() => handleOpenTransfer()}
              className="gap-1.5"
            >
              <ArrowLeftRight className="h-4 w-4" />
              <span>Transfer</span>
            </Button>
          )}
          <CreateAccountDialog />
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Total Liquid Balance"
          amount={totalLiquid}
          subtitle="Savings, current & cash reserves"
          icon={Landmark}
          iconColor="#3B82F6"
        />
        <MetricCard
          title="Credit & Liabilities"
          amount={totalCredit}
          subtitle="Credit cards & active loans"
          icon={CreditCard}
          iconColor="#EF4444"
          coloredAmount={false}
        />
        <MetricCard
          title="Net Available Capital"
          amount={netPosition}
          subtitle="Liquid assets minus credit obligations"
          icon={Wallet}
          iconColor="#10B981"
          coloredAmount
        />
      </div>

      {/* Empty State */}
      {accounts.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <Landmark className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-base font-semibold">No accounts found</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Add your bank accounts, credit cards, or cash wallets to start tracking your balances.
          </p>
          <CreateAccountDialog />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Bank Accounts */}
          {bankAccounts.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Landmark className="h-4 w-4" />
                Bank Accounts ({bankAccounts.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {bankAccounts.map((acc) => (
                  <AccountCard
                    key={acc.id}
                    account={acc}
                    allAccounts={accounts}
                    onEdit={setEditingAccount}
                    onTransfer={handleOpenTransfer}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Cash & Digital Wallets */}
          {cashAndWallets.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Cash & Wallets ({cashAndWallets.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {cashAndWallets.map((acc) => (
                  <AccountCard
                    key={acc.id}
                    account={acc}
                    allAccounts={accounts}
                    onEdit={setEditingAccount}
                    onTransfer={handleOpenTransfer}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Credit Cards & Loans */}
          {creditCardsAndLoans.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Credit Cards & Debt ({creditCardsAndLoans.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {creditCardsAndLoans.map((acc) => (
                  <AccountCard
                    key={acc.id}
                    account={acc}
                    allAccounts={accounts}
                    onEdit={setEditingAccount}
                    onTransfer={handleOpenTransfer}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Investments & Deposits */}
          {investmentsAndDeposits.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Deposits & Investments ({investmentsAndDeposits.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {investmentsAndDeposits.map((acc) => (
                  <AccountCard
                    key={acc.id}
                    account={acc}
                    allAccounts={accounts}
                    onEdit={setEditingAccount}
                    onTransfer={handleOpenTransfer}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Archived Accounts */}
          {archivedAccounts.length > 0 && (
            <div className="space-y-3 pt-4 border-t">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Archive className="h-4 w-4" />
                Archived Accounts ({archivedAccounts.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {archivedAccounts.map((acc) => (
                  <AccountCard
                    key={acc.id}
                    account={acc}
                    allAccounts={accounts}
                    onEdit={setEditingAccount}
                    onTransfer={handleOpenTransfer}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Account Modal */}
      <EditAccountDialog
        account={editingAccount}
        open={!!editingAccount}
        onOpenChange={(open) => !open && setEditingAccount(null)}
      />

      {/* Transfer Funds Modal */}
      {isTransferOpen && (
        <TransferFundsDialog
          accounts={accounts}
          defaultSourceId={transferSourceAccount?.id}
          trigger={<span className="hidden" />}
        />
      )}
    </div>
  );
}


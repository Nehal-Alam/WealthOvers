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
  ShieldCheck,
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
import { subtractMoney, addMoney } from "@/lib/calculations/financial";

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

  // Financial calculations using exact Decimal arithmetic
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
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">
            Accounts & Balances
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
            Total available liquid capital, credit card debt, and multi-account balances.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {activeAccounts.length >= 2 && (
            <Button
              variant="outline"
              onClick={() => handleOpenTransfer()}
              className="gap-1.5 h-9 rounded-xl border-border bg-surface text-text-secondary hover:text-text-primary"
            >
              <ArrowLeftRight className="h-4 w-4" />
              <span>Transfer Funds</span>
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
          iconColor="emerald"
        />
        <MetricCard
          title="Credit & Liabilities"
          amount={totalCredit}
          subtitle="Credit cards & active loan debt"
          icon={CreditCard}
          iconColor="coral"
          coloredAmount={false}
        />
        <MetricCard
          title="Net Available Capital"
          amount={netPosition}
          subtitle="Liquid assets minus credit obligations"
          icon={Wallet}
          iconColor="forest"
          coloredAmount
        />
      </div>

      {/* Empty State with Onboarding Guidance */}
      {accounts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center bg-surface">
          <Landmark className="mx-auto h-12 w-12 text-text-secondary/40 mb-3" />
          <h3 className="text-base font-semibold text-text-primary">
            Add your first account to see your total available balance
          </h3>
          <p className="text-xs sm:text-sm text-text-secondary mt-1 mb-4 max-w-md mx-auto">
            Connect your bank accounts, credit cards, or cash wallets to track balances and power your Safe-to-Spend calculations.
          </p>
          <CreateAccountDialog />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Bank Accounts */}
          {bankAccounts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-primary" />
                  <span>Bank Accounts ({bankAccounts.length})</span>
                </h3>
              </div>
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
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span>Cash & Wallets ({cashAndWallets.length})</span>
                </h3>
              </div>
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
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-danger" />
                  <span>Credit Cards & Debt ({creditCardsAndLoans.length})</span>
                </h3>
              </div>
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
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-success" />
                  <span>Deposits & Investments ({investmentsAndDeposits.length})</span>
                </h3>
              </div>
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
            <div className="space-y-3 pt-4 border-t border-border/60">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-2">
                  <Archive className="h-4 w-4" />
                  <span>Archived Accounts ({archivedAccounts.length})</span>
                </h3>
              </div>
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

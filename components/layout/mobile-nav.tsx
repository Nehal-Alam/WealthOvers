"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  Landmark,
  Coins,
  Plus,
  TrendingDown,
  TrendingUp,
  ArrowLeftRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function MobileNav() {
  const pathname = usePathname();
  const { openQuickTransaction } = useUIStore();
  const [actionDrawerOpen, setActionDrawerOpen] = React.useState(false);

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 h-16 border-t border-border/80 bg-card/95 backdrop-blur-lg flex items-center justify-around px-3 pb-safe transition-colors shadow-lg">
        {/* Slot 1: Overview / Dashboard */}
        <Link
          href="/dashboard"
          prefetch={true}
          className={cn(
            "flex flex-col items-center justify-center w-14 py-1 gap-1 text-[10px] font-medium transition-colors rounded-lg",
            pathname === "/dashboard"
              ? "text-primary font-semibold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <LayoutDashboard
            className={cn(
              "h-5 w-5 transition-transform",
              pathname === "/dashboard" && "scale-110 text-primary"
            )}
          />
          <span className="truncate">Overview</span>
        </Link>

        {/* Slot 2: Transactions Ledger */}
        <Link
          href="/transactions"
          prefetch={true}
          className={cn(
            "flex flex-col items-center justify-center w-14 py-1 gap-1 text-[10px] font-medium transition-colors rounded-lg",
            pathname.startsWith("/transactions")
              ? "text-primary font-semibold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Receipt
            className={cn(
              "h-5 w-5 transition-transform",
              pathname.startsWith("/transactions") && "scale-110 text-primary"
            )}
          />
          <span className="truncate">Ledger</span>
        </Link>

        {/* Center Slot: Elevated Floating Quick Action Button (FAB) */}
        <Sheet open={actionDrawerOpen} onOpenChange={setActionDrawerOpen}>
          <SheetTrigger asChild>
            <button
              className="relative -top-3 h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md shadow-primary/25 hover:bg-primary/95 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-label="Quick financial action"
            >
              <Plus className="h-6 w-6" />
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl p-4 bg-card border-t max-w-md mx-auto">
            <SheetHeader className="pb-3 text-left">
              <SheetTitle className="text-base font-bold text-foreground">
                Quick Financial Action
              </SheetTitle>
              <p className="text-xs text-muted-foreground">
                Log a transaction or transfer funds across accounts
              </p>
            </SheetHeader>

            <div className="grid grid-cols-1 gap-2.5 py-2">
              <button
                onClick={() => {
                  setActionDrawerOpen(false);
                  openQuickTransaction("expense");
                }}
                className="flex items-center gap-3 p-3 rounded-xl border border-border/80 bg-card hover:bg-muted/60 transition-colors text-left"
              >
                <div className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                  <TrendingDown className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">Add Expense</p>
                  <p className="text-xs text-muted-foreground">Log an outflow, purchase, or bill</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setActionDrawerOpen(false);
                  openQuickTransaction("income");
                }}
                className="flex items-center gap-3 p-3 rounded-xl border border-border/80 bg-card hover:bg-muted/60 transition-colors text-left"
              >
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">Add Income</p>
                  <p className="text-xs text-muted-foreground">Record salary, dividend, or deposit</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setActionDrawerOpen(false);
                  openQuickTransaction("transfer");
                }}
                className="flex items-center gap-3 p-3 rounded-xl border border-border/80 bg-card hover:bg-muted/60 transition-colors text-left"
              >
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <ArrowLeftRight className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">Transfer Funds</p>
                  <p className="text-xs text-muted-foreground">Move money between accounts</p>
                </div>
              </button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Slot 4: Accounts & Banking */}
        <Link
          href="/accounts"
          prefetch={true}
          className={cn(
            "flex flex-col items-center justify-center w-14 py-1 gap-1 text-[10px] font-medium transition-colors rounded-lg",
            pathname.startsWith("/accounts")
              ? "text-primary font-semibold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Landmark
            className={cn(
              "h-5 w-5 transition-transform",
              pathname.startsWith("/accounts") && "scale-110 text-primary"
            )}
          />
          <span className="truncate">Accounts</span>
        </Link>

        {/* Slot 5: Investments & Portfolio */}
        <Link
          href="/investments"
          prefetch={true}
          className={cn(
            "flex flex-col items-center justify-center w-14 py-1 gap-1 text-[10px] font-medium transition-colors rounded-lg",
            pathname.startsWith("/investments")
              ? "text-primary font-semibold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Coins
            className={cn(
              "h-5 w-5 transition-transform",
              pathname.startsWith("/investments") && "scale-110 text-primary"
            )}
          />
          <span className="truncate">Portfolio</span>
        </Link>
      </nav>
    </>
  );
}

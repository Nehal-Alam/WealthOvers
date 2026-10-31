"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Wallet, Plus } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { PrivacyMaskToggle } from "@/components/layout/privacy-mask-toggle";
import { UserNav } from "@/components/layout/user-nav";

interface AppHeaderProps {
  user: {
    email?: string | null;
    fullName?: string | null;
    avatarUrl?: string | null;
  };
}

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/net-worth": "Net Worth & Assets",
  "/transactions": "Transactions Ledger",
  "/accounts": "Accounts & Banking",
  "/categories": "Categories & Rules",
  "/budgets": "Budgets & Planning",
  "/recurring": "Recurring Payments",
  "/subscriptions": "Subscriptions",
  "/goals": "Financial Goals",
  "/investments": "Investments & Portfolio",
  "/credit-cards": "Credit Cards",
  "/loans": "Loans & Liabilities",
  "/reports": "Financial Reports",
  "/import": "Bank Statement Import",
  "/devices": "Android Companion Sync",
  "/settings": "Account Settings",
  "/profile": "User Profile",
  "/onboarding": "Welcome Onboarding",
};

export function AppHeader({ user }: AppHeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Compute title
  const currentTitle =
    pageTitles[pathname] ||
    pageTitles["/" + pathname.split("/")[1]] ||
    "Money Manager";

  return (
    <header className="h-16 border-b bg-card/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Mobile Drawer Trigger & Title */}
      <div className="flex items-center space-x-3">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-9 w-9 text-muted-foreground hover:text-foreground"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 flex flex-col">
            <SheetHeader className="p-4 border-b text-left flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
                <Wallet className="h-4 w-4" />
              </div>
              <SheetTitle className="text-base font-bold">
                WealthOvers
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase px-2">Navigation</p>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium hover:bg-muted"
                >
                  Dashboard
                </Link>
                <Link
                  href="/transactions"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium hover:bg-muted"
                >
                  Transactions
                </Link>
                <Link
                  href="/accounts"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium hover:bg-muted"
                >
                  Accounts
                </Link>
                <Link
                  href="/budgets"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium hover:bg-muted"
                >
                  Budgets
                </Link>
                <Link
                  href="/investments"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium hover:bg-muted"
                >
                  Investments
                </Link>
                <Link
                  href="/credit-cards"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium hover:bg-muted"
                >
                  Credit Cards
                </Link>
                <Link
                  href="/reports"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium hover:bg-muted"
                >
                  Reports
                </Link>
                <Link
                  href="/import"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium hover:bg-muted"
                >
                  Statement Import
                </Link>
                <Link
                  href="/devices"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium hover:bg-muted"
                >
                  Android Companion Sync
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium hover:bg-muted"
                >
                  Settings
                </Link>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <div>
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground truncate">
            {currentTitle}
          </h2>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-1.5 sm:space-x-3">
        <PrivacyMaskToggle />
        <ThemeToggle />
        <div className="h-4 w-px bg-border mx-1" />
        <UserNav user={user} />
      </div>
    </header>
  );
}


"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  Wallet,
  Plus,
  Search,
  Bell,
  ChevronRight,
  TrendingUp,
  Receipt,
  Landmark,
  FolderTree,
  PiggyBank,
  Calendar,
  Target,
  Coins,
  CreditCard,
  Scale,
  Home,
  BarChart3,
  FileSpreadsheet,
  Smartphone,
  Settings,
  CheckCircle2,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { PrivacyMaskToggle } from "@/components/layout/privacy-mask-toggle";
import { UserNav } from "@/components/layout/user-nav";
import { useUIStore } from "@/stores/ui-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppHeaderProps {
  user: {
    email?: string | null;
    fullName?: string | null;
    avatarUrl?: string | null;
  };
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: "OVERVIEW",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: Wallet },
      { title: "Net Worth", href: "/net-worth", icon: TrendingUp },
    ],
  },
  {
    title: "MONEY MANAGEMENT",
    items: [
      { title: "Transactions", href: "/transactions", icon: Receipt },
      { title: "Accounts", href: "/accounts", icon: Landmark },
      { title: "Categories & Rules", href: "/categories", icon: FolderTree },
    ],
  },
  {
    title: "PLANNING",
    items: [
      { title: "Budgets", href: "/budgets", icon: PiggyBank },
      { title: "Recurring Bills", href: "/recurring", icon: Calendar },
      { title: "Financial Goals", href: "/goals", icon: Target },
    ],
  },
  {
    title: "WEALTH & DEBT",
    items: [
      { title: "Investments", href: "/investments", icon: Coins },
      { title: "Credit Cards", href: "/credit-cards", icon: CreditCard },
      { title: "Loans & Debts", href: "/loans", icon: Scale },
      { title: "Assets & Liabilities", href: "/assets", icon: Home },
    ],
  },
  {
    title: "SYSTEM & AUTOMATION",
    items: [
      { title: "Reports & Analytics", href: "/reports", icon: BarChart3 },
      { title: "Statement Import", href: "/import", icon: FileSpreadsheet },
      { title: "Automation & Sync", href: "/devices", icon: Smartphone },
      { title: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

const routeBreadcrumbMap: Record<string, { section: string; title: string }> = {
  "/dashboard": { section: "Overview", title: "Dashboard" },
  "/net-worth": { section: "Overview", title: "Net Worth & Assets" },
  "/transactions": { section: "Money Management", title: "Transactions" },
  "/accounts": { section: "Money Management", title: "Accounts & Banking" },
  "/categories": { section: "Money Management", title: "Categories & Rules" },
  "/budgets": { section: "Planning", title: "Budgets & Limits" },
  "/recurring": { section: "Planning", title: "Recurring Bills" },
  "/subscriptions": { section: "Planning", title: "Subscriptions" },
  "/goals": { section: "Planning", title: "Financial Goals" },
  "/investments": { section: "Wealth & Debt", title: "Investments & Portfolio" },
  "/credit-cards": { section: "Wealth & Debt", title: "Credit Cards" },
  "/loans": { section: "Wealth & Debt", title: "Loans & Liabilities" },
  "/assets": { section: "Wealth & Debt", title: "Assets & Property" },
  "/reports": { section: "System & Automation", title: "Reports & Analytics" },
  "/import": { section: "System & Automation", title: "Statement Import" },
  "/devices": { section: "System & Automation", title: "Automation Centre" },
  "/settings": { section: "System & Automation", title: "Settings" },
  "/profile": { section: "Account", title: "User Profile" },
};

export function AppHeader({ user }: AppHeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { setCommandMenuOpen, openQuickTransaction } = useUIStore();

  const breadcrumb =
    routeBreadcrumbMap[pathname] ||
    routeBreadcrumbMap["/" + pathname.split("/")[1]] || {
      section: "WealthOvers",
      title: "Finance Manager",
    };

  return (
    <header className="h-16 border-b border-border/80 bg-card/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-colors">
      {/* Left: Mobile Drawer Trigger & Breadcrumbs */}
      <div className="flex items-center space-x-3">
        {/* Mobile Navigation Drawer */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-9 w-9 text-muted-foreground hover:text-foreground"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 flex flex-col bg-card border-r border-border/80">
            <SheetHeader className="p-4 border-b border-border/80 flex items-center space-x-2.5">
              <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-xs">
                <Wallet className="h-5 w-5" />
              </div>
              <SheetTitle className="text-base font-bold text-foreground">
                WealthOvers
              </SheetTitle>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {navSections.map((section) => (
                <div key={section.title} className="space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase px-2 mb-1.5">
                    {section.title}
                  </p>
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        prefetch={
                          item.href === "/dashboard" ||
                          item.href === "/net-worth" ||
                          item.href === "/transactions" ||
                          item.href === "/accounts" ||
                          item.href === "/investments"
                        }
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                          isActive
                            ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`} />
                        <span>{item.title}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>

        {/* Desktop Breadcrumbs */}
        <div className="flex items-center space-x-1.5 text-xs sm:text-sm">
          <span className="text-muted-foreground font-medium hidden sm:inline">
            {breadcrumb.section}
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 hidden sm:inline" />
          <h1 className="font-semibold text-foreground tracking-tight truncate max-w-[180px] sm:max-w-xs md:max-w-sm">
            {breadcrumb.title}
          </h1>
        </div>
      </div>

      {/* Right Controls: Search, Quick Add, Alerts, Theme, Privacy, Profile */}
      <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
        {/* Global Search / Command Bar Trigger */}
        <button
          onClick={() => setCommandMenuOpen(true)}
          className="hidden md:flex items-center space-x-2 h-9 px-3 rounded-lg border border-border/80 bg-muted/40 hover:bg-muted/70 text-xs text-muted-foreground hover:text-foreground transition-all shadow-xs"
          aria-label="Open Command Menu"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search or jump to...</span>
          <kbd className="ml-2 inline-flex items-center gap-0.5 rounded border border-border/80 bg-background px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </button>

        {/* Mobile Search Icon */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCommandMenuOpen(true)}
          className="md:hidden h-9 w-9 text-muted-foreground hover:text-foreground"
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </Button>

        {/* Global Quick Action: "+ Add Transaction" */}
        <Button
          onClick={() => openQuickTransaction("expense")}
          size="sm"
          className="h-9 px-3 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 font-medium shadow-xs text-xs sm:text-sm"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Transaction</span>
          <span className="sm:hidden">Add</span>
        </Button>

        {/* Notification Bell Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground relative"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-2">
            <DropdownMenuLabel className="flex items-center justify-between text-xs font-semibold">
              <span>Financial Alerts & System</span>
              <span className="text-[10px] text-muted-foreground font-normal">Updated live</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="py-2 px-2 text-xs space-y-2">
              <div className="flex items-start gap-2.5 p-2 rounded-lg bg-muted/40">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Zero-Trust Sync Active</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Android Companion endpoint ready for secure encrypted synchronization.
                  </p>
                </div>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="text-center justify-center text-xs font-medium text-primary cursor-pointer">
              <Link href="/recurring">View Upcoming Bill Schedule →</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Privacy Balance Mask Toggle */}
        <PrivacyMaskToggle />

        {/* Theme Toggle (Light / Dark / System) */}
        <ThemeToggle />

        <div className="h-4 w-px bg-border/80 mx-0.5" />

        {/* User Profile Menu */}
        <UserNav user={user} />
      </div>
    </header>
  );
}

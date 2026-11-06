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
  Home,
  TrendingUp,
  Receipt,
  Landmark,
  BarChart3,
  Target,
  Coins,
  CreditCard,
  Scale,
  Building2,
  FileSpreadsheet,
  Smartphone,
  FolderTree,
  Calendar,
  Settings,
  User as UserIcon,
  CheckCircle2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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

interface NavDrawerSection {
  title: string;
  items: {
    title: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }[];
}

const mobileDrawerSections: NavDrawerSection[] = [
  {
    title: "PRIMARY",
    items: [
      { title: "Home Dashboard", href: "/dashboard", icon: Home },
      { title: "Activity (Ledger)", href: "/transactions", icon: Receipt },
      { title: "Insights & Cash Flow", href: "/reports", icon: BarChart3 },
      { title: "Plan & Envelopes", href: "/budgets", icon: Target },
    ],
  },
  {
    title: "ACCOUNTS & WEALTH",
    items: [
      { title: "Net Worth & Ratios", href: "/net-worth", icon: TrendingUp },
      { title: "Accounts & Banking", href: "/accounts", icon: Landmark },
      { title: "Investments Portfolio", href: "/investments", icon: Coins },
      { title: "Assets & Property", href: "/assets", icon: Building2 },
    ],
  },
  {
    title: "LIABILITIES & CREDIT",
    items: [
      { title: "Credit Cards", href: "/credit-cards", icon: CreditCard },
      { title: "Loans & Debts", href: "/loans", icon: Scale },
    ],
  },
  {
    title: "PLANNING & AUTOMATION",
    items: [
      { title: "Subscriptions", href: "/subscriptions", icon: Target },
      { title: "Recurring Bills", href: "/recurring", icon: Calendar },
      { title: "Financial Goals", href: "/goals", icon: Target },
      { title: "Categorization Rules", href: "/categories", icon: FolderTree },
      { title: "Statement Import", href: "/import", icon: FileSpreadsheet },
      { title: "Companion Android Sync", href: "/devices", icon: Smartphone },
    ],
  },
  {
    title: "PREFERENCES",
    items: [
      { title: "System Settings", href: "/settings", icon: Settings },
      { title: "Profile & Security", href: "/profile", icon: UserIcon },
    ],
  },
];

const routeBreadcrumbMap: Record<string, { section: string; title: string }> = {
  "/dashboard": { section: "Overview", title: "Home" },
  "/net-worth": { section: "Overview", title: "Net Worth" },
  "/transactions": { section: "Activity", title: "Transactions Ledger" },
  "/accounts": { section: "Banking", title: "Accounts & Balances" },
  "/categories": { section: "Management", title: "Categories & Rules" },
  "/budgets": { section: "Planning", title: "Budgets & Limits" },
  "/recurring": { section: "Planning", title: "Recurring Bills" },
  "/subscriptions": { section: "Planning", title: "Subscriptions" },
  "/goals": { section: "Planning", title: "Financial Goals" },
  "/investments": { section: "Wealth", title: "Investments Portfolio" },
  "/credit-cards": { section: "Credit", title: "Credit Cards" },
  "/loans": { section: "Liabilities", title: "Loans & Mortgages" },
  "/assets": { section: "Wealth", title: "Assets & Property" },
  "/reports": { section: "Analytics", title: "Insights & Reports" },
  "/import": { section: "System", title: "Statement Import" },
  "/devices": { section: "System", title: "Automation Sync" },
  "/settings": { section: "Preferences", title: "Settings & Theme" },
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
      title: "Personal Wealth",
    };

  return (
    <header className="h-16 border-b border-border bg-card/90 backdrop-blur-md px-3.5 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-colors">
      {/* Left: Mobile Navigation Drawer & Desktop Breadcrumbs */}
      <div className="flex items-center space-x-2.5 sm:space-x-3">
        {/* Mobile Navigation Drawer ("More" Hub) */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted/60"
              aria-label="Open More navigation drawer"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open navigation drawer</span>
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-72 p-0 flex flex-col bg-card border-r border-border"
          >
            {/* Drawer Header */}
            <SheetHeader className="p-4 border-b border-border flex flex-row items-center space-x-2.5">
              <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-xs shrink-0">
                <Wallet className="h-5 w-5" />
              </div>
              <div className="flex flex-col text-left leading-tight">
                <SheetTitle className="text-base font-bold text-foreground">
                  WealthOvers
                </SheetTitle>
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                  More & Navigation Hub
                </span>
              </div>
            </SheetHeader>

            {/* Drawer Scrollable Links Tree */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {mobileDrawerSections.map((sec, idx) => (
                <div key={idx} className="space-y-0.5">
                  <h4 className="px-2 text-[9px] font-bold text-muted-foreground/70 tracking-wider uppercase mb-1">
                    {sec.title}
                  </h4>
                  {sec.items.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      item.href === "/dashboard"
                        ? pathname === "/dashboard"
                        : pathname === item.href || pathname.startsWith(item.href);

                    return (
                      <Link
                        key={item.title}
                        href={item.href}
                        prefetch={true}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors duration-150 ${
                          isActive
                            ? "bg-surface-secondary text-primary font-semibold"
                            : "text-muted-foreground hover:text-foreground hover:bg-surface-secondary/50"
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 shrink-0 ${
                            isActive ? "text-primary" : "text-muted-foreground"
                          }`}
                        />
                        <span className="truncate">{item.title}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Drawer User Bar Footer */}
            <div className="p-3 border-t border-border flex items-center justify-between bg-surface-secondary/40">
              <div className="flex flex-col min-w-0 leading-tight">
                <span className="text-xs font-semibold text-foreground truncate">
                  {user.fullName || "User Account"}
                </span>
                <span className="text-[10px] text-muted-foreground truncate">
                  {user.email}
                </span>
              </div>
              <Link
                href="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
                aria-label="Settings"
              >
                <Settings className="h-4 w-4" />
              </Link>
            </div>
          </SheetContent>
        </Sheet>

        {/* Desktop Breadcrumbs */}
        <div className="flex items-center space-x-1.5 text-xs sm:text-sm">
          <span className="text-muted-foreground font-medium hidden sm:inline">
            {breadcrumb.section}
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 hidden sm:inline" />
          <h1 className="font-semibold text-foreground tracking-tight truncate max-w-[180px] sm:max-w-xs md:max-w-sm">
            {breadcrumb.title}
          </h1>
        </div>
      </div>

      {/* Right Controls: Search, Quick Add, Alerts, Privacy Mask, Theme, Profile */}
      <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
        {/* Desktop Global Search Bar Trigger */}
        <button
          onClick={() => setCommandMenuOpen(true)}
          className="hidden md:flex items-center space-x-2 h-8.5 px-3 rounded-lg border border-border/80 bg-muted/40 hover:bg-muted/70 text-xs text-muted-foreground hover:text-foreground transition-all shadow-2xs cursor-pointer"
          aria-label="Search or jump to"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search or jump to...</span>
          <kbd className="ml-2 inline-flex items-center gap-0.5 rounded border border-border/80 bg-background px-1.5 py-0.5 text-[9px] font-mono font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </button>

        {/* Mobile Search Icon */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCommandMenuOpen(true)}
          className="md:hidden h-8.5 w-8.5 text-muted-foreground hover:text-foreground"
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </Button>

        {/* Desktop Header Quick Add Action Button */}
        <Button
          onClick={() => openQuickTransaction("expense")}
          size="sm"
          className="h-8.5 px-3 gap-1.5 bg-primary text-primary-foreground hover:bg-primary-hover font-medium shadow-xs text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Add Transaction</span>
          <span className="sm:hidden">Add</span>
        </Button>

        {/* Notification Bell Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8.5 w-8.5 text-muted-foreground hover:text-foreground relative"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-2">
            <DropdownMenuLabel className="flex items-center justify-between text-xs font-semibold">
              <span>Financial Alerts & System</span>
              <span className="text-[10px] text-muted-foreground font-normal">
                Live
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="py-2 px-1 text-xs space-y-2">
              <div className="flex items-start gap-2.5 p-2 rounded-lg bg-surface-secondary/50">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">
                    Zero-Trust Sync Active
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Android Companion endpoint ready for secure encrypted sync.
                  </p>
                </div>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              asChild
              className="text-center justify-center text-xs font-medium text-primary cursor-pointer"
            >
              <Link href="/recurring">View Upcoming Bill Schedule →</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Privacy Balance Mask Toggle */}
        <PrivacyMaskToggle />

        {/* Theme Toggle (3-Way: Light, Dark, System) */}
        <ThemeToggle />

        <div className="h-4 w-px bg-border/80 mx-0.5 hidden sm:block" />

        {/* User Profile Menu */}
        <UserNav user={user} />
      </div>
    </header>
  );
}

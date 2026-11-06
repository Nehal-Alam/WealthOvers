"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Wallet,
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
  Settings,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  LogOut,
  Sparkles,
  Calendar,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/app/(auth)/actions";

interface AppSidebarProps {
  user?: {
    email?: string | null;
    fullName?: string | null;
    avatarUrl?: string | null;
  };
}

interface NavSectionItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  tab?: string;
  badge?: string;
}

const navSections: { group?: string; items: NavSectionItem[] }[] = [
  {
    group: "COMMAND CENTRE",
    items: [
      { title: "Home", href: "/dashboard", icon: Home, exact: true },
      { title: "Net Worth", href: "/net-worth", icon: TrendingUp },
    ],
  },
  {
    group: "TRANSACTIONS",
    items: [
      { title: "Activity", href: "/transactions", icon: Receipt },
      { title: "Accounts", href: "/accounts", icon: Landmark },
    ],
  },
  {
    group: "PLANNING",
    items: [
      { title: "Plan", href: "/plan", icon: Target },
      { title: "Subscriptions", href: "/subscriptions", icon: Layers, badge: "V2" },
    ],
  },
  {
    group: "INVESTMENTS",
    items: [
      { title: "Investments", href: "/investments", icon: Coins },
    ],
  },
  {
    group: "CREDIT & DEBT",
    items: [
      { title: "Credit Cards", href: "/credit-cards", icon: CreditCard },
      { title: "Loans", href: "/loans", icon: Scale },
    ],
  },
  {
    group: "ASSETS & NET WEALTH",
    items: [
      { title: "Assets", href: "/assets", icon: Building2 },
    ],
  },
  {
    group: "INTELLIGENCE",
    items: [
      { title: "AI Assistant", href: "/ai-assistant", icon: Sparkles, badge: "AI" },
      { title: "Insights", href: "/insights", icon: BarChart3 },
    ],
  },
  {
    group: "SYSTEM & AUTOMATION",
    items: [
      { title: "Reports", href: "/reports", icon: FileSpreadsheet },
      { title: "Automation", href: "/devices", icon: Smartphone },
      { title: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    isSidebarOpen,
    toggleSidebar,
    openQuickTransaction,
    setCommandMenuOpen,
  } = useUIStore();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isOpen = mounted ? isSidebarOpen : true;

  const initials =
    user?.fullName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ||
    user?.email?.slice(0, 2).toUpperCase() ||
    "WO";

  const isItemActive = (item: NavSectionItem) => {
    if (item.exact) {
      return pathname === item.href;
    }
    if (item.title === "Plan") {
      return (
        pathname === "/plan" ||
        pathname.startsWith("/plan") ||
        pathname.startsWith("/budgets") ||
        pathname.startsWith("/goals") ||
        pathname.startsWith("/recurring")
      );
    }
    return (
      pathname === item.href ||
      (item.href !== "/dashboard" && pathname.startsWith(item.href))
    );
  };

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col border-r border-border bg-card transition-all duration-150 relative z-20 shrink-0 select-none",
        isOpen ? "w-60" : "w-16"
      )}
    >
      {/* Bloomberg Terminal Brand Header */}
      <div className="h-14 flex items-center justify-between px-3.5 border-b border-border/80 bg-surface">
        <Link
          href="/dashboard"
          className="flex items-center space-x-2.5 overflow-hidden"
          title="WealthOvers V2 Terminal"
        >
          <div className="h-8 w-8 shrink-0 rounded bg-primary flex items-center justify-center text-primary-foreground font-mono font-bold text-sm shadow-xs">
            W2
          </div>
          {isOpen && (
            <div className="flex flex-col overflow-hidden leading-tight">
              <span className="font-bold text-sm tracking-tight text-foreground truncate font-mono">
                WEALTHOVERS
              </span>
              <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-widest">
                Terminal V2.0
              </span>
            </div>
          )}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/60 shrink-0 rounded"
          title={isOpen ? "Collapse navigation" : "Expand navigation"}
          aria-label={isOpen ? "Collapse navigation" : "Expand navigation"}
        >
          {isOpen ? (
            <ChevronLeft className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {/* Quick Action & Global Search Bar */}
      <div className="p-2.5 space-y-2 border-b border-border/60 bg-surface/50">
        {isOpen ? (
          <>
            <button
              onClick={() => openQuickTransaction("expense")}
              className="w-full flex items-center justify-center gap-2 h-8 px-3 rounded bg-primary text-primary-foreground hover:bg-primary-hover active:scale-[0.98] transition-all text-xs font-semibold shadow-xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Transaction</span>
            </button>
            <button
              onClick={() => setCommandMenuOpen(true)}
              className="w-full flex items-center justify-between h-7 px-2.5 rounded border border-border/70 bg-muted/40 hover:bg-muted/70 text-[11px] text-muted-foreground hover:text-foreground transition-all cursor-pointer font-mono"
            >
              <span className="flex items-center gap-1.5 truncate">
                <Search className="h-3 w-3" />
                <span>Quick Jump...</span>
              </span>
              <kbd className="rounded border border-border/80 bg-background px-1 py-0.2 text-[9px] font-mono text-muted-foreground">
                ⌘K
              </kbd>
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => openQuickTransaction("expense")}
              className="h-8 w-8 rounded bg-primary text-primary-foreground hover:bg-primary-hover active:scale-95 flex items-center justify-center shadow-xs cursor-pointer"
              title="Add Transaction"
              aria-label="Add Transaction"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCommandMenuOpen(true)}
              className="h-7 w-7 rounded border border-border/70 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer"
              title="Search (⌘K)"
              aria-label="Search or jump to"
            >
              <Search className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Navigation Hierarchy */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-3">
        {navSections.map((sec, idx) => (
          <div key={idx} className="space-y-0.5">
            {isOpen && sec.group && (
              <h4 className="px-2 text-[9px] font-mono font-bold text-muted-foreground/80 tracking-wider uppercase mb-1">
                {sec.group}
              </h4>
            )}
            {!isOpen && idx > 0 && <div className="h-px bg-border/40 mx-2 my-1" />}
            {sec.items.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item);

              return (
                <Link
                  key={item.title}
                  href={item.href}
                  prefetch={true}
                  title={!isOpen ? item.title : undefined}
                  className={cn(
                    "flex items-center gap-2.5 py-1.5 rounded text-xs font-medium transition-colors relative duration-100",
                    isOpen ? "px-2.5" : "justify-center px-0 h-8",
                    active
                      ? "bg-surface-secondary text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-surface-secondary/60"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 transition-colors",
                      active
                        ? "text-primary"
                        : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  {isOpen && (
                    <div className="flex items-center justify-between flex-1 min-w-0">
                      <span className="truncate">{item.title}</span>
                      {item.badge && (
                        <span className="text-[9px] font-mono font-bold px-1 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                  {active && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-primary" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Profile & Footer Menu */}
      <div className="p-2 border-t border-border/80 bg-surface/50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "w-full flex items-center gap-2.5 p-1.5 rounded hover:bg-muted/60 transition-colors text-left cursor-pointer",
                isOpen ? "px-2" : "justify-center px-0"
              )}
              title={user?.fullName || "My Profile"}
              aria-label="User menu"
            >
              <Avatar className="h-7 w-7 border border-border/80 shrink-0 rounded">
                <AvatarImage src={user?.avatarUrl || ""} alt={user?.fullName || "User"} />
                <AvatarFallback className="bg-primary/10 text-primary font-mono font-semibold text-xs rounded">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {isOpen && (
                <div className="flex flex-col min-w-0 flex-1 leading-tight">
                  <span className="text-xs font-semibold text-foreground truncate">
                    {user?.fullName || "My Account"}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate font-mono">
                    {user?.email || "Personal"}
                  </span>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-card border-border" align="end" side="right" sideOffset={10}>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-xs font-semibold text-foreground">
                  {user?.fullName || "WealthOvers User"}
                </p>
                <p className="text-[11px] text-muted-foreground truncate font-mono">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/profile" className="text-xs cursor-pointer">
                  <UserIcon className="mr-2 h-3.5 w-3.5" />
                  <span>Profile & Security</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="text-xs cursor-pointer">
                  <Settings className="mr-2 h-3.5 w-3.5" />
                  <span>Preferences & Theme</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-xs cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
              onClick={() => signOutAction()}
            >
              <LogOut className="mr-2 h-3.5 w-3.5" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

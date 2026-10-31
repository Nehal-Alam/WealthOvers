"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Wallet,
  LayoutDashboard,
  TrendingUp,
  Receipt,
  Landmark,
  FolderTree,
  PiggyBank,
  Calendar,
  CreditCard,
  Target,
  Coins,
  Home,
  Scale,
  BarChart3,
  FileSpreadsheet,
  Smartphone,
  Settings,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";

const navSections = [
  {
    title: "OVERVIEW",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Net Worth", href: "/net-worth", icon: TrendingUp },
    ],
  },
  {
    title: "MONEY MANAGEMENT",
    items: [
      { title: "Transactions", href: "/transactions", icon: Receipt },
      { title: "Accounts", href: "/accounts", icon: Landmark },
      { title: "Categories", href: "/categories", icon: FolderTree },
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
      { title: "Reports", href: "/reports", icon: BarChart3 },
      { title: "Statement Import", href: "/import", icon: FileSpreadsheet },
      { title: "Android Sync", href: "/devices", icon: Smartphone },
      { title: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { isSidebarOpen, toggleSidebar } = useUIStore();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isOpen = mounted ? isSidebarOpen : true;

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col border-r bg-card transition-all duration-300 relative z-20 shrink-0",
        isOpen ? "w-64" : "w-18"
      )}
    >
      {/* Sidebar Header / Brand */}
      <div className="h-16 flex items-center justify-between px-4 border-b">
        <Link
          href="/dashboard"
          className="flex items-center space-x-2.5 overflow-hidden"
        >
          <div className="h-9 w-9 shrink-0 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-md shadow-primary/20">
            <Wallet className="h-5 w-5" />
          </div>
          {isOpen && (
            <span className="font-bold text-lg tracking-tight text-foreground truncate">
              WealthOvers
            </span>
          )}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="h-8 w-8 text-muted-foreground hover:text-foreground hidden lg:flex"
          title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isOpen ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Nav Link Tree */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            {isOpen && (
              <h4 className="px-3 text-[10px] font-bold text-muted-foreground tracking-wider uppercase">
                {section.title}
              </h4>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={!isOpen ? item.title : undefined}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        isActive
                          ? "text-primary-foreground"
                          : "text-muted-foreground group-hover:text-foreground"
                      )}
                    />
                    {isOpen && (
                      <span className="truncate">{item.title}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Sidebar Footer Link */}
      <div className="p-3 border-t">
        <Link
          href="/profile"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors",
            pathname === "/profile" && "bg-muted text-foreground"
          )}
        >
          <User className="h-4 w-4 shrink-0" />
          {isOpen && <span className="truncate">My Profile</span>}
        </Link>
      </div>
    </aside>
  );
}

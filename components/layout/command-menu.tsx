"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
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
  User,
  PlusCircle,
  ArrowLeftRight,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Command,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useUIStore } from "@/stores/ui-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CommandItem {
  id: string;
  title: string;
  group: "Actions" | "Navigation" | "Preferences";
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  keywords?: string[];
  onSelect: () => void;
}

export function CommandMenu() {
  const router = useRouter();
  const { setTheme, theme } = useTheme();
  const {
    isCommandMenuOpen,
    setCommandMenuOpen,
    openQuickTransaction,
    isPrivacyMode,
    togglePrivacyMode,
  } = useUIStore();

  const [query, setQuery] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  // Global keydown listener for Cmd+K / Ctrl+K
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandMenuOpen(!isCommandMenuOpen);
      }
      // Also support Shift+P for privacy toggle
      if (e.shiftKey && (e.key === "P" || e.key === "p")) {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag !== "input" && activeTag !== "textarea") {
          e.preventDefault();
          togglePrivacyMode();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCommandMenuOpen, setCommandMenuOpen, togglePrivacyMode]);

  // Reset query on open and prefetch primary routes
  React.useEffect(() => {
    if (isCommandMenuOpen) {
      setQuery("");
      setSelectedIndex(0);
      router.prefetch("/dashboard");
      router.prefetch("/net-worth");
      router.prefetch("/transactions");
      router.prefetch("/accounts");
      router.prefetch("/investments");
    }
  }, [isCommandMenuOpen, router]);

  const navigate = React.useCallback(
    (href: string) => {
      setCommandMenuOpen(false);
      router.push(href);
    },
    [router, setCommandMenuOpen]
  );

  const commandItems: CommandItem[] = React.useMemo(
    () => [
      // Quick Actions
      {
        id: "act-add-expense",
        title: "Add Expense",
        group: "Actions",
        icon: PlusCircle,
        shortcut: "E",
        keywords: ["new", "spend", "cost", "outflow", "transaction"],
        onSelect: () => {
          setCommandMenuOpen(false);
          openQuickTransaction("expense");
        },
      },
      {
        id: "act-add-income",
        title: "Add Income",
        group: "Actions",
        icon: TrendingUp,
        shortcut: "I",
        keywords: ["new", "salary", "inflow", "deposit"],
        onSelect: () => {
          setCommandMenuOpen(false);
          openQuickTransaction("income");
        },
      },
      {
        id: "act-transfer",
        title: "Transfer Funds",
        group: "Actions",
        icon: ArrowLeftRight,
        shortcut: "T",
        keywords: ["move", "internal", "between accounts"],
        onSelect: () => {
          setCommandMenuOpen(false);
          openQuickTransaction("transfer");
        },
      },
      {
        id: "act-toggle-privacy",
        title: isPrivacyMode ? "Show Balances (Disable Privacy)" : "Hide Balances (Privacy Mode)",
        group: "Preferences",
        icon: isPrivacyMode ? Eye : EyeOff,
        shortcut: "⇧P",
        keywords: ["mask", "blur", "hide", "private"],
        onSelect: () => {
          setCommandMenuOpen(false);
          togglePrivacyMode();
        },
      },
      {
        id: "act-toggle-theme",
        title: `Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`,
        group: "Preferences",
        icon: theme === "dark" ? Sun : Moon,
        keywords: ["theme", "color", "dark", "light"],
        onSelect: () => {
          setCommandMenuOpen(false);
          setTheme(theme === "dark" ? "light" : "dark");
        },
      },

      // Navigation
      {
        id: "nav-dashboard",
        title: "Dashboard",
        group: "Navigation",
        icon: LayoutDashboard,
        keywords: ["home", "overview", "summary"],
        onSelect: () => navigate("/dashboard"),
      },
      {
        id: "nav-net-worth",
        title: "Net Worth & Balance Sheet",
        group: "Navigation",
        icon: TrendingUp,
        keywords: ["assets", "liabilities", "wealth", "balance sheet"],
        onSelect: () => navigate("/net-worth"),
      },
      {
        id: "nav-transactions",
        title: "Transactions Ledger",
        group: "Navigation",
        icon: Receipt,
        keywords: ["history", "payments", "log", "statement"],
        onSelect: () => navigate("/transactions"),
      },
      {
        id: "nav-accounts",
        title: "Accounts & Banking",
        group: "Navigation",
        icon: Landmark,
        keywords: ["banks", "wallets", "balances"],
        onSelect: () => navigate("/accounts"),
      },
      {
        id: "nav-categories",
        title: "Categories & Rules Engine",
        group: "Navigation",
        icon: FolderTree,
        keywords: ["tags", "classification", "rules"],
        onSelect: () => navigate("/categories"),
      },
      {
        id: "nav-budgets",
        title: "Budgets & Spending Limits",
        group: "Navigation",
        icon: PiggyBank,
        keywords: ["targets", "envelopes", "limits"],
        onSelect: () => navigate("/budgets"),
      },
      {
        id: "nav-recurring",
        title: "Recurring Bills & Subscriptions",
        group: "Navigation",
        icon: Calendar,
        keywords: ["utilities", "bills", "cadence"],
        onSelect: () => navigate("/recurring"),
      },
      {
        id: "nav-goals",
        title: "Financial Goals",
        group: "Navigation",
        icon: Target,
        keywords: ["savings target", "future", "milestones"],
        onSelect: () => navigate("/goals"),
      },
      {
        id: "nav-investments",
        title: "Investments & Portfolio",
        group: "Navigation",
        icon: Coins,
        keywords: ["stocks", "mutual funds", "gold", "xirr", "crypto"],
        onSelect: () => navigate("/investments"),
      },
      {
        id: "nav-credit-cards",
        title: "Credit Cards & Statement Cycles",
        group: "Navigation",
        icon: CreditCard,
        keywords: ["cards", "utilization", "due date"],
        onSelect: () => navigate("/credit-cards"),
      },
      {
        id: "nav-loans",
        title: "Loans & Liabilities",
        group: "Navigation",
        icon: Scale,
        keywords: ["debt", "emi", "mortgage", "amortization"],
        onSelect: () => navigate("/loans"),
      },
      {
        id: "nav-assets",
        title: "Physical Assets & Valuables",
        group: "Navigation",
        icon: Home,
        keywords: ["property", "real estate", "vehicles", "gold"],
        onSelect: () => navigate("/assets"),
      },
      {
        id: "nav-reports",
        title: "Reports & Analytics",
        group: "Navigation",
        icon: BarChart3,
        keywords: ["cash flow", "charts", "breakdown", "tax"],
        onSelect: () => navigate("/reports"),
      },
      {
        id: "nav-import",
        title: "Bank Statement Import",
        group: "Navigation",
        icon: FileSpreadsheet,
        keywords: ["csv", "pdf", "excel", "upload"],
        onSelect: () => navigate("/import"),
      },
      {
        id: "nav-devices",
        title: "Automation Centre & Android Sync",
        group: "Navigation",
        icon: Smartphone,
        keywords: ["sync", "device", "sms", "companion"],
        onSelect: () => navigate("/devices"),
      },
      {
        id: "nav-settings",
        title: "Account Settings",
        group: "Navigation",
        icon: Settings,
        keywords: ["preferences", "security", "export"],
        onSelect: () => navigate("/settings"),
      },
      {
        id: "nav-profile",
        title: "User Profile",
        group: "Navigation",
        icon: User,
        keywords: ["account", "email", "name"],
        onSelect: () => navigate("/profile"),
      },
    ],
    [isPrivacyMode, navigate, openQuickTransaction, setCommandMenuOpen, setTheme, theme, togglePrivacyMode]
  );

  // Filter items based on query
  const filteredItems = React.useMemo(() => {
    if (!query.trim()) return commandItems;
    const cleanQuery = query.toLowerCase().trim();
    return commandItems.filter(
      (item) =>
        item.title.toLowerCase().includes(cleanQuery) ||
        item.group.toLowerCase().includes(cleanQuery) ||
        item.keywords?.some((k) => k.toLowerCase().includes(cleanQuery))
    );
  }, [commandItems, query]);

  // Keep selected index within bounds
  React.useEffect(() => {
    if (selectedIndex >= filteredItems.length) {
      setSelectedIndex(0);
    }
  }, [filteredItems, selectedIndex]);

  // Handle arrow key navigation in list
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].onSelect();
      }
    }
  };

  return (
    <Dialog open={isCommandMenuOpen} onOpenChange={setCommandMenuOpen}>
      <DialogContent className="p-0 max-w-xl overflow-hidden border bg-card shadow-2xl rounded-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Command Menu</DialogTitle>
        </DialogHeader>

        {/* Search input header */}
        <div className="flex items-center px-4 py-3.5 border-b border-border/80">
          <Search className="h-4 w-4 text-muted-foreground mr-3 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search commands, pages, or actions..."
            className="w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Command list */}
        <div className="max-h-[360px] overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;

              return (
                <button
                  key={item.id}
                  onClick={item.onSelect}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-foreground hover:bg-muted/60"
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        isSelected ? "text-primary-foreground" : "text-muted-foreground"
                      }`}
                    />
                    <span className="truncate">{item.title}</span>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 ml-2">
                    <span
                      className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded ${
                        isSelected
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {item.group}
                    </span>
                    {item.shortcut && (
                      <kbd
                        className={`text-[10px] font-mono px-1 rounded ${
                          isSelected
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : "bg-muted text-muted-foreground border"
                        }`}
                      >
                        {item.shortcut}
                      </kbd>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2 border-t border-border/80 bg-muted/30 flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
          </div>
          <span>WealthOvers Universal Command</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

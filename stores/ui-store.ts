import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  // Privacy mask mode
  isPrivacyMode: boolean;
  togglePrivacyMode: () => void;
  setPrivacyMode: (value: boolean) => void;

  // Desktop sidebar collapse
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (value: boolean) => void;

  // Command palette (Cmd+K)
  isCommandMenuOpen: boolean;
  setCommandMenuOpen: (open: boolean) => void;
  toggleCommandMenu: () => void;

  // Global Quick Transaction Modal
  isQuickTransactionOpen: boolean;
  quickTransactionType: "expense" | "income" | "transfer";
  openQuickTransaction: (type?: "expense" | "income" | "transfer") => void;
  closeQuickTransaction: () => void;

  // Active Account Selector Filter (Home & Activity synced, "all" | account_id)
  selectedAccountId: string;
  setSelectedAccountId: (accountId: string) => void;

  // Dashboard widget customization
  dashboardWidgets: Record<string, boolean>;
  toggleDashboardWidget: (widgetId: string) => void;
  setDashboardWidgetVisible: (widgetId: string, visible: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      isPrivacyMode: false,
      togglePrivacyMode: () =>
        set((state) => ({ isPrivacyMode: !state.isPrivacyMode })),
      setPrivacyMode: (value: boolean) => set({ isPrivacyMode: value }),

      isSidebarOpen: true,
      toggleSidebar: () =>
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setSidebarOpen: (value: boolean) => set({ isSidebarOpen: value }),

      isCommandMenuOpen: false,
      setCommandMenuOpen: (open: boolean) => set({ isCommandMenuOpen: open }),
      toggleCommandMenu: () =>
        set((state) => ({ isCommandMenuOpen: !state.isCommandMenuOpen })),

      isQuickTransactionOpen: false,
      quickTransactionType: "expense",
      openQuickTransaction: (type = "expense") =>
        set({ isQuickTransactionOpen: true, quickTransactionType: type }),
      closeQuickTransaction: () => set({ isQuickTransactionOpen: false }),

      selectedAccountId: "all",
      setSelectedAccountId: (accountId: string) =>
        set({ selectedAccountId: accountId || "all" }),

      dashboardWidgets: {
        netWorthTrend: true,
        monthlyCashFlow: true,
        assetAllocation: true,
        expenseBreakdown: true,
        investmentPerformance: true,
        financialInsights: true,
        budgetProgress: true,
        accountsOverview: true,
        recentTransactions: true,
        upcomingBills: true,
        financialGoals: true,
      },
      toggleDashboardWidget: (widgetId: string) =>
        set((state) => ({
          dashboardWidgets: {
            ...state.dashboardWidgets,
            [widgetId]: !state.dashboardWidgets[widgetId],
          },
        })),
      setDashboardWidgetVisible: (widgetId: string, visible: boolean) =>
        set((state) => ({
          dashboardWidgets: {
            ...state.dashboardWidgets,
            [widgetId]: visible,
          },
        })),
    }),
    {
      name: "wealthovers-ui-state",
      partialize: (state) => ({
        isPrivacyMode: state.isPrivacyMode,
        isSidebarOpen: state.isSidebarOpen,
        dashboardWidgets: state.dashboardWidgets,
        selectedAccountId: state.selectedAccountId,
      }),
    }
  )
);

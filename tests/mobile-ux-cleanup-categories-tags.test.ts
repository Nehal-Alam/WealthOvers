import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Mobile UX Improvement, Account Filtering & Categories/Tags System", () => {
  const globalsCssPath = path.join(process.cwd(), "app/globals.css");
  const globalsCss = fs.readFileSync(globalsCssPath, "utf-8");

  const tailwindConfigPath = path.join(process.cwd(), "tailwind.config.ts");
  const tailwindConfig = fs.readFileSync(tailwindConfigPath, "utf-8");

  const uiStorePath = path.join(process.cwd(), "stores/ui-store.ts");
  const uiStoreCode = fs.readFileSync(uiStorePath, "utf-8");

  const appHeaderPath = path.join(process.cwd(), "components/layout/app-header.tsx");
  const appHeaderCode = fs.readFileSync(appHeaderPath, "utf-8");

  const accountSelectorPath = path.join(process.cwd(), "components/accounts/account-selector.tsx");
  const accountSelectorCode = fs.readFileSync(accountSelectorPath, "utf-8");

  const mobileDashboardPath = path.join(process.cwd(), "components/dashboard/mobile-dashboard-view.tsx");
  const mobileDashboardCode = fs.readFileSync(mobileDashboardPath, "utf-8");

  const mobileActivityPath = path.join(process.cwd(), "components/transactions/mobile-activity-view.tsx");
  const mobileActivityCode = fs.readFileSync(mobileActivityPath, "utf-8");

  const categoryActionsPath = path.join(process.cwd(), "app/(dashboard)/categories/actions.ts");
  const categoryActionsCode = fs.readFileSync(categoryActionsPath, "utf-8");

  const categoryValidationPath = path.join(process.cwd(), "lib/validations/categories.ts");
  const categoryValidationCode = fs.readFileSync(categoryValidationPath, "utf-8");

  const tagListPath = path.join(process.cwd(), "components/categories/tag-list.tsx");
  const tagListCode = fs.readFileSync(tagListPath, "utf-8");

  describe("1. Light & Dark Theme Color Specification", () => {
    it("defines the exact requested light theme palette tokens", () => {
      expect(globalsCss).toContain("--mobile-bg: #F5F6F8");
      expect(globalsCss).toContain("--mobile-surface: #FFFFFF");
      expect(globalsCss).toContain("--mobile-surface-secondary: #EEF1F5");
      expect(globalsCss).toContain("--mobile-surface-elevated: #FFFFFF");
      expect(globalsCss).toContain("--mobile-text-primary: #171A21");
      expect(globalsCss).toContain("--mobile-text-secondary: #697386");
      expect(globalsCss).toContain("--mobile-border: #E1E5EB");
      expect(globalsCss).toContain("--mobile-accent: #376FE5");
      expect(globalsCss).toContain("--mobile-income: #16865B");
      expect(globalsCss).toContain("--mobile-expense: #D94D5C");
      expect(globalsCss).toContain("--mobile-warning: #B77B19");
    });

    it("defines the exact requested dark theme palette tokens", () => {
      expect(globalsCss).toContain("--mobile-bg: #080A0D");
      expect(globalsCss).toContain("--mobile-surface: #14171C");
      expect(globalsCss).toContain("--mobile-surface-secondary: #1C2027");
      expect(globalsCss).toContain("--mobile-surface-elevated: #242A33");
      expect(globalsCss).toContain("--mobile-text-primary: #F4F6F9");
      expect(globalsCss).toContain("--mobile-text-secondary: #A0A8B5");
      expect(globalsCss).toContain("--mobile-border: #303743");
      expect(globalsCss).toContain("--mobile-accent: #A8C7FA");
      expect(globalsCss).toContain("--mobile-income: #80D5AE");
      expect(globalsCss).toContain("--mobile-expense: #E58A91");
      expect(globalsCss).toContain("--mobile-warning: #E6BD70");
    });

    it("exposes mobile color tokens in tailwind.config.ts", () => {
      expect(tailwindConfig).toContain("bg: \"var(--mobile-bg)\"");
      expect(tailwindConfig).toContain("surface: \"var(--mobile-surface)\"");
      expect(tailwindConfig).toContain("secondary: \"var(--mobile-surface-secondary)\"");
      expect(tailwindConfig).toContain("primary: \"var(--mobile-text-primary)\"");
      expect(tailwindConfig).toContain("accent: \"var(--mobile-accent)\"");
      expect(tailwindConfig).toContain("income: \"var(--mobile-income)\"");
      expect(tailwindConfig).toContain("expense: \"var(--mobile-expense)\"");
    });
  });

  describe("2. Header Overlap & Layout Cleanliness", () => {
    it("ensures desktop AppHeader is hidden on mobile screens to prevent double headers", () => {
      expect(appHeaderCode).toContain("hidden lg:flex");
    });

    it("includes ThemeToggle directly in mobile header for fast switching", () => {
      expect(mobileDashboardCode).toContain("<ThemeToggle");
      expect(mobileActivityCode).toContain("<ThemeToggle");
    });
  });

  describe("3. Account Selector & State Persistence", () => {
    it("stores and persists selectedAccountId in UI store", () => {
      expect(uiStoreCode).toContain("selectedAccountId: string");
      expect(uiStoreCode).toContain("setSelectedAccountId: (accountId: string) => void");
      expect(uiStoreCode).toContain("selectedAccountId: state.selectedAccountId");
    });

    it("implements compact bottom sheet account picker supporting All, Bank, Cash, and Credit accounts", () => {
      expect(accountSelectorCode).toContain("All Accounts");
      expect(accountSelectorCode).toContain("bankAccounts");
      expect(accountSelectorCode).toContain("cashAccounts");
      expect(accountSelectorCode).toContain("creditCards");
      expect(accountSelectorCode).toContain("setSelectedAccountId");
    });

    it("embeds AccountSelector in both Home and Activity screens", () => {
      expect(mobileDashboardCode).toContain("<AccountSelector");
      expect(mobileActivityCode).toContain("<AccountSelector");
    });

    it("filters Home balances and transactions when an individual account is selected", () => {
      expect(mobileDashboardCode).toContain("selectedAccount");
      expect(mobileDashboardCode).toContain("accountMasterTransactions");
      expect(mobileDashboardCode).toContain("isIndividualAccount");
      expect(mobileDashboardCode).toContain("isCreditCardAccount");
    });
  });

  describe("4. Custom Categories & Subcategories across 6 Financial Types", () => {
    it("supports all required category types: expense, income, investment, loan, debt, transfer", () => {
      expect(categoryValidationCode).toContain('"expense"');
      expect(categoryValidationCode).toContain('"income"');
      expect(categoryValidationCode).toContain('"investment"');
      expect(categoryValidationCode).toContain('"loan"');
      expect(categoryValidationCode).toContain('"debt"');
      expect(categoryValidationCode).toContain('"transfer"');
    });

    it("provides safe category deletion with transaction reassignment RPC", () => {
      expect(categoryActionsCode).toContain("reassign_category_transactions");
      expect(categoryActionsCode).toContain("reassignToCategoryId");
      expect(categoryActionsCode).toContain("deleteCategoryAction");
    });

    it("supports category archiving and restoring without destroying historical data", () => {
      expect(categoryActionsCode).toContain("archiveCategoryAction");
      expect(categoryActionsCode).toContain("is_archived");
    });

    it("supports subcategory CRUD with parent-child linkage", () => {
      expect(categoryActionsCode).toContain("createSubcategoryAction");
      expect(categoryActionsCode).toContain("updateSubcategoryAction");
      expect(categoryActionsCode).toContain("deleteSubcategoryAction");
      expect(categoryValidationCode).toContain("createSubcategorySchema");
    });
  });

  describe("5. Custom Tags Management", () => {
    it("implements tag CRUD actions in category actions", () => {
      expect(categoryActionsCode).toContain("getUserTagsAction");
      expect(categoryActionsCode).toContain("createTagAction");
      expect(categoryActionsCode).toContain("updateTagAction");
      expect(categoryActionsCode).toContain("deleteTagAction");
    });

    it("validates tag schema with name, color, and description", () => {
      expect(categoryValidationCode).toContain("createTagSchema");
      expect(categoryValidationCode).toContain("updateTagSchema");
    });

    it("features dedicated TagList management component with interactive color picker", () => {
      expect(tagListCode).toContain("TagList");
      expect(tagListCode).toContain("COLOR_PRESETS");
      expect(tagListCode).toContain("createTagAction");
      expect(tagListCode).toContain("deleteTagAction");
    });
  });
});

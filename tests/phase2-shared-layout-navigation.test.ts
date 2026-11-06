import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Phase 2: Shared Application Layout & Navigation Redesign", () => {
  const sidebarPath = path.resolve(
    process.cwd(),
    "components/layout/app-sidebar.tsx"
  );
  const mobileNavPath = path.resolve(
    process.cwd(),
    "components/layout/mobile-nav.tsx"
  );
  const headerPath = path.resolve(
    process.cwd(),
    "components/layout/app-header.tsx"
  );
  const layoutPath = path.resolve(
    process.cwd(),
    "app/(dashboard)/layout.tsx"
  );

  const sidebarContent = fs.readFileSync(sidebarPath, "utf-8");
  const mobileNavContent = fs.readFileSync(mobileNavPath, "utf-8");
  const headerContent = fs.readFileSync(headerPath, "utf-8");
  const layoutContent = fs.readFileSync(layoutPath, "utf-8");

  describe("Desktop Sidebar 13 Sections & Leftovers Design Language", () => {
    it("contains all 13 primary sections requested by the design specification", () => {
      const requiredSections = [
        "Home",
        "Net Worth",
        "Activity",
        "Accounts",
        "Insights",
        "Plan",
        "Investments",
        "Credit Cards",
        "Loans",
        "Assets",
        "Reports",
        "Automation",
        "Settings",
      ];

      for (const section of requiredSections) {
        expect(sidebarContent).toContain(`title: "${section}"`);
      }
    });

    it("includes collapsible navigation toggle and state management", () => {
      expect(sidebarContent).toContain("isSidebarOpen");
      expect(sidebarContent).toContain("toggleSidebar");
      expect(sidebarContent).toContain("ChevronLeft");
      expect(sidebarContent).toContain("ChevronRight");
    });

    it("includes quick-add action button and global search bar in sidebar", () => {
      expect(sidebarContent).toContain("openQuickTransaction");
      expect(sidebarContent).toContain("Add Transaction");
      expect(sidebarContent).toContain("setCommandMenuOpen");
      expect(sidebarContent).toContain("⌘K");
    });

    it("includes profile menu with user avatar, name, and sign-out", () => {
      expect(sidebarContent).toContain("signOutAction");
      expect(sidebarContent).toContain("Avatar");
      expect(sidebarContent).toContain("Profile & Security");
    });

    it("uses Next.js prefetch={true} for instant client transitions", () => {
      expect(sidebarContent).toContain("prefetch={true}");
    });

    it("implements the Leftovers soft sage active indicator", () => {
      expect(sidebarContent).toContain("bg-surface-secondary");
      expect(sidebarContent).toContain("rounded-r-full bg-primary");
    });
  });

  describe("Mobile Bottom Navigation (4-Tab Destination + FAB)", () => {
    it("configures the 4 primary mobile destinations (Home, Stats, Accounts, Settings)", () => {
      expect(mobileNavContent).toContain('href="/dashboard"');
      expect(mobileNavContent).toContain("<span>Home</span>");
      expect(mobileNavContent).toContain('href="/insights"');
      expect(mobileNavContent).toContain("<span>Stats</span>");
      expect(mobileNavContent).toContain('href="/accounts"');
      expect(mobileNavContent).toContain("<span>Accounts</span>");
      expect(mobileNavContent).toContain('href="/settings"');
      expect(mobileNavContent).toContain("<span>Settings</span>");
    });

    it("includes the central elevated floating action button (FAB) for quick transactions", () => {
      expect(mobileNavContent).toContain("openQuickTransaction");
      expect(mobileNavContent).toContain("Expense");
      expect(mobileNavContent).toContain("Income");
      expect(mobileNavContent).toContain("Transfer");
      expect(mobileNavContent).toContain("-top-4");
    });

    it("incorporates mobile safe area padding (pb-safe)", () => {
      expect(mobileNavContent).toContain("pb-safe");
    });
  });

  describe("Mobile Drawer & Top Header More Menu", () => {
    it("provides the More Navigation drawer giving 1-tap access to all advanced modules", () => {
      const advancedModules = [
        "/net-worth",
        "/accounts",
        "/investments",
        "/assets",
        "/credit-cards",
        "/loans",
        "/recurring",
        "/goals",
        "/categories",
        "/import",
        "/devices",
        "/settings",
        "/profile",
      ];

      for (const route of advancedModules) {
        expect(headerContent).toContain(`href: "${route}"`);
      }
    });

    it("renders clean breadcrumbs, search trigger, theme toggle, and privacy toggle in header", () => {
      expect(headerContent).toContain("routeBreadcrumbMap");
      expect(headerContent).toContain("PrivacyMaskToggle");
      expect(headerContent).toContain("ThemeToggle");
      expect(headerContent).toContain("UserNav");
      expect(headerContent).toContain("⌘K");
    });
  });

  describe("Persistent Application Shell Guarantee", () => {
    it("mounts AppSidebar, AppHeader, and MobileNav within the persistent dashboard layout", () => {
      expect(layoutContent).toContain("<AppSidebar");
      expect(layoutContent).toContain("<AppHeader");
      expect(layoutContent).toContain("<MobileNav");
      expect(layoutContent).toContain("<CommandMenu");
      expect(layoutContent).toContain("<GlobalQuickTransaction");
    });
  });
});


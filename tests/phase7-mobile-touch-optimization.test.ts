import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Phase 7: Mobile Responsiveness & Touch Optimization", () => {
  const globalsCssPath = path.join(process.cwd(), "app/globals.css");
  const layoutPath = path.join(process.cwd(), "app/(dashboard)/layout.tsx");
  const mobileNavPath = path.join(process.cwd(), "components/layout/mobile-nav.tsx");
  const createTxPath = path.join(process.cwd(), "components/transactions/create-transaction-dialog.tsx");

  it("verifies global CSS contains overflow-x: hidden and safe-area inset utilities", () => {
    const css = fs.readFileSync(globalsCssPath, "utf-8");
    expect(css).toContain("overflow-x: hidden");
    expect(css).toContain("pb-safe");
    expect(css).toContain("safe-area-inset-bottom");
  });

  it("verifies main dashboard container prevents horizontal overflow and accommodates mobile bottom nav padding", () => {
    const layout = fs.readFileSync(layoutPath, "utf-8");
    expect(layout).toContain("overflow-x-hidden");
    expect(layout).toContain("pb-24"); // 96px bottom padding to prevent MobileNav overlap
    expect(layout).toContain("<MobileNav />");
  });

  it("verifies MobileNav touch targets meet >= 44px WCAG requirements and uses safe-area padding", () => {
    const nav = fs.readFileSync(mobileNavPath, "utf-8");
    expect(nav).toContain("h-16"); // 64px bar height >= 44px
    expect(nav).toContain("pb-safe");
    // FAB is 48px x 48px
    expect(nav).toContain("h-12 w-12");
  });

  it("verifies keypad button dimensions meet or exceed 44px touch targets", () => {
    const dialog = fs.readFileSync(createTxPath, "utf-8");
    expect(dialog).toContain("h-11 sm:h-12"); // 44px on mobile, 48px on sm+
  });

  it("verifies responsive breakpoint classes across financial views (360px single col up to lg/xl)", () => {
    const netWorthPath = path.join(process.cwd(), "components/net-worth/net-worth-view.tsx");
    const netWorth = fs.readFileSync(netWorthPath, "utf-8");
    expect(netWorth).toContain("grid-cols-1 md:grid-cols-3");
    expect(netWorth).toContain("overflow-x-auto"); // Table scrolls horizontally within card if needed on small screens

    const investPath = path.join(process.cwd(), "components/investments/investment-portfolio-view.tsx");
    const invest = fs.readFileSync(investPath, "utf-8");
    expect(invest).toContain("grid-cols-1 sm:grid-cols-2 lg:grid-cols-4");
    expect(invest).toContain("grid-cols-1 md:grid-cols-2 xl:grid-cols-3");

    const cardsPath = path.join(process.cwd(), "components/credit-cards/credit-card-view.tsx");
    const cards = fs.readFileSync(cardsPath, "utf-8");
    expect(cards).toContain("grid-cols-1 md:grid-cols-2");
  });
});


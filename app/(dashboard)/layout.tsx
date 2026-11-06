import React from "react";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { getCachedProfile, getCachedAccounts, getCachedCategories } from "@/lib/data/cached-queries";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { CommandMenu } from "@/components/layout/command-menu";
import { GlobalQuickTransaction } from "@/components/transactions/global-quick-transaction";
import type { Tables } from "@/types/database";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  // Concurrently fetch profile, accounts, and categories via request-cached queries
  const [profile, accounts, categories] = await Promise.all([
    getCachedProfile(user.id),
    getCachedAccounts(user.id),
    getCachedCategories(user.id),
  ]);

  const userData = {
    email: user.email,
    fullName: profile?.full_name || user.user_metadata?.full_name || "",
    avatarUrl: profile?.avatar_url || user.user_metadata?.avatar_url || "",
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Collapsible Left Sidebar */}
      <AppSidebar user={userData} />

      {/* Main Viewport Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top Sticky Header with Breadcrumbs, Search, Quick Add, and Alerts */}
        <AppHeader user={userData} />

        {/* Dynamic Route Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-8">
          {children}
        </main>

        {/* Mobile Fixed Bottom Navigation with Central Action FAB */}
        <MobileNav />
      </div>

      {/* Universal Command Menu (Cmd+K) */}
      <CommandMenu />

      {/* Global Quick Transaction Modal Controller */}
      <GlobalQuickTransaction accounts={accounts} categories={categories} />
    </div>
  );
}

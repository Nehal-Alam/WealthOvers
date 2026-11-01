import React from "react";
import { redirect } from "next/navigation";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
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

  const supabase = await createClient();

  // Concurrently fetch profile, accounts, and categories for global shell & quick actions
  const [profileResult, accountsResult, categoriesResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("accounts")
      .select("id, name, color, account_type, current_balance, currency, institution_name, is_archived, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("categories")
      .select("id, name, color, icon, type, subcategories(id, name, category_id)")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
  ]);

  const profile = profileResult.data as Pick<Tables<"profiles">, "full_name" | "avatar_url"> | null;
  const accounts = (accountsResult.data || []) as Tables<"accounts">[];
  const categories = (categoriesResult.data || []) as (Tables<"categories"> & {
    subcategories?: Tables<"subcategories">[];
  })[];

  const userData = {
    email: user.email,
    fullName: profile?.full_name || user.user_metadata?.full_name || "",
    avatarUrl: profile?.avatar_url || user.user_metadata?.avatar_url || "",
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Collapsible Left Sidebar */}
      <AppSidebar />

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

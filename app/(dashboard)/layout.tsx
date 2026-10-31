import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { MobileNav } from "@/components/layout/mobile-nav";
import type { Tables } from "@/types/database";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch user profile from public.profiles
  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const profile = profileData as Tables<"profiles"> | null;

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
        {/* Top Sticky Header */}
        <AppHeader user={userData} />

        {/* Dynamic Route Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-8">
          {children}
        </main>

        {/* Mobile Fixed Bottom Navigation */}
        <MobileNav />
      </div>
    </div>
  );
}

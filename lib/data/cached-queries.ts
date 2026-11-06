import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

/**
 * Request-scoped memoized query for active user accounts.
 * Eliminates duplicate PostgREST network calls between DashboardLayout and nested page components.
 */
export const getCachedAccounts = cache(async (userId: string): Promise<Tables<"accounts">[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch cached accounts:", error.message);
    return [];
  }
  return data || [];
});

/**
 * Request-scoped memoized query for user categories and subcategories.
 * Shared across Layout, Quick Action Modal, and Page components.
 */
export const getCachedCategories = cache(
  async (
    userId: string
  ): Promise<(Tables<"categories"> & { subcategories?: Tables<"subcategories">[] })[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, color, icon, type, is_system, subcategories(id, name, category_id)")
      .eq("user_id", userId)
      .order("name", { ascending: true });

    if (error) {
      console.error("Failed to fetch cached categories:", error.message);
      return [];
    }
    return (data as any) || [];
  }
);

/**
 * Request-scoped memoized query for user profile.
 */
export const getCachedProfile = cache(
  async (userId: string): Promise<Pick<Tables<"profiles">, "full_name" | "avatar_url"> | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Failed to fetch cached profile:", error.message);
      return null;
    }
    return data;
  }
);

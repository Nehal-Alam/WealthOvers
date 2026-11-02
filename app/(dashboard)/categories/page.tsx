import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { Tables } from "@/types/database";
import { CategoryList } from "@/components/categories/category-list";
import { CategorizationRulesView } from "@/components/categories/categorization-rules-view";

export const metadata: Metadata = {
  title: "Categories & Rules — WealthOvers",
  description: "Organize categories and configure automated categorization rules",
};

export default async function CategoriesPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();

  // Fetch categories, subcategories, and rules in parallel with explicit column selections
  const [categoriesRes, rulesRes] = await Promise.all([
    supabase
      .from("categories")
      .select("id, user_id, name, color, icon, type, is_system, created_at, updated_at, subcategories(id, category_id, name, created_at, updated_at)")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
    supabase
      .from("categorization_rules")
      .select("id, user_id, keyword_pattern, match_field, target_category_id, target_subcategory_id, priority, created_at, updated_at")
      .eq("user_id", user.id)
      .order("priority", { ascending: false }),
  ]);

  const categories = (categoriesRes.data || []) as any[];
  const rules = rulesRes.data || [];

  return (
    <div className="space-y-8">
      <CategoryList categories={categories} />
      <CategorizationRulesView rules={rules} categories={categories} />
    </div>
  );
}


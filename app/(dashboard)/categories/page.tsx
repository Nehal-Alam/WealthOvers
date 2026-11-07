import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { CategoryList } from "@/components/categories/category-list";
import { TagList } from "@/components/categories/tag-list";
import { CategorizationRulesView } from "@/components/categories/categorization-rules-view";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tables } from "@/types/database";

export const metadata: Metadata = {
  title: "Categories & Tags — WealthOvers",
  description: "Organize custom categories, subcategories, tags and automated classification rules",
};

export default async function CategoriesPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();

  // Fetch categories, subcategories, tags, and rules in parallel
  const [categoriesRes, rulesRes, tagsRes] = await Promise.all([
    supabase
      .from("categories")
      .select("id, user_id, name, color, icon, type, is_system, is_archived, description, display_order, created_at, updated_at, subcategories(id, category_id, name, is_archived, description, display_order, created_at, updated_at)")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
    supabase
      .from("categorization_rules")
      .select("id, user_id, keyword_pattern, match_field, target_category_id, target_subcategory_id, priority, created_at, updated_at")
      .eq("user_id", user.id)
      .order("priority", { ascending: false }),
    supabase
      .from("tags")
      .select("id, user_id, name, color, description, is_archived, created_at, updated_at")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
  ]);

  const categories = (categoriesRes.data || []) as any[];
  const rules = rulesRes.data || [];
  const tags = (tagsRes.data || []) as Tables<"tags">[];

  return (
    <div className="space-y-6">
      <Tabs defaultValue="categories" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="mt-6">
          <CategoryList categories={categories} />
        </TabsContent>

        <TabsContent value="tags" className="mt-6">
          <TagList initialTags={tags} />
        </TabsContent>

        <TabsContent value="rules" className="mt-6">
          <CategorizationRulesView rules={rules} categories={categories} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

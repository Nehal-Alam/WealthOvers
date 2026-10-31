import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Tables } from "@/types/database";
import { CategoryList } from "@/components/categories/category-list";

export const metadata: Metadata = {
  title: "Categories — WealthOvers",
  description: "Organize and configure income and expense categories",
};

export default async function CategoriesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch categories and subcategories
  const { data: categoriesData } = await supabase
    .from("categories")
    .select("*, subcategories(*)")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  const categories = (categoriesData || []) as any[];

  return (
    <div className="space-y-6">
      <CategoryList categories={categories} />
    </div>
  );
}


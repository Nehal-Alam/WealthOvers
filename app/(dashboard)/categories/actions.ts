"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createCategorySchema,
  updateCategorySchema,
  createSubcategorySchema,
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateSubcategoryInput,
} from "@/lib/validations/categories";

export type ActionResult<T = unknown> = {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
};

export async function createCategoryAction(input: CreateCategoryInput): Promise<ActionResult> {
  try {
    const validated = createCategorySchema.parse(input);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const { data, error } = await supabase
      .from("categories")
      .insert({
        user_id: user.id,
        name: validated.name.trim(),
        type: validated.type,
        icon: validated.icon,
        color: validated.color,
        is_system: false,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: "A category with this name and type already exists." };
      }
      return { success: false, error: error.message };
    }

    revalidatePath("/categories");
    revalidatePath("/transactions");
    revalidatePath("/budgets");
    return { success: true, message: "Category created successfully", data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to create category";
    return { success: false, error: errorMsg };
  }
}

export async function updateCategoryAction(input: UpdateCategoryInput): Promise<ActionResult> {
  try {
    const validated = updateCategorySchema.parse(input);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const { data, error } = await supabase
      .from("categories")
      .update({
        name: validated.name.trim(),
        icon: validated.icon,
        color: validated.color,
      })
      .eq("id", validated.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/categories");
    revalidatePath("/transactions");
    return { success: true, message: "Category updated successfully", data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update category";
    return { success: false, error: errorMsg };
  }
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    // Verify it is not a system category
    const { data: category, error: fetchErr } = await supabase
      .from("categories")
      .select("is_system")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchErr || !category) {
      return { success: false, error: "Category not found" };
    }

    if (category.is_system) {
      return { success: false, error: "System default categories cannot be deleted." };
    }

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/categories");
    revalidatePath("/transactions");
    return { success: true, message: "Category deleted successfully" };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to delete category";
    return { success: false, error: errorMsg };
  }
}

export async function createSubcategoryAction(input: CreateSubcategoryInput): Promise<ActionResult> {
  try {
    const validated = createSubcategorySchema.parse(input);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const { data, error } = await supabase
      .from("subcategories")
      .insert({
        user_id: user.id,
        category_id: validated.category_id,
        name: validated.name.trim(),
        icon: validated.icon || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: "Subcategory already exists under this category." };
      }
      return { success: false, error: error.message };
    }

    revalidatePath("/categories");
    return { success: true, message: "Subcategory created successfully", data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to create subcategory";
    return { success: false, error: errorMsg };
  }
}

export async function deleteSubcategoryAction(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const { error } = await supabase
      .from("subcategories")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/categories");
    return { success: true, message: "Subcategory deleted" };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to delete subcategory";
    return { success: false, error: errorMsg };
  }
}


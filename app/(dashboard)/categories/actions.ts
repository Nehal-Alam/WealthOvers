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
import {
  createCategorizationRuleSchema,
  CreateCategorizationRuleInput,
} from "@/lib/validations/rules";
import { matchCategorizationRule } from "@/lib/parsers/rule-matcher";

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

export async function createCategorizationRuleAction(
  input: CreateCategorizationRuleInput
): Promise<ActionResult> {
  try {
    const validated = createCategorizationRuleSchema.parse(input);
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const { error } = await supabase.from("categorization_rules").insert({
      user_id: user.id,
      keyword_pattern: validated.keyword_pattern.trim(),
      match_field: validated.match_field,
      target_category_id: validated.target_category_id,
      target_subcategory_id: validated.target_subcategory_id || null,
      priority: validated.priority,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/categories");
    return { success: true, message: "Categorization rule created successfully" };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create rule" };
  }
}

export async function deleteCategorizationRuleAction(ruleId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const { error } = await supabase
      .from("categorization_rules")
      .delete()
      .eq("id", ruleId)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/categories");
    return { success: true, message: "Rule deleted" };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function applyCategorizationRulesToTransactionsAction(): Promise<ActionResult<{ updatedCount: number }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return { success: false, error: "Unauthorized" };
    }

    // 1. Fetch rules
    const { data: rules } = await supabase
      .from("categorization_rules")
      .select("*")
      .eq("user_id", user.id)
      .order("priority", { ascending: false });

    if (!rules || rules.length === 0) {
      return { success: false, error: "No categorization rules defined yet." };
    }

    // 2. Fetch uncategorized transactions
    const { data: uncategorized } = await supabase
      .from("transactions")
      .select("id, description, reference_number")
      .eq("user_id", user.id)
      .is("category_id", null);

    if (!uncategorized || uncategorized.length === 0) {
      return { success: true, message: "All transactions are already categorized!", data: { updatedCount: 0 } };
    }

    let updatedCount = 0;
    for (const tx of uncategorized) {
      const match = matchCategorizationRule(
        { description: tx.description, referenceNumber: tx.reference_number },
        rules
      );

      if (match) {
        await supabase
          .from("transactions")
          .update({
            category_id: match.target_category_id,
            subcategory_id: match.target_subcategory_id || null,
          })
          .eq("id", tx.id)
          .eq("user_id", user.id);
        updatedCount++;
      }
    }

    revalidatePath("/transactions");
    revalidatePath("/categories");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: `Categorization rules applied: ${updatedCount} transactions categorized!`,
      data: { updatedCount },
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to apply categorization rules" };
  }
}


"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createCategorySchema,
  updateCategorySchema,
  deleteCategorySchema,
  createSubcategorySchema,
  updateSubcategorySchema,
  createTagSchema,
  updateTagSchema,
  CreateCategoryInput,
  UpdateCategoryInput,
  DeleteCategoryInput,
  CreateSubcategoryInput,
  UpdateSubcategoryInput,
  CreateTagInput,
  UpdateTagInput,
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

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function createCategoryAction(input: CreateCategoryInput): Promise<ActionResult> {
  try {
    const validated = createCategorySchema.parse(input);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    // If parent_category_id is provided, create as a subcategory
    if (validated.parent_category_id) {
      const { data: subData, error: subError } = await supabase
        .from("subcategories")
        .insert({
          user_id: user.id,
          category_id: validated.parent_category_id,
          name: validated.name.trim(),
          description: validated.description || null,
          icon: validated.icon || null,
        })
        .select()
        .single();

      if (subError) {
        if (subError.code === "23505") {
          return { success: false, error: "A subcategory with this name already exists under the parent category." };
        }
        return { success: false, error: subError.message };
      }

      revalidatePath("/categories");
      revalidatePath("/transactions");
      return { success: true, message: "Subcategory created successfully", data: subData };
    }

    const { data, error } = await supabase
      .from("categories")
      .insert({
        user_id: user.id,
        name: validated.name.trim(),
        type: validated.type,
        icon: validated.icon,
        color: validated.color,
        description: validated.description || null,
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

    const updatePayload: Record<string, any> = {
      name: validated.name.trim(),
      icon: validated.icon,
      color: validated.color,
    };

    if (validated.description !== undefined) {
      updatePayload.description = validated.description;
    }
    if (validated.is_archived !== undefined) {
      updatePayload.is_archived = validated.is_archived;
    }

    const { data, error } = await supabase
      .from("categories")
      .update(updatePayload)
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

export async function archiveCategoryAction(id: string): Promise<ActionResult> {
  return updateCategoryAction({ id, name: "", icon: "", color: "", is_archived: true } as any);
}

export async function restoreCategoryAction(id: string): Promise<ActionResult> {
  return updateCategoryAction({ id, name: "", icon: "", color: "", is_archived: false } as any);
}

export async function deleteCategoryAction(
  id: string,
  reassignToCategoryId?: string | null
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    // Verify it is not a system category
    const { data: category, error: fetchErr } = await supabase
      .from("categories")
      .select("is_system, name")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchErr || !category) {
      return { success: false, error: "Category not found" };
    }

    if (category.is_system) {
      return { success: false, error: "System default categories cannot be deleted." };
    }

    // If reassign target is provided or reassignment needed:
    if (reassignToCategoryId) {
      const { error: rpcErr } = await supabase.rpc("reassign_category_transactions", {
        p_user_id: user.id,
        p_old_category_id: id,
        p_new_category_id: reassignToCategoryId,
      });

      if (rpcErr) {
        return { success: false, error: `Failed to reassign transactions: ${rpcErr.message}` };
      }
    } else {
      // Reassign transactions to NULL so historical transactions are NEVER deleted
      await supabase
        .from("transactions")
        .update({ category_id: null, subcategory_id: null })
        .eq("category_id", id)
        .eq("user_id", user.id);
    }

    // Delete child subcategories first
    await supabase.from("subcategories").delete().eq("category_id", id).eq("user_id", user.id);

    // Delete the category
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
    revalidatePath("/budgets");
    return { success: true, message: "Category deleted and transactions preserved safely." };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to delete category";
    return { success: false, error: errorMsg };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBCATEGORY ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

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
        description: validated.description || null,
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

export async function updateSubcategoryAction(input: UpdateSubcategoryInput): Promise<ActionResult> {
  try {
    const validated = updateSubcategorySchema.parse(input);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const updatePayload: Record<string, any> = {
      name: validated.name.trim(),
    };
    if (validated.icon !== undefined) updatePayload.icon = validated.icon;
    if (validated.description !== undefined) updatePayload.description = validated.description;
    if (validated.is_archived !== undefined) updatePayload.is_archived = validated.is_archived;

    const { data, error } = await supabase
      .from("subcategories")
      .update(updatePayload)
      .eq("id", validated.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/categories");
    return { success: true, message: "Subcategory updated successfully", data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update subcategory";
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

    // Reassign transactions using this subcategory to null subcategory
    await supabase
      .from("transactions")
      .update({ subcategory_id: null })
      .eq("subcategory_id", id)
      .eq("user_id", user.id);

    const { error } = await supabase
      .from("subcategories")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/categories");
    return { success: true, message: "Subcategory deleted safely" };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to delete subcategory";
    return { success: false, error: errorMsg };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TAGS ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function createTagAction(input: CreateTagInput): Promise<ActionResult> {
  try {
    const validated = createTagSchema.parse(input);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const { data, error } = await supabase
      .from("tags")
      .insert({
        user_id: user.id,
        name: validated.name.trim(),
        color: validated.color || "#376FE5",
        description: validated.description || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: "A tag with this name already exists." };
      }
      return { success: false, error: error.message };
    }

    revalidatePath("/categories");
    revalidatePath("/transactions");
    return { success: true, message: "Tag created successfully", data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to create tag";
    return { success: false, error: errorMsg };
  }
}

export async function updateTagAction(input: UpdateTagInput): Promise<ActionResult> {
  try {
    const validated = updateTagSchema.parse(input);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const updatePayload: Record<string, any> = {
      name: validated.name.trim(),
      color: validated.color,
    };
    if (validated.description !== undefined) updatePayload.description = validated.description;
    if (validated.is_archived !== undefined) updatePayload.is_archived = validated.is_archived;

    const { data, error } = await supabase
      .from("tags")
      .update(updatePayload)
      .eq("id", validated.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/categories");
    revalidatePath("/transactions");
    return { success: true, message: "Tag updated successfully", data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update tag";
    return { success: false, error: errorMsg };
  }
}

export async function deleteTagAction(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const { error } = await supabase
      .from("tags")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/categories");
    revalidatePath("/transactions");
    return { success: true, message: "Tag deleted successfully" };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to delete tag";
    return { success: false, error: errorMsg };
  }
}

export async function getUserTagsAction(): Promise<ActionResult<any[]>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized", data: [] };
    }

    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .eq("user_id", user.id)
      .order("name", { ascending: true });

    if (error) {
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data: data || [] };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch tags";
    return { success: false, error: errorMsg, data: [] };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORIZATION RULES ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

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

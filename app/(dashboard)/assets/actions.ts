"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createAssetSchema,
  createLiabilitySchema,
  CreateAssetInput,
  CreateLiabilityInput,
} from "@/lib/validations/assets";

export type ActionResult<T = unknown> = {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
};

export async function createAssetAction(input: CreateAssetInput): Promise<ActionResult> {
  try {
    const validated = createAssetSchema.parse(input);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const { data, error } = await supabase
      .from("assets")
      .insert({
        user_id: user.id,
        name: validated.name.trim(),
        category: validated.category.trim(),
        purchase_price: parseFloat(validated.purchase_price),
        current_valuation: parseFloat(validated.current_valuation),
        purchase_date: validated.purchase_date || null,
        notes: validated.notes?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/assets");
    revalidatePath("/net-worth");
    return { success: true, message: "Asset added successfully", data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to add asset";
    return { success: false, error: errorMsg };
  }
}

export async function deleteAssetAction(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const { error } = await supabase
      .from("assets")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/assets");
    revalidatePath("/net-worth");
    return { success: true, message: "Asset deleted" };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to delete asset";
    return { success: false, error: errorMsg };
  }
}

export async function createLiabilityAction(input: CreateLiabilityInput): Promise<ActionResult> {
  try {
    const validated = createLiabilitySchema.parse(input);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const { data, error } = await supabase
      .from("liabilities")
      .insert({
        user_id: user.id,
        name: validated.name.trim(),
        category: validated.category.trim(),
        total_amount: parseFloat(validated.total_amount),
        outstanding_amount: parseFloat(validated.outstanding_amount),
        due_date: validated.due_date || null,
        notes: validated.notes?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/assets");
    revalidatePath("/net-worth");
    return { success: true, message: "Liability added successfully", data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to add liability";
    return { success: false, error: errorMsg };
  }
}

export async function deleteLiabilityAction(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const { error } = await supabase
      .from("liabilities")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/assets");
    revalidatePath("/net-worth");
    return { success: true, message: "Liability deleted" };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to delete liability";
    return { success: false, error: errorMsg };
  }
}


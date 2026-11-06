"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createSubscriptionSchema,
  updateSubscriptionStatusSchema,
  deleteSubscriptionSchema,
  CreateSubscriptionInput,
  UpdateSubscriptionStatusInput,
  DeleteSubscriptionInput,
} from "@/lib/validations/subscriptions";

export type ActionResult<T = unknown> = {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
};

export async function createSubscriptionAction(
  input: CreateSubscriptionInput
): Promise<ActionResult> {
  try {
    const validated = createSubscriptionSchema.parse(input);
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const { data, error } = await supabase
      .from("subscriptions")
      .insert({
        user_id: user.id,
        name: validated.name.trim(),
        billing_cycle: validated.billing_cycle,
        cost: validated.cost,
        currency: validated.currency,
        account_id: validated.account_id || null,
        category_id: validated.category_id || null,
        renewal_date: validated.renewal_date,
        cancellation_reminder_days: validated.cancellation_reminder_days,
        status: validated.status,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/subscriptions");
    revalidatePath("/dashboard");
    revalidatePath("/plan");
    return {
      success: true,
      message: "Subscription added successfully",
      data,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to add subscription";
    return { success: false, error: msg };
  }
}

export async function updateSubscriptionStatusAction(
  input: UpdateSubscriptionStatusInput
): Promise<ActionResult> {
  try {
    const validated = updateSubscriptionStatusSchema.parse(input);
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const { error } = await supabase
      .from("subscriptions")
      .update({
        status: validated.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", validated.id)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/subscriptions");
    revalidatePath("/dashboard");
    return { success: true, message: `Subscription marked as ${validated.status}` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update subscription status";
    return { success: false, error: msg };
  }
}

export async function deleteSubscriptionAction(
  input: DeleteSubscriptionInput
): Promise<ActionResult> {
  try {
    const validated = deleteSubscriptionSchema.parse(input);
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const { error } = await supabase
      .from("subscriptions")
      .delete()
      .eq("id", validated.id)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/subscriptions");
    revalidatePath("/dashboard");
    return { success: true, message: "Subscription deleted successfully" };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete subscription";
    return { success: false, error: msg };
  }
}


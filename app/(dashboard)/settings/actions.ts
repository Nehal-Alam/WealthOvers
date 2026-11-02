"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  themePreferenceSchema,
  type ThemePreference,
} from "@/lib/validations/settings";

export type ActionResult<T = unknown> = {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
};

export async function updateThemePreferenceAction(
  theme: ThemePreference
): Promise<ActionResult> {
  try {
    const parseResult = themePreferenceSchema.safeParse(theme);
    if (!parseResult.success) {
      return { success: false, error: "Invalid theme choice." };
    }

    const validatedTheme = parseResult.data;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const { error } = await supabase
      .from("user_settings")
      .update({
        theme_preference: validatedTheme,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return {
      success: true,
      message: `Theme preference saved as ${validatedTheme}`,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to update theme preference";
    return { success: false, error: errorMsg };
  }
}


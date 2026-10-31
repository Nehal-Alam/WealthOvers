"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateDeviceToken, hashDeviceToken } from "@/lib/security/device-auth";
import { registerDeviceSchema, RegisterDeviceInput } from "@/lib/validations/devices";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export type ActionResult<T = unknown> = {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
};

export async function registerDeviceAction(
  input: RegisterDeviceInput
): Promise<ActionResult<{ deviceId: string; deviceToken: string }>> {
  try {
    const validated = registerDeviceSchema.parse(input);
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const { rawToken, tokenHash } = generateDeviceToken();

    const { data: device, error } = await supabase
      .from("devices")
      .insert({
        user_id: user.id,
        device_name: validated.device_name,
        device_model: validated.device_model || null,
        app_version: validated.app_version || "1.0.0",
        device_token_hash: tokenHash,
        status: "active",
      })
      .select("id")
      .single();

    if (error || !device) {
      return { success: false, error: error?.message || "Failed to register companion device" };
    }

    revalidatePath("/devices");
    return {
      success: true,
      message: "Companion device registered successfully",
      data: {
        deviceId: device.id,
        deviceToken: rawToken,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to register device" };
  }
}

export async function revokeDeviceAction(deviceId: string): Promise<ActionResult> {
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
      .from("devices")
      .update({ status: "revoked" })
      .eq("id", deviceId)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/devices");
    return { success: true, message: "Device has been revoked. All synchronization keys invalidated." };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteDeviceAction(deviceId: string): Promise<ActionResult> {
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
      .from("devices")
      .delete()
      .eq("id", deviceId)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/devices");
    return { success: true, message: "Device deleted successfully" };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Simulates a test synchronization payload for a registered device
 */
export async function simulateSyncAction(
  deviceId: string,
  rawToken: string,
  records: any[]
): Promise<ActionResult<any>> {
  try {
    const tokenHash = hashDeviceToken(rawToken);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);

    const batchId = crypto.randomUUID();

    const { data, error } = await supabase.rpc("sync_android_transactions", {
      p_device_id: deviceId,
      p_token_hash: tokenHash,
      p_batch_id: batchId,
      p_records: records,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/devices");
    revalidatePath("/transactions");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: `Sync simulation complete: Ingested ${data.ingested}, Flagged ${data.flaggedForReview}, Duplicates ignored: ${data.duplicatesIgnored}`,
      data,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}


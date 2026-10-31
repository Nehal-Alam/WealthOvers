import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateDeviceToken } from "@/lib/security/device-auth";
import { registerDeviceSchema } from "@/lib/validations/devices";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Active user session required to pair device" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const validated = registerDeviceSchema.parse({
      device_name: body.deviceName || body.device_name || "Android Phone",
      device_model: body.deviceModel || body.device_model || "Android Companion",
      app_version: body.appVersion || body.app_version || "1.0.0",
    });

    const { rawToken, tokenHash } = generateDeviceToken();

    const { data: device, error: insertErr } = await supabase
      .from("devices")
      .insert({
        user_id: user.id,
        device_name: validated.device_name,
        device_model: validated.device_model,
        app_version: validated.app_version,
        device_token_hash: tokenHash,
        status: "active",
      })
      .select("id, created_at")
      .single();

    if (insertErr || !device) {
      return NextResponse.json(
        { success: false, error: insertErr?.message || "Failed to register device" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          deviceId: device.id,
          deviceToken: rawToken,
          registeredAt: device.created_at,
          instructions:
            "Save this deviceToken securely in Android Keystore. It will not be shown again.",
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Invalid registration request" },
      { status: 400 }
    );
  }
}


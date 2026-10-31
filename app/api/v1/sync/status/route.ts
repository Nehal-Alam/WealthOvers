import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch user's registered devices and latest sync logs
    const { data: devices, error: devErr } = await supabase
      .from("devices")
      .select("id, device_name, device_model, app_version, status, last_sync_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const { data: recentLogs, error: logErr } = await supabase
      .from("sync_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (devErr || logErr) {
      return NextResponse.json(
        { success: false, error: devErr?.message || logErr?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        devices: devices || [],
        recentSyncLogs: recentLogs || [],
        totalDevices: devices?.length || 0,
        activeDevices: devices?.filter((d) => d.status === "active").length || 0,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to retrieve sync status" },
      { status: 500 }
    );
  }
}


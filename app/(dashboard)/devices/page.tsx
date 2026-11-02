import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { Tables } from "@/types/database";
import { DevicesView } from "@/components/devices/devices-view";

export const metadata: Metadata = {
  title: "Android Companion Sync — WealthOvers",
  description: "Manage Android companion devices and automated transaction sync",
};

export default async function DevicesPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();

  // Fetch devices and sync logs with explicit column selections
  const [devicesRes, syncLogsRes] = await Promise.all([
    supabase
      .from("devices")
      .select("id, user_id, device_name, device_model, app_version, status, last_sync_at, created_at, updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("sync_logs")
      .select("id, user_id, device_id, sync_status, records_received, records_ingested, records_flagged_for_review, error_message, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const devices = (devicesRes.data || []) as Tables<"devices">[];
  const syncLogs = (syncLogsRes.data || []) as Tables<"sync_logs">[];

  return (
    <div className="space-y-6">
      <DevicesView devices={devices} syncLogs={syncLogs} />
    </div>
  );
}


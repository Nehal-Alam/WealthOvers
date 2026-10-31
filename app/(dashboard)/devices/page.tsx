import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Tables } from "@/types/database";
import { DevicesView } from "@/components/devices/devices-view";

export const metadata: Metadata = {
  title: "Android Companion Sync — WealthOvers",
  description: "Manage Android companion devices and automated transaction sync",
};

export default async function DevicesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [devicesRes, syncLogsRes] = await Promise.all([
    supabase
      .from("devices")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("sync_logs")
      .select("*")
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


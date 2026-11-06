import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { Tables } from "@/types/database";
import { DevicesView } from "@/components/devices/devices-view";

export const metadata: Metadata = {
  title: "Android Companion Sync — WealthOvers",
  description: "Manage Android companion devices, automatic transaction detection, and privacy controls",
};

export default async function DevicesPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();

  // Fetch devices, sync logs, detected transactions, accounts, and categories
  const [devicesRes, syncLogsRes, transactionsRes, accountsRes, categoriesRes] = await Promise.all([
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
    supabase
      .from("transactions")
      .select("id, user_id, account_id, category_id, amount, currency, transaction_type, transaction_date, description, notes, tags, reference_number, source, parser_confidence, is_reviewed, created_at, updated_at")
      .eq("user_id", user.id)
      .order("transaction_date", { ascending: false })
      .limit(50),
    supabase
      .from("accounts")
      .select("id, user_id, name, account_type, currency, current_balance, is_archived, created_at, updated_at")
      .eq("user_id", user.id)
      .eq("is_archived", false),
    supabase
      .from("categories")
      .select("id, user_id, name, type, color, icon, is_system, created_at, updated_at")
      .eq("user_id", user.id),
  ]);

  const devices = (devicesRes.data || []) as Tables<"devices">[];
  const syncLogs = (syncLogsRes.data || []) as Tables<"sync_logs">[];
  const transactions = (transactionsRes.data || []) as Tables<"transactions">[];
  const accounts = (accountsRes.data || []) as unknown as Tables<"accounts">[];
  const categories = (categoriesRes.data || []) as Tables<"categories">[];

  return (
    <div className="space-y-6">
      <DevicesView
        devices={devices}
        syncLogs={syncLogs}
        transactions={transactions}
        accounts={accounts}
        categories={categories}
      />
    </div>
  );
}

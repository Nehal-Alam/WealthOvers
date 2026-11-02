import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { Tables } from "@/types/database";
import { ImportView } from "@/components/import/import-view";

export const metadata: Metadata = {
  title: "Statement Import — WealthOvers",
  description: "Extract transactions from CSV, Excel, and PDF bank statements",
};

export default async function ImportPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();

  // Fetch accounts, categories, and import jobs with explicit column selections
  const [accountsRes, categoriesRes, importJobsRes] = await Promise.all([
    supabase
      .from("accounts")
      .select("id, user_id, name, color, icon, account_type, initial_balance, current_balance, currency, institution_name, account_number_masked, is_archived, created_at, updated_at")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("name", { ascending: true }),
    supabase
      .from("categories")
      .select("id, user_id, name, color, icon, type, is_system, created_at, updated_at")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
    supabase
      .from("import_jobs")
      .select("id, user_id, account_id, file_name, file_format, status, total_parsed, total_imported, total_duplicates, error_log, created_at, updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const accounts = (accountsRes.data || []) as Tables<"accounts">[];
  const categories = (categoriesRes.data || []) as Tables<"categories">[];
  const importJobs = (importJobsRes.data || []) as Tables<"import_jobs">[];

  return (
    <div className="space-y-6">
      <ImportView accounts={accounts} categories={categories} importJobs={importJobs} />
    </div>
  );
}


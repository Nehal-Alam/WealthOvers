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

  const [accountsRes, categoriesRes, importJobsRes] = await Promise.all([
    supabase
      .from("accounts")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
    supabase
      .from("import_jobs")
      .select("*")
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


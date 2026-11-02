import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { Tables } from "@/types/database";
import { AssetsLiabilitiesView } from "@/components/assets/assets-liabilities-view";

export const metadata: Metadata = {
  title: "Assets & Liabilities — WealthOvers",
  description: "Track physical real estate, vehicles, jewelry, and non-bank liabilities",
};

export default async function AssetsPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();

  // Concurrently fetch fixed assets and external liabilities in parallel
  const [assetsResult, liabilitiesResult] = await Promise.all([
    supabase
      .from("assets")
      .select("*")
      .eq("user_id", user.id)
      .order("current_valuation", { ascending: false }),
    supabase
      .from("liabilities")
      .select("*")
      .eq("user_id", user.id)
      .order("outstanding_amount", { ascending: false }),
  ]);

  const assets = (assetsResult.data || []) as Tables<"assets">[];
  const liabilities = (liabilitiesResult.data || []) as Tables<"liabilities">[];

  return (
    <div className="space-y-6">
      <AssetsLiabilitiesView assets={assets} liabilities={liabilities} />
    </div>
  );
}


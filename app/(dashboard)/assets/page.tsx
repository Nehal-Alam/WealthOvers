import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Tables } from "@/types/database";
import { AssetsLiabilitiesView } from "@/components/assets/assets-liabilities-view";

export const metadata: Metadata = {
  title: "Assets & Liabilities — WealthOvers",
  description: "Track physical real estate, vehicles, jewelry, and non-bank liabilities",
};

export default async function AssetsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: assetsData } = await supabase
    .from("assets")
    .select("*")
    .eq("user_id", user.id)
    .order("current_valuation", { ascending: false });

  const { data: liabilitiesData } = await supabase
    .from("liabilities")
    .select("*")
    .eq("user_id", user.id)
    .order("outstanding_amount", { ascending: false });

  const assets = (assetsData || []) as Tables<"assets">[];
  const liabilities = (liabilitiesData || []) as Tables<"liabilities">[];

  return (
    <div className="space-y-6">
      <AssetsLiabilitiesView assets={assets} liabilities={liabilities} />
    </div>
  );
}


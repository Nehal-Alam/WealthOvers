import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { Tables } from "@/types/database";
import { NetWorthView } from "@/components/net-worth/net-worth-view";

export const metadata: Metadata = {
  title: "Net Worth Statement — WealthOvers",
  description: "Consolidated real-time balance sheet and net worth tracking",
};

export default async function NetWorthPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();

  // Parallelize independent asset and liability queries
  const [
    accountsResult,
    investmentsResult,
    assetsResult,
    loansResult,
    liabilitiesResult,
  ] = await Promise.all([
    supabase.from("accounts").select("*").eq("user_id", user.id),
    supabase.from("investments").select("*").eq("user_id", user.id),
    supabase.from("assets").select("*").eq("user_id", user.id),
    supabase.from("loans").select("*").eq("user_id", user.id),
    supabase.from("liabilities").select("*").eq("user_id", user.id),
  ]);

  const accounts = (accountsResult.data || []) as Tables<"accounts">[];
  const investments = (investmentsResult.data || []) as Tables<"investments">[];
  const assets = (assetsResult.data || []) as Tables<"assets">[];
  const loans = (loansResult.data || []) as Tables<"loans">[];
  const liabilities = (liabilitiesResult.data || []) as Tables<"liabilities">[];

  return (
    <div className="space-y-6">
      <NetWorthView
        accounts={accounts}
        investments={investments}
        assets={assets}
        loans={loans}
        liabilities={liabilities}
      />
    </div>
  );
}

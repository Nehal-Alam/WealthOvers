import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Tables } from "@/types/database";
import { NetWorthView } from "@/components/net-worth/net-worth-view";

export const metadata: Metadata = {
  title: "Net Worth Statement — WealthOvers",
  description: "Consolidated real-time balance sheet and net worth tracking",
};

export default async function NetWorthPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch accounts
  const { data: accountsData } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", user.id);

  // Fetch investments
  const { data: investmentsData } = await supabase
    .from("investments")
    .select("*")
    .eq("user_id", user.id);

  // Fetch assets
  const { data: assetsData } = await supabase
    .from("assets")
    .select("*")
    .eq("user_id", user.id);

  // Fetch loans
  const { data: loansData } = await supabase
    .from("loans")
    .select("*")
    .eq("user_id", user.id);

  // Fetch liabilities
  const { data: liabilitiesData } = await supabase
    .from("liabilities")
    .select("*")
    .eq("user_id", user.id);

  const accounts = (accountsData || []) as Tables<"accounts">[];
  const investments = (investmentsData || []) as Tables<"investments">[];
  const assets = (assetsData || []) as Tables<"assets">[];
  const loans = (loansData || []) as Tables<"loans">[];
  const liabilities = (liabilitiesData || []) as Tables<"liabilities">[];

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


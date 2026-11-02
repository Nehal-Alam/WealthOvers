import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { Tables } from "@/types/database";
import { AccountGrid } from "@/components/accounts/account-grid";

export const metadata: Metadata = {
  title: "Accounts — WealthOvers",
  description: "Manage bank accounts, wallets, credit cards, and transfer funds",
};

export default async function AccountsPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();
  const { data: accountsData } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const accounts = (accountsData || []) as Tables<"accounts">[];

  return (
    <div className="space-y-6">
      <AccountGrid accounts={accounts} />
    </div>
  );
}


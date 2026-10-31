import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreditCardView } from "@/components/credit-cards/credit-card-view";

export const metadata: Metadata = {
  title: "Credit Cards — WealthOvers",
  description: "Track credit card limits, utilization ratios, and statement dues",
};

export default async function CreditCardsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch credit cards with statements & account
  const { data: cardsData } = await supabase
    .from("credit_cards")
    .select(
      `
      *,
      account:accounts!credit_cards_account_id_fkey(*),
      statements:credit_card_statements(*)
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Fetch all user accounts
  const { data: accountsData } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  const creditCards = (cardsData || []) as any[];
  const accounts = (accountsData || []) as any[];

  return (
    <div className="space-y-6">
      <CreditCardView creditCards={creditCards} accounts={accounts} />
    </div>
  );
}


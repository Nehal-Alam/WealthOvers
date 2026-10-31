import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { CreditCardView } from "@/components/credit-cards/credit-card-view";

export const metadata: Metadata = {
  title: "Credit Cards — WealthOvers",
  description: "Track credit card limits, utilization ratios, and statement dues",
};

export default async function CreditCardsPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();

  // Parallelize cards and accounts queries
  const [cardsResult, accountsResult] = await Promise.all([
    supabase
      .from("credit_cards")
      .select(
        `
        *,
        account:accounts!credit_cards_account_id_fkey(*),
        statements:credit_card_statements(*)
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),

    supabase
      .from("accounts")
      .select("*")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
  ]);

  const creditCards = (cardsResult.data || []) as any[];
  const accounts = (accountsResult.data || []) as any[];

  return (
    <div className="space-y-6">
      <CreditCardView creditCards={creditCards} accounts={accounts} />
    </div>
  );
}

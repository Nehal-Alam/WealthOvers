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

  // Parallelize cards and accounts queries with explicit column selections
  const [cardsResult, accountsResult] = await Promise.all([
    supabase
      .from("credit_cards")
      .select(
        `
        id, card_name, bank_name, last_four_digits, credit_limit, current_balance, available_credit, billing_cycle_day, payment_due_day, interest_rate_apr, account_id, is_active, created_at,
        account:accounts!credit_cards_account_id_fkey(id, name, color, current_balance, currency),
        statements:credit_card_statements(id, credit_card_id, statement_period_start, statement_period_end, total_due, minimum_due, due_date, is_settled)
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),

    supabase
      .from("accounts")
      .select("id, name, color, current_balance, currency, account_type")
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

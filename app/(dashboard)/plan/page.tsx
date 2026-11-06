import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { Tables } from "@/types/database";
import { BudgetView } from "@/components/budgets/budget-view";
import { GoalsView } from "@/components/goals/goals-view";
import { BillsDashboard } from "@/components/recurring/bills-dashboard";
import { PlanningCalendar, CalendarEventItem } from "@/components/plan/planning-calendar";
import { PlanHeader, PlanTab } from "@/components/plan/plan-header";
import { addMoney, toDecimal } from "@/lib/calculations/financial";
import { format, addMonths } from "date-fns";

export const metadata: Metadata = {
  title: "Financial Planning Hub — WealthOvers",
  description: "Unified spending envelopes, long-term goals, bill commitments, and calendar forecasting",
};

interface PlanPageProps {
  searchParams: Promise<{ tab?: string; period?: string }>;
}

export default async function PlanPage({ searchParams }: PlanPageProps) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const resolvedParams = await searchParams;
  const currentTab = (resolvedParams.tab as PlanTab) || "budgets";

  const supabase = await createClient();

  // Concurrently fetch all planning components in parallel
  const [
    budgetsResult,
    goalsResult,
    recurringResult,
    occurrencesResult,
    accountsResult,
    categoriesResult,
    loansResult,
    creditCardsResult,
    sipsResult,
  ] = await Promise.all([
    supabase
      .from("budgets")
      .select(
        `
        id, name, total_amount, start_date, end_date, rollover_enabled, rollover_mode, rollover_limit,
        period_type, alert_threshold_percent, status, notes, created_at,
        budget_categories:budget_categories(
          id,
          category_id,
          allocated_amount,
          category:categories(id, name, color, icon)
        )
      `
      )
      .eq("user_id", user.id)
      .order("start_date", { ascending: false }),

    supabase
      .from("financial_goals")
      .select(
        `
        id, name, target_amount, current_amount, target_date, category, priority, start_date,
        is_completed, status, planned_contribution_amount, contribution_frequency, notes, created_at,
        contributions:goal_contributions(id, goal_id, amount, contribution_date, notes)
      `
      )
      .eq("user_id", user.id)
      .order("target_date", { ascending: true }),

    supabase
      .from("recurring_transactions")
      .select(
        `
        id, name, amount, currency, recurrence_interval, interval_count, next_occurrence_date,
        start_date, end_date, is_active, auto_record, description, notes, is_variable_amount,
        payment_method, reminder_days_before, is_autopay, status, transaction_type,
        account:accounts(id, name, institution_name),
        category:categories(id, name, color, icon)
      `
      )
      .eq("user_id", user.id)
      .order("next_occurrence_date", { ascending: true }),

    supabase
      .from("bill_occurrences")
      .select(
        `
        id, user_id, recurring_id, due_date, amount, currency, status, paid_date, paid_amount,
        account_id, transaction_id, payment_method, notes,
        recurring:recurring_transactions(id, name, amount, recurrence_interval, category_id, account_id)
      `
      )
      .eq("user_id", user.id)
      .order("due_date", { ascending: true }),

    supabase
      .from("accounts")
      .select("id, name, institution_name, currency, current_balance, is_archived")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("name", { ascending: true }),

    supabase
      .from("categories")
      .select("id, name, color, icon, type")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),

    supabase
      .from("loans")
      .select("id, name, emi_amount, payment_due_day, remaining_balance, status")
      .eq("user_id", user.id)
      .eq("status", "active"),

    supabase
      .from("credit_cards")
      .select("id, name, statement_balance, due_date, min_payment_due, is_active")
      .eq("user_id", user.id)
      .eq("is_active", true),

    supabase
      .from("sip_schedules")
      .select("id, name, amount, deduction_day, next_execution_date, is_active")
      .eq("user_id", user.id)
      .eq("is_active", true),
  ]);

  const rawBudgets = (budgetsResult.data || []) as any[];
  const goals = (goalsResult.data || []) as any[];
  const recurringRules = (recurringResult.data || []) as any[];
  const occurrences = (occurrencesResult.data || []) as any[];
  const accounts = (accountsResult.data || []) as Tables<"accounts">[];
  const categories = (categoriesResult.data || []) as Tables<"categories">[];
  const loans = loansResult.data || [];
  const creditCards = creditCardsResult.data || [];
  const sips = sipsResult.data || [];

  // Calculate upcoming bills total
  let upcomingBillsTotal = "0.00";
  for (const occ of occurrences) {
    if (occ.status === "upcoming" || occ.status === "due" || occ.status === "overdue") {
      upcomingBillsTotal = addMoney(upcomingBillsTotal, occ.amount);
    }
  }

  // Batch-fetch transaction expenses for budgets
  let budgetsWithSpending: any[] = [];
  let periodTransactions: any[] = [];

  if (rawBudgets.length > 0) {
    let minStartDate = rawBudgets[0].start_date;
    let maxEndDate = rawBudgets[0].end_date;
    for (const b of rawBudgets) {
      if (b.start_date < minStartDate) minStartDate = b.start_date;
      if (b.end_date > maxEndDate) maxEndDate = b.end_date;
    }

    const { data: allExpenses } = await supabase
      .from("transactions")
      .select("id, description, amount, category_id, transaction_date, account_id, account:accounts(name)")
      .eq("user_id", user.id)
      .eq("transaction_type", "expense")
      .gte("transaction_date", minStartDate)
      .lte("transaction_date", `${maxEndDate}T23:59:59.999Z`)
      .order("transaction_date", { ascending: false });

    periodTransactions = allExpenses || [];

    budgetsWithSpending = rawBudgets.map((b) => {
      const spentByCategory: Record<string, string> = {};
      let totalSpent = "0.0000";
      const bEnd = `${b.end_date}T23:59:59.999Z`;

      for (const t of periodTransactions) {
        if (t.transaction_date >= b.start_date && t.transaction_date <= bEnd) {
          totalSpent = addMoney(totalSpent, t.amount);
          if (t.category_id) {
            spentByCategory[t.category_id] = addMoney(
              spentByCategory[t.category_id] || "0.0000",
              t.amount
            );
          }
        }
      }

      return {
        ...b,
        spentByCategory,
        totalSpent,
      };
    });
  }

  // Aggregate Calendar Events across all financial plans
  const calendarEvents: CalendarEventItem[] = [];

  // 1. Bill occurrences
  for (const occ of occurrences) {
    calendarEvents.push({
      id: `bill-occ-${occ.id}`,
      type: "bill",
      title: occ.recurring?.name || "Bill Payment",
      amount: occ.amount,
      date: occ.due_date,
      status: occ.status,
      sourceRecord: occ.recurring,
    });
  }

  // If occurrences are few, include recurring rules next occurrence dates
  if (occurrences.length === 0) {
    for (const rule of recurringRules) {
      if (!rule.is_active || rule.transaction_type === "income") continue;
      calendarEvents.push({
        id: `recurring-rule-${rule.id}`,
        type: "bill",
        title: rule.name,
        amount: rule.amount,
        date: rule.next_occurrence_date,
        status: "upcoming",
        sourceRecord: rule,
      });
    }
  }

  // 2. Loan EMIs
  const today = new Date();
  const currentMonthYear = format(today, "yyyy-MM");
  for (const loan of loans) {
    if (loan.emi_amount && loan.payment_due_day) {
      const dayStr = String(loan.payment_due_day).padStart(2, "0");
      calendarEvents.push({
        id: `loan-emi-${loan.id}`,
        type: "loan_emi",
        title: `${loan.name} EMI`,
        amount: loan.emi_amount,
        date: `${currentMonthYear}-${dayStr}`,
        status: "upcoming",
      });
    }
  }

  // 3. Credit Card Payment Dues
  for (const cc of creditCards) {
    if (cc.due_date && cc.statement_balance && parseFloat(cc.statement_balance.toString()) > 0) {
      calendarEvents.push({
        id: `cc-due-${cc.id}`,
        type: "credit_card",
        title: `${cc.name} Payment`,
        amount: cc.statement_balance,
        date: cc.due_date,
        status: "due",
      });
    }
  }

  // 4. SIP Investments
  for (const sip of sips) {
    const sipDate = sip.next_execution_date || `${currentMonthYear}-${String(sip.deduction_day || 5).padStart(2, "0")}`;
    calendarEvents.push({
      id: `sip-${sip.id}`,
      type: "sip",
      title: `SIP: ${sip.name}`,
      amount: sip.amount,
      date: sipDate,
      status: "upcoming",
    });
  }

  // 5. Goal Milestones
  for (const goal of goals) {
    if (goal.target_date && !goal.is_completed) {
      calendarEvents.push({
        id: `goal-${goal.id}`,
        type: "goal",
        title: `Target: ${goal.name}`,
        amount: goal.target_amount,
        date: goal.target_date,
        status: "upcoming",
      });
    }
  }

  // Render active tab
  return (
    <div className="space-y-6">
      {currentTab === "budgets" && (
        <BudgetView
          budgets={budgetsWithSpending}
          categories={categories}
          accounts={accounts}
          transactions={periodTransactions}
          upcomingBillsTotal={upcomingBillsTotal}
        />
      )}

      {currentTab === "goals" && (
        <GoalsView goals={goals} accounts={accounts} />
      )}

      {currentTab === "recurring" && (
        <BillsDashboard
          recurringRules={recurringRules}
          occurrences={occurrences}
          accounts={accounts}
          categories={categories}
        />
      )}

      {currentTab === "calendar" && (
        <div className="space-y-6">
          <PlanHeader activeTab="calendar" />
          <PlanningCalendar
            events={calendarEvents}
            accounts={accounts}
          />
        </div>
      )}

      {currentTab === "reports" && (
        <div className="space-y-6">
          <PlanHeader activeTab="reports" />
          <BudgetView
            budgets={budgetsWithSpending}
            categories={categories}
            accounts={accounts}
            transactions={periodTransactions}
            upcomingBillsTotal={upcomingBillsTotal}
          />
        </div>
      )}
    </div>
  );
}

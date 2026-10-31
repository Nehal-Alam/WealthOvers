import { differenceInDays, parseISO } from "date-fns";
import { RecurringPatternCandidate } from "./types";

interface SimpleTransaction {
  id?: string;
  description: string;
  amount: number;
  transaction_date: string;
  transaction_type: "income" | "expense" | string;
  category_id?: string | null;
  reference_number?: string | null;
}

/**
 * Normalizes description to clean merchant/purpose name
 */
export function cleanMerchantName(description: string): string {
  if (!description) return "Unknown";

  return description
    .replace(/(?:UPI|NEFT|RTGS|IMPS|POS|ACH|NACH|BILLDESK|PAYTM|RAZORPAY)[/: -]+/gi, " ")
    .replace(/[0-9]{6,}/g, "") // remove long reference numbers
    .replace(/@\w+/g, "") // remove UPI handles like @okhdfcbank
    .replace(/[#*_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Detects recurring transaction patterns from historical transaction list
 */
export function detectRecurringPatterns(
  transactions: SimpleTransaction[]
): RecurringPatternCandidate[] {
  if (!transactions || transactions.length < 2) return [];

  // 1. Group by clean lowercase identifier + transaction type
  const groups: Map<string, SimpleTransaction[]> = new Map();

  for (const t of transactions) {
    const cleanName = cleanMerchantName(t.description).toLowerCase();
    // Ignore extremely short or generic names like "transfer"
    if (cleanName.length < 3) continue;

    const groupKey = `${cleanName}:${t.transaction_type}`;
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(t);
  }

  const candidates: RecurringPatternCandidate[] = [];

  for (const [key, txns] of groups.entries()) {
    if (txns.length < 2) continue;

    // Sort chronologically ascending
    const sorted = [...txns].sort((a, b) =>
      a.transaction_date.localeCompare(b.transaction_date)
    );

    // Compute intervals in days between consecutive occurrences
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const prevDate = parseISO(sorted[i - 1].transaction_date);
      const currDate = parseISO(sorted[i].transaction_date);
      const diff = Math.abs(differenceInDays(currDate, prevDate));
      if (diff > 0) {
        intervals.push(diff);
      }
    }

    if (intervals.length === 0) continue;

    // Average interval
    const avgInterval = intervals.reduce((acc, val) => acc + val, 0) / intervals.length;

    // Match interval pattern
    let intervalType: "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "half_yearly" | "yearly" | null = null;
    let baseConfidence = 0.8;

    if (avgInterval >= 6 && avgInterval <= 8) {
      intervalType = "weekly";
      baseConfidence = 0.9;
    } else if (avgInterval >= 12 && avgInterval <= 16) {
      intervalType = "biweekly";
      baseConfidence = 0.85;
    } else if (avgInterval >= 26 && avgInterval <= 33) {
      intervalType = "monthly";
      baseConfidence = 0.95;
    } else if (avgInterval >= 85 && avgInterval <= 95) {
      intervalType = "quarterly";
      baseConfidence = 0.85;
    } else if (avgInterval >= 170 && avgInterval <= 190) {
      intervalType = "half_yearly";
      baseConfidence = 0.85;
    } else if (avgInterval >= 350 && avgInterval <= 375) {
      intervalType = "yearly";
      baseConfidence = 0.9;
    }

    if (!intervalType) continue;

    // Amount consistency check: compute average amount
    const amounts = sorted.map((t) => Number(t.amount));
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const maxDev = Math.max(...amounts.map((a) => Math.abs(a - avgAmount)));
    const devRatio = avgAmount > 0 ? maxDev / avgAmount : 1;

    // Reject if amount varies by more than 25% (unless utility bills)
    if (devRatio > 0.25) continue;

    // Exact amount matches boost confidence
    const amountConfidence = devRatio === 0 ? 0.05 : 0;
    const finalConfidence = Math.min(0.99, baseConfidence + amountConfidence);

    const displayName = cleanMerchantName(sorted[0].description);

    candidates.push({
      name: displayName,
      merchantName: displayName,
      amount: Math.round(avgAmount * 100) / 100,
      transactionType: sorted[0].transaction_type === "income" ? "income" : "expense",
      recurrenceInterval: intervalType,
      intervalCount: 1,
      confidence: Math.round(finalConfidence * 100) / 100,
      suggestedCategoryId: sorted[0].category_id || null,
      sampleOccurrences: sorted.slice(-3).map((s) => ({
        date: s.transaction_date,
        amount: Number(s.amount),
        referenceNumber: s.reference_number,
      })),
    });
  }

  // Sort descending by confidence then number of occurrences
  return candidates.sort((a, b) => b.confidence - a.confidence);
}


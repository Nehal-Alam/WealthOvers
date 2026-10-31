import { ParsedTransactionRow } from "./types";
import { Tables } from "@/types/database";

export type CategorizationRule = Tables<"categorization_rules">;

/**
 * Matches a keyword pattern (case-insensitive substring or regex) against a candidate string
 */
export function matchesKeyword(pattern: string, text: string): boolean {
  if (!pattern || !text) return false;
  const cleanPattern = pattern.trim().toLowerCase();
  const cleanText = text.trim().toLowerCase();

  // If pattern contains regex special pipes/wildcards like "swiggy|zomato" or "uber.*ride"
  if (/[|.*+?^${}()[\]\\]/.test(cleanPattern)) {
    try {
      const regex = new RegExp(cleanPattern, "i");
      return regex.test(cleanText);
    } catch {
      // Fallback to substring matching if regex syntax is invalid
      return cleanText.includes(cleanPattern);
    }
  }

  return cleanText.includes(cleanPattern);
}

/**
 * Finds the highest priority matching rule for a transaction
 */
export function matchCategorizationRule(
  transaction: {
    description: string;
    merchant?: string | null;
    referenceNumber?: string | null;
  },
  rules: CategorizationRule[]
): CategorizationRule | null {
  // Sort rules descending by priority (highest priority first)
  const sorted = [...rules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  for (const rule of sorted) {
    let targetText = transaction.description;

    if (rule.match_field === "merchant") {
      targetText = transaction.merchant || transaction.description;
    } else if (rule.match_field === "reference") {
      targetText = transaction.referenceNumber || "";
    }

    if (matchesKeyword(rule.keyword_pattern, targetText)) {
      return rule;
    }
  }

  return null;
}

/**
 * Applies categorization rules to a list of parsed transaction rows in-place
 */
export function applyCategorizationRules(
  transactions: ParsedTransactionRow[],
  rules: CategorizationRule[]
): ParsedTransactionRow[] {
  if (!rules || rules.length === 0) return transactions;

  return transactions.map((row) => {
    const matched = matchCategorizationRule(
      {
        description: row.description,
        referenceNumber: row.referenceNumber,
      },
      rules
    );

    if (matched) {
      return {
        ...row,
        categorySuggestionId: matched.target_category_id,
        subcategorySuggestionId: matched.target_subcategory_id,
      };
    }

    return row;
  });
}


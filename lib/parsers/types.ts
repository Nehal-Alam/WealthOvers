export interface ParsedTransactionRow {
  transactionDate: string; // ISO YYYY-MM-DD
  description: string;
  amount: number;
  transactionType: "income" | "expense";
  referenceNumber?: string | null;
  balance?: number | null;
  categorySuggestionId?: string | null;
  subcategorySuggestionId?: string | null;
  idempotencyHash?: string;
  isDuplicate?: boolean;
  parserConfidence: number; // 0.0 to 1.0
  rawRow?: Record<string, string | number>;
}

export interface StatementParseResult {
  fileName: string;
  fileFormat: "csv" | "xlsx" | "pdf";
  totalRows: number;
  validRows: ParsedTransactionRow[];
  detectedColumns?: string[];
  skippedRows: number;
  error?: string;
}

export interface DuplicateDetectionResult {
  uniqueTransactions: ParsedTransactionRow[];
  duplicateCount: number;
  existingHashCount: number;
}

export interface RecurringPatternCandidate {
  name: string;
  merchantName: string;
  amount: number;
  transactionType: "income" | "expense";
  recurrenceInterval: "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "half_yearly" | "yearly";
  intervalCount: number;
  confidence: number; // 0.0 to 1.0
  sampleOccurrences: {
    date: string;
    amount: number;
    referenceNumber?: string | null;
  }[];
  suggestedCategoryId?: string | null;
}


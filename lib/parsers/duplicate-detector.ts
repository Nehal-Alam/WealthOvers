import crypto from "crypto";
import { ParsedTransactionRow, DuplicateDetectionResult } from "./types";

export interface HashPayload {
  userId: string;
  accountId?: string | null;
  amount: number | string;
  transactionDate: string; // YYYY-MM-DD
  referenceNumber?: string | null;
  description?: string | null;
}

/**
 * Normalizes description to extract alphanumeric core keywords for deduplication
 */
export function normalizeDescriptionForHash(desc?: string | null): string {
  if (!desc) return "";
  return desc
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 40);
}

/**
 * Generates deterministic SHA-256 hash for transaction idempotency and duplicate detection
 */
export function generateTransactionIdempotencyHash(payload: HashPayload): string {
  const normDate = payload.transactionDate.slice(0, 10);
  const normAmt = Number(payload.amount).toFixed(2);
  const identifier = payload.referenceNumber?.trim()
    ? payload.referenceNumber.trim().toLowerCase()
    : normalizeDescriptionForHash(payload.description);

  const rawKey = `${payload.userId}:${payload.accountId || "generic"}:${normAmt}:${normDate}:${identifier}`;

  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

/**
 * Filters parsed transaction rows against a set of known existing idempotency hashes
 */
export function filterDuplicates(
  transactions: ParsedTransactionRow[],
  userId: string,
  accountId: string,
  existingHashes: Set<string>
): DuplicateDetectionResult {
  const uniqueTransactions: ParsedTransactionRow[] = [];
  let duplicateCount = 0;

  for (const row of transactions) {
    const hash = generateTransactionIdempotencyHash({
      userId,
      accountId,
      amount: row.amount,
      transactionDate: row.transactionDate,
      referenceNumber: row.referenceNumber,
      description: row.description,
    });

    row.idempotencyHash = hash;

    if (existingHashes.has(hash)) {
      row.isDuplicate = true;
      duplicateCount++;
    } else {
      row.isDuplicate = false;
      uniqueTransactions.push(row);
      // Add to set to also catch duplicates within the same file!
      existingHashes.add(hash);
    }
  }

  return {
    uniqueTransactions,
    duplicateCount,
    existingHashCount: existingHashes.size,
  };
}


import crypto from "crypto";

export interface SyncRecordPayload {
  externalId: string;
  amount: number | string;
  transactionType: "income" | "expense" | "transfer";
  merchant?: string | null;
  description?: string | null;
  accountIdentifier?: string | null; // e.g. "4321" (last 4 digits)
  timestamp: string; // ISO 8601
  referenceNumber?: string | null;
  sourceApplication?: string | null;
  parserConfidence: number; // 0.0 to 1.0
  idempotencyHash?: string | null;
}

export interface SyncBatchRequest {
  syncBatchId: string;
  records: SyncRecordPayload[];
}

export interface DeviceTokenResult {
  rawToken: string;
  tokenHash: string;
}

/**
 * Generates a high-entropy device token for Android companion pairing
 * Format: wov_dev_<32-hex-bytes>
 */
export function generateDeviceToken(): DeviceTokenResult {
  const randomBytes = crypto.randomBytes(32).toString("hex");
  const rawToken = `wov_dev_${randomBytes}`;
  const tokenHash = hashDeviceToken(rawToken);
  return { rawToken, tokenHash };
}

/**
 * Computes SHA-256 hash of device token for secure storage
 */
export function hashDeviceToken(token: string): string {
  return crypto.createHash("sha256").update(token.trim()).digest("hex");
}

/**
 * Blacklist regex for OTPs, authentication secrets, and non-financial noise
 */
const SENSITIVE_CONTENT_REGEX =
  /\b(otp|one[- ]time[- ]password|verification code|auth code|security code|secret code|login pin|do not share|never share|password reset|verify your account|kyc pending)\b/i;

/**
 * Validates that an incoming Android record is strictly parsed financial metadata,
 * rejecting any raw SMS messages, OTPs, or invalid data types.
 */
export function validateFinancialRecord(record: SyncRecordPayload): {
  isValid: boolean;
  error?: string;
} {
  if (!record) {
    return { isValid: false, error: "Empty record payload" };
  }

  // 1. Zero-Trust check: Detect any sensitive OTPs or security codes
  const combinedText = [
    record.merchant || "",
    record.description || "",
    record.externalId || "",
    record.referenceNumber || "",
  ].join(" ");

  if (SENSITIVE_CONTENT_REGEX.test(combinedText)) {
    return {
      isValid: false,
      error:
        "Security Policy Violation: Raw SMS or OTP detected. Android sync only accepts sanitized, parsed financial transaction metadata.",
    };
  }

  // 2. Validate financial amount
  const numAmt = Number(record.amount);
  if (isNaN(numAmt) || numAmt <= 0) {
    return { isValid: false, error: "Transaction amount must be a positive number" };
  }

  // 3. Validate transaction type
  if (!["expense", "income", "transfer"].includes(record.transactionType)) {
    return { isValid: false, error: "Invalid transaction type" };
  }

  // 4. Validate timestamp
  const dateObj = new Date(record.timestamp);
  if (isNaN(dateObj.getTime())) {
    return { isValid: false, error: "Invalid ISO timestamp format" };
  }

  // 5. Validate parser confidence
  if (typeof record.parserConfidence !== "number" || record.parserConfidence < 0 || record.parserConfidence > 1) {
    return { isValid: false, error: "Parser confidence must be between 0.0 and 1.0" };
  }

  return { isValid: true };
}


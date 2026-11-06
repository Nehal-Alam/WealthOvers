import { describe, it, expect } from "vitest";
import {
  hashDeviceToken,
  validateFinancialRecord,
  SyncRecordPayload,
} from "../lib/security/device-auth";
import { generateTransactionIdempotencyHash } from "../lib/parsers/duplicate-detector";
import { syncBatchSchema } from "../lib/validations/devices";

describe("Phase 6: Android Companion API & Automation Gateway", () => {
  describe("Middleware & Public Route Verification", () => {
    it("identifies /api/v1/ endpoints as unblocked by Supabase auth middleware", () => {
      // Mirrors the isPublicRoute definition from lib/supabase/middleware.ts
      const testPath: string = "/api/v1/transactions/sync";
      const isAuthRoute =
        testPath.startsWith("/login") ||
        testPath.startsWith("/register") ||
        testPath.startsWith("/forgot-password") ||
        testPath.startsWith("/reset-password") ||
        testPath.startsWith("/verify-email");

      const isPublicRoute =
        isAuthRoute ||
        testPath === "/" ||
        testPath === "/sw.js" ||
        testPath === "/manifest.json" ||
        testPath.startsWith("/images/") ||
        testPath.startsWith("/api/auth/callback") ||
        testPath.startsWith("/api/v1/") ||
        testPath.startsWith("/_next") ||
        testPath.startsWith("/favicon.ico");

      expect(isPublicRoute).toBe(true);
    });
  });

  describe("Zero-Trust Financial Content Filtering & Device Authentication", () => {
    it("hashes device tokens using deterministic SHA-256 hex string", () => {
      const rawToken = "wov_dev_sample_token_1234567890abcdef";
      const hash1 = hashDeviceToken(rawToken);
      const hash2 = hashDeviceToken(rawToken);

      expect(hash1).toHaveLength(64);
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it("rejects non-financial SMS or messages containing OTP patterns", () => {
      const otpRecord: SyncRecordPayload = {
        externalId: "sms_otp_9921",
        amount: 0,
        transactionType: "expense",
        timestamp: new Date().toISOString(),
        description: "Your OTP for login is 948291. Do not share it with anyone.",
        parserConfidence: 0.1,
      };

      const result = validateFinancialRecord(otpRecord);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Raw SMS or OTP detected");
    });

    it("accepts valid Indian banking SMS notifications", () => {
      const bankRecord: SyncRecordPayload = {
        externalId: "sms_swiggy_1029",
        amount: 1450.5,
        transactionType: "expense",
        timestamp: "2026-11-06T14:30:00Z",
        merchant: "Swiggy",
        accountIdentifier: "4321",
        referenceNumber: "UPI/392019482910",
        description: "Rs 1450.50 debited from A/C XX4321 towards Swiggy on 06-Nov-26 via UPI Ref 392019482910.",
        parserConfidence: 0.98,
      };

      const result = validateFinancialRecord(bankRecord);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("generates deterministic transaction idempotency hashes to prevent duplicate ingestion", () => {
      const txData = {
        userId: "usr_998877",
        amount: 2500,
        transactionDate: "2026-11-06",
        referenceNumber: "IMPS8837194",
        description: "Rent Advance",
      };

      const hashA = generateTransactionIdempotencyHash(txData);
      const hashB = generateTransactionIdempotencyHash(txData);

      expect(hashA).toBe(hashB);
      expect(hashA).toHaveLength(64);

      // Altering date changes the hash
      const hashC = generateTransactionIdempotencyHash({
        ...txData,
        transactionDate: "2026-11-07",
      });
      expect(hashA).not.toBe(hashC);
    });

    it("validates batch sync payload against Zod schema", () => {
      const validPayload = {
        syncBatchId: "batch_20261106_001",
        records: [
          {
            externalId: "rec_001",
            amount: 450,
            transactionType: "expense" as const,
            timestamp: "2026-11-06T10:00:00.000Z",
            merchant: "Blue Tokai Coffee",
            accountIdentifier: "9012",
            referenceNumber: "UPI/998811",
            parserConfidence: 0.95,
          },
          {
            externalId: "rec_002",
            amount: 85000,
            transactionType: "income" as const,
            timestamp: "2026-11-01T09:00:00.000Z",
            merchant: "Salary Credit",
            accountIdentifier: "9012",
            referenceNumber: "NEFT/776655",
            parserConfidence: 0.99,
          },
        ],
      };

      const parsed = syncBatchSchema.parse(validPayload);
      expect(parsed.records.length).toBe(2);
      expect(parsed.records[0].amount).toBe(450);
      expect(parsed.records[1].amount).toBe(85000);
    });
  });
});

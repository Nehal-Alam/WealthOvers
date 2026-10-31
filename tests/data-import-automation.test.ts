import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parseCSVBankStatement, normalizeBankDate, cleanCurrencyAmount } from "../lib/parsers/csv-parser";
import { parseExcelBankStatement } from "../lib/parsers/excel-parser";
import {
  generateTransactionIdempotencyHash,
  filterDuplicates,
} from "../lib/parsers/duplicate-detector";
import {
  matchCategorizationRule,
  applyCategorizationRules,
} from "../lib/parsers/rule-matcher";
import { detectRecurringPatterns } from "../lib/parsers/recurring-detector";
import {
  generateDeviceToken,
  hashDeviceToken,
  validateFinancialRecord,
  SyncRecordPayload,
} from "../lib/security/device-auth";
import { ParsedTransactionRow } from "../lib/parsers/types";

describe("Data Import & Automation Engine", () => {
  describe("CSV Bank Statement Parser", () => {
    it("parses standard Indian bank statement CSV with Debit and Credit columns", () => {
      const csvData = `Date,Narration,Chq/Ref No,Withdrawal Amt,Deposit Amt,Closing Balance
15/10/2026,UPI-SWIGGY-12345,UPI/1029384,380.00,,12450.00
16/10/2026,SALARY CREDIT INFOSYS,NEFT/883921,,85000.00,97450.00
18/10/2026,AMAZON PAY INDIA,AMZ99281,1299.50,,96150.50`;

      const result = parseCSVBankStatement(csvData, "hdfc_oct.csv");
      expect(result.validRows.length).toBe(3);
      expect(result.skippedRows).toBe(1); // header

      // Transaction 1: Expense
      expect(result.validRows[0].transactionDate).toBe("2026-10-15");
      expect(result.validRows[0].description).toBe("UPI-SWIGGY-12345");
      expect(result.validRows[0].amount).toBe(380);
      expect(result.validRows[0].transactionType).toBe("expense");
      expect(result.validRows[0].referenceNumber).toBe("UPI/1029384");

      // Transaction 2: Income
      expect(result.validRows[1].transactionDate).toBe("2026-10-16");
      expect(result.validRows[1].description).toBe("SALARY CREDIT INFOSYS");
      expect(result.validRows[1].amount).toBe(85000);
      expect(result.validRows[1].transactionType).toBe("income");

      // Transaction 3: Expense
      expect(result.validRows[2].amount).toBe(1299.5);
      expect(result.validRows[2].transactionType).toBe("expense");
    });

    it("handles varied date formats and currency symbols", () => {
      expect(normalizeBankDate("15-Oct-2026")).toBe("2026-10-15");
      expect(normalizeBankDate("2026-10-15")).toBe("2026-10-15");
      expect(normalizeBankDate("15/10/2026")).toBe("2026-10-15");
      expect(cleanCurrencyAmount("₹ 1,450.50")).toBe(1450.5);
      expect(cleanCurrencyAmount(" - ")).toBe(0);
    });
  });

  describe("Excel (.xlsx) Statement Parser", () => {
    it("parses multi-column spreadsheet workbook", () => {
      // Create a test workbook in memory
      const wb = XLSX.utils.book_new();
      const wsData = [
        ["Txn Date", "Description", "Ref No", "Debit", "Credit", "Balance"],
        ["2026-10-01", "Netflix Subscription", "SUB99", "649.00", "", "15000.00"],
        ["2026-10-05", "Client Dividend", "DIV44", "", "3500.00", "18500.00"],
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, "Statement");
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      const result = parseExcelBankStatement(buffer, "test_statement.xlsx");
      expect(result.validRows.length).toBe(2);
      expect(result.validRows[0].description).toBe("Netflix Subscription");
      expect(result.validRows[0].amount).toBe(649);
      expect(result.validRows[0].transactionType).toBe("expense");
      expect(result.validRows[1].amount).toBe(3500);
      expect(result.validRows[1].transactionType).toBe("income");
    });
  });

  describe("Idempotency Hashing & Duplicate Detection", () => {
    it("generates deterministic SHA-256 idempotency hash", () => {
      const hash1 = generateTransactionIdempotencyHash({
        userId: "user-123",
        accountId: "acc-456",
        amount: "450.00",
        transactionDate: "2026-10-15",
        referenceNumber: "UPI12345",
      });

      const hash2 = generateTransactionIdempotencyHash({
        userId: "user-123",
        accountId: "acc-456",
        amount: 450,
        transactionDate: "2026-10-15T08:30:00Z",
        referenceNumber: "UPI12345",
      });

      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64);
    });

    it("filters duplicates against existing hash database and within same batch", () => {
      const existingHashes = new Set(["existing_hash_aaa"]);

      const rows: ParsedTransactionRow[] = [
        {
          transactionDate: "2026-10-15",
          description: "Unique Purchase",
          amount: 500,
          transactionType: "expense",
          referenceNumber: "REF_NEW_1",
          parserConfidence: 0.95,
        },
        {
          transactionDate: "2026-10-15",
          description: "Unique Purchase",
          amount: 500,
          transactionType: "expense",
          referenceNumber: "REF_NEW_1", // Same details => duplicate in batch
          parserConfidence: 0.95,
        },
      ];

      const res = filterDuplicates(rows, "user-1", "acc-1", existingHashes);
      expect(res.uniqueTransactions.length).toBe(1);
      expect(res.duplicateCount).toBe(1);
      expect(res.uniqueTransactions[0].isDuplicate).toBe(false);
    });
  });

  describe("Categorization Rules Engine", () => {
    it("matches keyword rules respecting priority hierarchy", () => {
      const mockRules: any[] = [
        {
          id: "rule-food",
          keyword_pattern: "swiggy|zomato",
          match_field: "description",
          target_category_id: "cat-food-id",
          target_subcategory_id: "subcat-delivery-id",
          priority: 20,
        },
        {
          id: "rule-generic-online",
          keyword_pattern: "swiggy",
          match_field: "description",
          target_category_id: "cat-other-id",
          priority: 5,
        },
      ];

      const matched = matchCategorizationRule(
        { description: "UPI-SWIGGY-BANGALORE-ORDER#123" },
        mockRules
      );

      expect(matched).not.toBeNull();
      // Should pick rule-food because priority 20 > 5
      expect(matched?.id).toBe("rule-food");
      expect(matched?.target_category_id).toBe("cat-food-id");
      expect(matched?.target_subcategory_id).toBe("subcat-delivery-id");
    });

    it("auto-applies categorization rules to parsed transactions", () => {
      const rows: ParsedTransactionRow[] = [
        {
          transactionDate: "2026-10-15",
          description: "Netflix Monthly Subscription",
          amount: 649,
          transactionType: "expense",
          parserConfidence: 0.95,
        },
        {
          transactionDate: "2026-10-16",
          description: "Random Unknown Shop",
          amount: 100,
          transactionType: "expense",
          parserConfidence: 0.95,
        },
      ];

      const rules: any[] = [
        {
          id: "r1",
          keyword_pattern: "netflix",
          match_field: "description",
          target_category_id: "cat-entertainment",
          priority: 10,
        },
      ];

      const result = applyCategorizationRules(rows, rules);
      expect(result[0].categorySuggestionId).toBe("cat-entertainment");
      expect(result[1].categorySuggestionId).toBeUndefined();
    });
  });

  describe("Recurring Pattern Detection Engine", () => {
    it("detects monthly subscription from periodic historical transactions", () => {
      const history = [
        {
          description: "Netflix.com Digital",
          amount: 649,
          transaction_date: "2026-07-15",
          transaction_type: "expense",
        },
        {
          description: "Netflix.com Digital",
          amount: 649,
          transaction_date: "2026-08-15",
          transaction_type: "expense",
        },
        {
          description: "Netflix.com Digital",
          amount: 649,
          transaction_date: "2026-09-15",
          transaction_type: "expense",
        },
        {
          description: "Netflix.com Digital",
          amount: 649,
          transaction_date: "2026-10-15",
          transaction_type: "expense",
        },
      ];

      const detected = detectRecurringPatterns(history);
      expect(detected.length).toBe(1);
      expect(detected[0].recurrenceInterval).toBe("monthly");
      expect(detected[0].amount).toBe(649);
      expect(detected[0].confidence).toBeGreaterThanOrEqual(0.9);
      expect(detected[0].sampleOccurrences.length).toBe(3);
    });

    it("detects weekly recurring payments", () => {
      const history = [
        {
          description: "Weekly Grocery Fresh",
          amount: 1500,
          transaction_date: "2026-10-01",
          transaction_type: "expense",
        },
        {
          description: "Weekly Grocery Fresh",
          amount: 1500,
          transaction_date: "2026-10-08",
          transaction_type: "expense",
        },
        {
          description: "Weekly Grocery Fresh",
          amount: 1500,
          transaction_date: "2026-10-15",
          transaction_type: "expense",
        },
      ];

      const detected = detectRecurringPatterns(history);
      expect(detected.length).toBe(1);
      expect(detected[0].recurrenceInterval).toBe("weekly");
      expect(detected[0].amount).toBe(1500);
    });
  });

  describe("Android Sync Security & Zero-Trust Defense", () => {
    it("generates cryptographically secure token and matches SHA-256 hash", () => {
      const { rawToken, tokenHash } = generateDeviceToken();
      expect(rawToken.startsWith("wov_dev_")).toBe(true);
      expect(tokenHash).toBe(hashDeviceToken(rawToken));
      expect(tokenHash.length).toBe(64);
    });

    it("strictly rejects incoming payloads containing OTPs or auth secrets", () => {
      const maliciousPayload: SyncRecordPayload = {
        externalId: "sms_bad_1",
        amount: "500.00",
        transactionType: "expense",
        merchant: "HDFC Bank Alert",
        description: "Your OTP for transaction at Amazon is 492810. Do not share this with anyone.",
        timestamp: "2026-10-15T10:00:00Z",
        parserConfidence: 0.1,
      };

      const validation = validateFinancialRecord(maliciousPayload);
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain("Raw SMS or OTP detected");
    });

    it("accepts valid, sanitized financial transaction metadata", () => {
      const validPayload: SyncRecordPayload = {
        externalId: "sms_parsed_100",
        amount: "350.00",
        transactionType: "expense",
        merchant: "Zomato",
        description: "Zomato Online Order",
        accountIdentifier: "4321",
        timestamp: "2026-10-15T12:30:00Z",
        referenceNumber: "UPI/99887766",
        sourceApplication: "com.phonepe.app",
        parserConfidence: 0.95,
      };

      const validation = validateFinancialRecord(validPayload);
      expect(validation.isValid).toBe(true);
    });

    it("handles offline batch recovery with partial duplicate deduplication", () => {
      const existingHashes = new Set(["already_synced_hash_123"]);

      const offlineBatch: ParsedTransactionRow[] = [
        {
          transactionDate: "2026-10-15",
          description: "Offline Txn 1 (Already Synced)",
          amount: 250,
          transactionType: "expense",
          referenceNumber: "REF_OLD_1",
          parserConfidence: 0.95,
        },
        {
          transactionDate: "2026-10-15",
          description: "Offline Txn 2 (New Inflow)",
          amount: 5000,
          transactionType: "income",
          referenceNumber: "REF_NEW_2",
          parserConfidence: 0.95,
        },
        {
          transactionDate: "2026-10-15",
          description: "Offline Txn 3 (New Outflow)",
          amount: 750,
          transactionType: "expense",
          referenceNumber: "REF_NEW_3",
          parserConfidence: 0.95,
        },
      ];

      // Pretend hash for the first matches existing
      const hash1 = generateTransactionIdempotencyHash({
        userId: "user-1",
        accountId: "acc-1",
        amount: 250,
        transactionDate: "2026-10-15",
        referenceNumber: "REF_OLD_1",
      });
      existingHashes.add(hash1);

      const dedupe = filterDuplicates(offlineBatch, "user-1", "acc-1", existingHashes);
      expect(dedupe.uniqueTransactions.length).toBe(2);
      expect(dedupe.duplicateCount).toBe(1);
      expect(dedupe.uniqueTransactions[0].description).toBe("Offline Txn 2 (New Inflow)");
      expect(dedupe.uniqueTransactions[1].description).toBe("Offline Txn 3 (New Outflow)");
    });
  });
});

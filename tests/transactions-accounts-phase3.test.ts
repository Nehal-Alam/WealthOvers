import { describe, it, expect } from "vitest";
import {
  validateSplitAmounts,
  calculateReconciliationAdjustment,
  toDecimal,
} from "../lib/calculations/financial";
import {
  createSplitTransactionSchema,
  bulkUpdateCategorySchema,
  bulkDeleteTransactionsSchema,
  markTransactionsReviewedSchema,
} from "../lib/validations/transactions";
import { reconcileAccountSchema } from "../lib/validations/accounts";

describe("Phase 3: Transactions & Accounts Architecture", () => {
  describe("Split Transaction Math & Allocation Precision", () => {
    it("validates exact split allocations without floating-point drift", () => {
      // 100 split into three parts: 33.33 + 33.33 + 33.34 = 100.00
      const total = "100.00";
      const splits = [
        { amount: "33.33" },
        { amount: "33.33" },
        { amount: "33.34" },
      ];

      const res = validateSplitAmounts(total, splits);
      expect(res.isValid).toBe(true);
      expect(res.remaining).toBe("0.00");
      expect(res.totalAllocated).toBe("100.0000");
    });

    it("detects under-allocation with exact remaining balance", () => {
      const total = "15000.00";
      const splits = [
        { amount: "7000.00" },
        { amount: "5500.00" },
      ];

      const res = validateSplitAmounts(total, splits);
      expect(res.isValid).toBe(false);
      expect(res.remaining).toBe("2500.00");
      expect(parseFloat(res.difference)).toBeGreaterThan(0);
    });

    it("detects over-allocation and reports negative difference", () => {
      const total = "5000.00";
      const splits = [
        { amount: "3000.00" },
        { amount: "2500.00" },
      ];

      const res = validateSplitAmounts(total, splits);
      expect(res.isValid).toBe(false);
      expect(parseFloat(res.difference)).toBeLessThan(0);
      expect(res.remaining).toBe("-500.00");
    });
  });

  describe("Split Transaction Schema Validation", () => {
    const validAccountId = "11111111-1111-1111-1111-111111111111";
    const validCat1 = "22222222-2222-2222-2222-222222222222";
    const validCat2 = "33333333-3333-3333-3333-333333333333";

    it("accepts a perfectly balanced split transaction", () => {
      const payload = {
        account_id: validAccountId,
        transaction_date: "2026-11-01",
        transaction_type: "expense" as const,
        currency: "INR",
        parent_description: "Costco Wholesale",
        total_amount: "4500.00",
        splits: [
          {
            amount: "3000.00",
            category_id: validCat1,
            description: "Groceries & Vegetables",
          },
          {
            amount: "1500.00",
            category_id: validCat2,
            description: "Household Supplies",
          },
        ],
      };

      const result = createSplitTransactionSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("rejects split transaction when allocations do not sum to total", () => {
      const payload = {
        account_id: validAccountId,
        transaction_date: "2026-11-01",
        transaction_type: "expense" as const,
        currency: "INR",
        parent_description: "Costco Wholesale",
        total_amount: "5000.00", // Mismatch: splits total 4500
        splits: [
          {
            amount: "3000.00",
            category_id: validCat1,
            description: "Groceries",
          },
          {
            amount: "1500.00",
            category_id: validCat2,
            description: "Supplies",
          },
        ],
      };

      const result = createSplitTransactionSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("sum of split allocations must equal");
      }
    });

    it("rejects split transaction with fewer than 2 split allocations", () => {
      const payload = {
        account_id: validAccountId,
        transaction_date: "2026-11-01",
        transaction_type: "expense" as const,
        currency: "INR",
        parent_description: "Solo",
        total_amount: "1000.00",
        splits: [
          {
            amount: "1000.00",
            category_id: validCat1,
            description: "Only one item",
          },
        ],
      };

      const result = createSplitTransactionSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("At least two split allocations are required");
      }
    });
  });

  describe("Account Balance Reconciliation", () => {
    it("generates an income credit adjustment when actual balance exceeds recorded balance", () => {
      const recorded = "25000.00";
      const actual = "26250.50";

      const adj = calculateReconciliationAdjustment(recorded, actual);
      expect(adj.adjustmentType).toBe("income");
      expect(adj.adjustmentAmount).toBe("1250.5000");
      expect(adj.difference).toBe("1250.5000");
    });

    it("generates an expense debit adjustment when actual balance is below recorded balance", () => {
      const recorded = "40000.00";
      const actual = "38800.00";

      const adj = calculateReconciliationAdjustment(recorded, actual);
      expect(adj.adjustmentType).toBe("expense");
      expect(adj.adjustmentAmount).toBe("1200.0000");
      expect(adj.difference).toBe("-1200.0000");
    });

    it("reports 'none' adjustment when statement matches system balance perfectly", () => {
      const recorded = "50000.0000";
      const actual = "50000.00";

      const adj = calculateReconciliationAdjustment(recorded, actual);
      expect(adj.adjustmentType).toBe("none");
      expect(adj.adjustmentAmount).toBe("0.0000");
    });

    it("validates reconcileAccountSchema correctly", () => {
      const valid = {
        account_id: "11111111-1111-1111-1111-111111111111",
        actual_balance: "15420.75",
        statement_date: "2026-11-01",
        notes: "Audited against HDFC statement",
      };

      expect(reconcileAccountSchema.safeParse(valid).success).toBe(true);

      const invalid = {
        ...valid,
        actual_balance: "not-a-number",
      };
      expect(reconcileAccountSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe("Bulk Operations Validation", () => {
    const validId1 = "11111111-1111-1111-1111-111111111111";
    const validId2 = "22222222-2222-2222-2222-222222222222";
    const catId = "33333333-3333-3333-3333-333333333333";

    it("validates bulk category update", () => {
      const valid = {
        transaction_ids: [validId1, validId2],
        category_id: catId,
      };
      expect(bulkUpdateCategorySchema.safeParse(valid).success).toBe(true);

      const empty = {
        transaction_ids: [],
        category_id: catId,
      };
      expect(bulkUpdateCategorySchema.safeParse(empty).success).toBe(false);
    });

    it("validates bulk delete transactions", () => {
      const valid = {
        transaction_ids: [validId1, validId2],
      };
      expect(bulkDeleteTransactionsSchema.safeParse(valid).success).toBe(true);

      const empty = {
        transaction_ids: [],
      };
      expect(bulkDeleteTransactionsSchema.safeParse(empty).success).toBe(false);
    });

    it("validates mark transactions as reviewed", () => {
      const valid = {
        transaction_ids: [validId1],
      };
      expect(markTransactionsReviewedSchema.safeParse(valid).success).toBe(true);
    });
  });
});


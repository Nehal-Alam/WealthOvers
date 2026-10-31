import { describe, it, expect } from "vitest";
import { transferFundsSchema } from "../lib/validations/accounts";

describe("Inter-Account Transfer Validation & Invariants", () => {
  it("rejects transfers when source and destination accounts are identical", () => {
    const sameAccountData = {
      source_account_id: "11111111-1111-1111-1111-111111111111",
      destination_account_id: "11111111-1111-1111-1111-111111111111",
      amount: "5000.00",
      transaction_date: "2026-10-31",
      description: "Self transfer",
    };

    const result = transferFundsSchema.safeParse(sameAccountData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Destination account must be different");
    }
  });

  it("rejects zero or negative transfer amounts", () => {
    const zeroAmount = {
      source_account_id: "11111111-1111-1111-1111-111111111111",
      destination_account_id: "22222222-2222-2222-2222-222222222222",
      amount: "0.00",
      transaction_date: "2026-10-31",
    };
    expect(transferFundsSchema.safeParse(zeroAmount).success).toBe(false);

    const negativeAmount = {
      ...zeroAmount,
      amount: "-150.00",
    };
    expect(transferFundsSchema.safeParse(negativeAmount).success).toBe(false);
  });

  it("accepts valid transfers between two distinct accounts with positive amount", () => {
    const validTransfer = {
      source_account_id: "11111111-1111-1111-1111-111111111111",
      destination_account_id: "22222222-2222-2222-2222-222222222222",
      amount: "12500.50",
      transaction_date: "2026-10-31",
      description: "Transfer to Savings",
      notes: "Monthly savings allocation",
    };

    const result = transferFundsSchema.safeParse(validTransfer);
    expect(result.success).toBe(true);
  });
});

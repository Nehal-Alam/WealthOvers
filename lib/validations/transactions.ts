import { z } from "zod";

export const transactionTypeValues = [
  "income",
  "expense",
  "transfer",
  "refund",
  "investment_buy",
  "investment_sell",
  "loan_disbursement",
  "loan_repayment",
] as const;

export const transactionSourceValues = [
  "manual",
  "csv_import",
  "xlsx_import",
  "pdf_import",
  "android_sms_sync",
  "notification_sync",
  "recurring_rule",
] as const;

export const createTransactionSchema = z
  .object({
    account_id: z.string().uuid("Please select an account"),
    destination_account_id: z.string().uuid().optional().nullable(),
    category_id: z.string().uuid().optional().nullable(),
    subcategory_id: z.string().uuid().optional().nullable(),
    amount: z
      .string()
      .regex(/^\d+(\.\d{1,4})?$/, "Enter a valid amount (up to 4 decimal places)")
      .refine((val) => parseFloat(val) > 0, "Amount must be greater than zero"),
    currency: z.string().length(3).default("INR"),
    transaction_type: z.enum(transactionTypeValues),
    transaction_date: z.string().min(10, "Select a valid transaction date"),
    description: z.string().min(1, "Description is required").max(255),
    notes: z.string().max(1000).optional().nullable(),
    reference_number: z.string().max(100).optional().nullable(),
    tags: z.array(z.string()).default([]),
  })
  .refine(
    (data) => {
      if (data.transaction_type === "transfer") {
        return !!data.destination_account_id && data.account_id !== data.destination_account_id;
      }
      return true;
    },
    {
      message: "Transfers require a distinct destination account",
      path: ["destination_account_id"],
    }
  );

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

export const updateTransactionSchema = z.object({
  id: z.string().uuid(),
  account_id: z.string().uuid("Please select an account"),
  destination_account_id: z.string().uuid().optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  subcategory_id: z.string().uuid().optional().nullable(),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Enter a valid amount")
    .refine((val) => parseFloat(val) > 0, "Amount must be greater than zero"),
  transaction_type: z.enum(transactionTypeValues),
  transaction_date: z.string().min(10, "Select a valid transaction date"),
  description: z.string().min(1, "Description is required").max(255),
  notes: z.string().max(1000).optional().nullable(),
  reference_number: z.string().max(100).optional().nullable(),
  tags: z.array(z.string()).default([]),
});

export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

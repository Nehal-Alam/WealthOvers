import { z } from "zod";

export const accountTypeValues = [
  "savings",
  "current",
  "salary",
  "cash",
  "upi_wallet",
  "fixed_deposit",
  "recurring_deposit",
  "credit_card",
  "loan_account",
  "investment_demat",
  "other",
] as const;

export const createAccountSchema = z.object({
  name: z.string().min(1, "Account name is required").max(100, "Account name too long"),
  account_type: z.enum(accountTypeValues, {
    errorMap: () => ({ message: "Please select a valid account type" }),
  }),
  institution_name: z.string().min(1, "Institution name is required").max(100),
  account_number_masked: z.string().max(20).optional().or(z.literal("")),
  currency: z.string().length(3).default("INR"),
  initial_balance: z
    .string()
    .regex(/^-?\d+(\.\d{1,4})?$/, "Enter a valid initial balance (up to 4 decimal places)")
    .default("0.00"),
  color: z.string().default("#3B82F6"),
  icon: z.string().default("Landmark"),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;

export const updateAccountSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Account name is required").max(100),
  institution_name: z.string().min(1, "Institution name is required").max(100),
  account_number_masked: z.string().max(20).optional().or(z.literal("")),
  color: z.string().default("#3B82F6"),
  icon: z.string().default("Landmark"),
  is_archived: z.boolean().default(false),
});

export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

export const transferFundsSchema = z
  .object({
    source_account_id: z.string().uuid("Please select a source account"),
    destination_account_id: z.string().uuid("Please select a destination account"),
    amount: z
      .string()
      .regex(/^\d+(\.\d{1,4})?$/, "Enter a valid transfer amount")
      .refine((val) => parseFloat(val) > 0, "Transfer amount must be greater than zero"),
    transaction_date: z.string().min(10, "Select a valid transfer date"),
    description: z.string().max(255).optional().or(z.literal("")),
    notes: z.string().max(1000).optional().or(z.literal("")),
  })
  .refine((data) => data.source_account_id !== data.destination_account_id, {
    message: "Destination account must be different from source account",
    path: ["destination_account_id"],
  });

export type TransferFundsInput = z.infer<typeof transferFundsSchema>;


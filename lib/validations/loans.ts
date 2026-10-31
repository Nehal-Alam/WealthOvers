import { z } from "zod";

export const loanTypeValues = [
  "personal",
  "home",
  "education",
  "vehicle",
  "credit_card_debt",
  "loan_given",
  "loan_received",
  "other",
] as const;

export const createLoanSchema = z.object({
  account_id: z.string().uuid().optional().nullable(),
  loan_type: z.enum(loanTypeValues),
  lender_or_borrower_name: z.string().min(1, "Name is required").max(120),
  principal_amount: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Enter a valid principal amount")
    .refine((val) => parseFloat(val) > 0, "Principal must be greater than zero"),
  annual_interest_rate: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Enter annual interest rate")
    .refine((val) => parseFloat(val) >= 0, "Interest rate cannot be negative"),
  tenure_months: z.number().int().min(1, "Tenure must be at least 1 month"),
  start_date: z.string().min(10, "Select loan start date"),
  maturity_date: z.string().min(10, "Select maturity date"),
  notes: z.string().max(1000).optional().nullable(),
});

export type CreateLoanInput = z.infer<typeof createLoanSchema>;

export const recordLoanPaymentSchema = z.object({
  loan_id: z.string().uuid(),
  payment_date: z.string().min(10, "Select payment date"),
  emi_amount: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Enter valid EMI payment")
    .refine((val) => parseFloat(val) > 0, "Payment must be greater than zero"),
  extra_prepayment: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Enter valid extra prepayment")
    .default("0.00"),
});

export type RecordLoanPaymentInput = z.infer<typeof recordLoanPaymentSchema>;


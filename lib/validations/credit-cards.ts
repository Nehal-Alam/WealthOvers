import { z } from "zod";

export const createCreditCardSchema = z.object({
  account_id: z.string().uuid("Please select an associated credit card account"),
  card_name: z.string().min(1, "Card name is required").max(100),
  issuer_name: z.string().min(1, "Issuer name is required").max(100),
  last_four_digits: z.string().regex(/^\d{4}$/, "Must be exactly 4 digits"),
  credit_limit: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Enter a valid credit limit")
    .refine((val) => parseFloat(val) > 0, "Credit limit must be greater than zero"),
  current_outstanding: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Enter valid current outstanding")
    .default("0.00"),
  statement_date_day: z.number().int().min(1).max(31),
  payment_due_day: z.number().int().min(1).max(31),
  apr_percentage: z.number().min(0).max(100).default(42.0),
});

export type CreateCreditCardInput = z.infer<typeof createCreditCardSchema>;

export const createCreditCardStatementSchema = z.object({
  credit_card_id: z.string().uuid(),
  statement_period_start: z.string().min(10),
  statement_period_end: z.string().min(10),
  total_due: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Enter a valid total due amount")
    .refine((val) => parseFloat(val) >= 0, "Amount cannot be negative"),
  minimum_due: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Enter minimum due amount")
    .default("0.00"),
  due_date: z.string().min(10),
  is_settled: z.boolean().default(false),
});

export type CreateCreditCardStatementInput = z.infer<
  typeof createCreditCardStatementSchema
>;


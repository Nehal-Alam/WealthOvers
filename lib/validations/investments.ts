import { z } from "zod";

export const investmentTypeValues = [
  "stock_in",
  "stock_us",
  "mutual_fund",
  "etf",
  "sovereign_gold_bond",
  "gold_physical",
  "gold_digital",
  "fixed_deposit",
  "recurring_deposit",
  "ppf",
  "epf",
  "nps",
  "crypto",
  "other",
] as const;

export const createInvestmentSchema = z.object({
  account_id: z.string().uuid().optional().nullable(),
  name: z.string().min(1, "Asset name is required").max(150),
  symbol: z.string().max(30).optional().nullable(),
  asset_type: z.enum(investmentTypeValues),
  broker_name: z.string().min(1, "Broker / Platform is required").max(100).default("Manual"),
  currency: z.string().length(3).default("INR"),
  total_quantity: z
    .string()
    .regex(/^\d+(\.\d{1,6})?$/, "Quantity must be a positive number (up to 6 decimal places)")
    .refine((val) => parseFloat(val) > 0, "Quantity must be greater than zero"),
  average_buy_price: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Average buy price must be a valid number")
    .refine((val) => parseFloat(val) >= 0, "Buy price cannot be negative"),
  current_nav_or_price: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Current market price must be a valid number")
    .refine((val) => parseFloat(val) >= 0, "Market price cannot be negative"),
  notes: z.string().max(1000).optional().nullable(),
});

export type CreateInvestmentInput = z.infer<typeof createInvestmentSchema>;

export const updateInvestmentPriceSchema = z.object({
  id: z.string().uuid(),
  current_nav_or_price: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Enter a valid market price")
    .refine((val) => parseFloat(val) >= 0, "Price cannot be negative"),
});

export type UpdateInvestmentPriceInput = z.infer<typeof updateInvestmentPriceSchema>;

export const recordInvestmentTransactionSchema = z.object({
  investment_id: z.string().uuid(),
  transaction_type: z.enum(["buy", "sell", "dividend", "split", "bonus"]),
  transaction_date: z.string().min(10, "Select transaction date"),
  quantity: z
    .string()
    .regex(/^\d+(\.\d{1,6})?$/, "Enter valid quantity")
    .refine((val) => parseFloat(val) > 0, "Quantity must be greater than zero"),
  unit_price: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Enter valid price")
    .refine((val) => parseFloat(val) >= 0, "Price cannot be negative"),
  fees_and_taxes: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Enter valid fees")
    .default("0.0000"),
  notes: z.string().max(500).optional().nullable(),
});

export type RecordInvestmentTransactionInput = z.infer<
  typeof recordInvestmentTransactionSchema
>;

export const createSipSchema = z.object({
  investment_id: z.string().uuid("Select investment asset"),
  account_id: z.string().uuid("Select funding account"),
  sip_name: z.string().min(1, "SIP name is required").max(150),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Enter valid SIP amount")
    .refine((val) => parseFloat(val) > 0, "SIP amount must be greater than zero"),
  frequency: z
    .enum([
      "daily",
      "weekly",
      "biweekly",
      "monthly",
      "quarterly",
      "half_yearly",
      "yearly",
    ])
    .default("monthly"),
  deduction_day: z.number().int().min(1).max(31).default(5),
  next_due_date: z.string().min(10, "Select next due date"),
  notes: z.string().max(500).optional().nullable(),
});

export type CreateSipInput = z.infer<typeof createSipSchema>;


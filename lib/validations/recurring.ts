import { z } from "zod";

export const recurrenceIntervalValues = [
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "half_yearly",
  "yearly",
] as const;

export const createRecurringSchema = z.object({
  account_id: z.string().uuid("Please select an account"),
  category_id: z.string().uuid().optional().nullable(),
  merchant_id: z.string().uuid().optional().nullable(),
  name: z.string().min(1, "Name is required").max(120),
  description: z.string().max(500).optional().nullable(),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Enter a valid amount")
    .refine((val) => parseFloat(val) > 0, "Amount must be greater than zero"),
  currency: z.string().length(3).default("INR"),
  transaction_type: z.enum(["income", "expense", "transfer"]).default("expense"),
  recurrence_interval: z.enum(recurrenceIntervalValues).default("monthly"),
  interval_count: z.number().int().min(1).default(1),
  start_date: z.string().min(10, "Select start date"),
  next_occurrence_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  is_variable_amount: z.boolean().default(false),
  payment_method: z.string().max(50).optional().nullable(),
  reminder_days_before: z.number().int().min(0).max(30).default(3),
  is_autopay: z.boolean().default(false),
  auto_record: z.boolean().default(false),
  notes: z.string().max(1000).optional().nullable(),
  is_active: z.boolean().default(true),
  status: z.enum(["active", "paused", "cancelled"]).default("active"),
});

export type CreateRecurringInput = z.infer<typeof createRecurringSchema>;

export const updateRecurringSchema = z.object({
  id: z.string().uuid(),
  account_id: z.string().uuid("Please select an account"),
  category_id: z.string().uuid().optional().nullable(),
  merchant_id: z.string().uuid().optional().nullable(),
  name: z.string().min(1, "Name is required").max(120),
  description: z.string().max(500).optional().nullable(),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Enter a valid amount")
    .refine((val) => parseFloat(val) > 0, "Amount must be greater than zero"),
  recurrence_interval: z.enum(recurrenceIntervalValues),
  interval_count: z.number().int().min(1).default(1),
  next_occurrence_date: z.string().min(10, "Select next occurrence date"),
  end_date: z.string().optional().nullable(),
  is_variable_amount: z.boolean().default(false),
  payment_method: z.string().max(50).optional().nullable(),
  reminder_days_before: z.number().int().min(0).max(30).default(3),
  is_autopay: z.boolean().default(false),
  auto_record: z.boolean().default(false),
  notes: z.string().max(1000).optional().nullable(),
  is_active: z.boolean().default(true),
  status: z.enum(["active", "paused", "cancelled"]).default("active"),
});

export type UpdateRecurringInput = z.infer<typeof updateRecurringSchema>;

export const markBillPaidSchema = z.object({
  occurrence_id: z.string().uuid().optional().nullable(),
  recurring_id: z.string().uuid(),
  account_id: z.string().uuid("Please select payment account"),
  paid_amount: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Enter valid paid amount")
    .refine((val) => parseFloat(val) > 0, "Amount must be greater than zero"),
  paid_date: z.string().min(10, "Select payment date"),
  payment_method: z.string().max(50).default("bank_transfer"),
  notes: z.string().max(500).optional().nullable(),
  link_transaction_id: z.string().uuid().optional().nullable(),
});

export type MarkBillPaidInput = z.infer<typeof markBillPaidSchema>;

export const skipBillOccurrenceSchema = z.object({
  occurrence_id: z.string().uuid().optional().nullable(),
  recurring_id: z.string().uuid(),
  notes: z.string().max(500).optional().nullable(),
});

export type SkipBillOccurrenceInput = z.infer<typeof skipBillOccurrenceSchema>;


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
  name: z.string().min(1, "Name is required").max(120),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Enter a valid amount")
    .refine((val) => parseFloat(val) > 0, "Amount must be greater than zero"),
  currency: z.string().length(3).default("INR"),
  transaction_type: z.enum(["income", "expense", "transfer"]),
  recurrence_interval: z.enum(recurrenceIntervalValues),
  interval_count: z.number().int().min(1).default(1),
  start_date: z.string().min(10, "Select start date"),
  end_date: z.string().optional().nullable(),
  auto_record: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

export type CreateRecurringInput = z.infer<typeof createRecurringSchema>;

export const updateRecurringSchema = z.object({
  id: z.string().uuid(),
  account_id: z.string().uuid("Please select an account"),
  category_id: z.string().uuid().optional().nullable(),
  name: z.string().min(1, "Name is required").max(120),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Enter a valid amount")
    .refine((val) => parseFloat(val) > 0, "Amount must be greater than zero"),
  recurrence_interval: z.enum(recurrenceIntervalValues),
  interval_count: z.number().int().min(1).default(1),
  end_date: z.string().optional().nullable(),
  auto_record: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

export type UpdateRecurringInput = z.infer<typeof updateRecurringSchema>;


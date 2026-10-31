import { z } from "zod";

export const periodTypeValues = ["monthly", "quarterly", "yearly", "custom"] as const;

export const createBudgetSchema = z.object({
  name: z.string().min(1, "Budget name is required").max(100),
  total_amount: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Enter a valid budget amount")
    .refine((val) => parseFloat(val) > 0, "Budget total must be greater than zero"),
  period_type: z.enum(periodTypeValues).default("monthly"),
  start_date: z.string().min(10, "Select start date"),
  end_date: z.string().min(10, "Select end date"),
  rollover_enabled: z.boolean().default(false),
  alert_threshold_percent: z.number().int().min(1).max(100).default(85),
  allocations: z
    .array(
      z.object({
        category_id: z.string().uuid(),
        allocated_amount: z
          .string()
          .regex(/^\d+(\.\d{1,4})?$/, "Enter a valid category allocation")
          .refine((val) => parseFloat(val) >= 0, "Allocation cannot be negative"),
      })
    )
    .default([]),
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;

export const updateBudgetSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Budget name is required").max(100),
  total_amount: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Enter a valid budget amount")
    .refine((val) => parseFloat(val) > 0, "Budget total must be greater than zero"),
  rollover_enabled: z.boolean().default(false),
  alert_threshold_percent: z.number().int().min(1).max(100).default(85),
});

export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;


import { z } from "zod";

export const periodTypeValues = ["weekly", "monthly", "quarterly", "yearly", "custom"] as const;

export const budgetTypeValues = [
  "overall_monthly",
  "category",
  "multi_category",
  "weekly",
  "custom_range",
  "annual",
  "account_specific",
] as const;

export const rolloverModeValues = ["none", "full", "partial", "capped"] as const;

export const createBudgetSchema = z.object({
  name: z.string().min(1, "Budget name is required").max(100),
  description: z.string().max(500).optional().nullable(),
  budget_type: z.enum(budgetTypeValues).default("overall_monthly"),
  total_amount: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Enter a valid budget amount")
    .refine((val) => parseFloat(val) > 0, "Budget total must be greater than zero"),
  period_type: z.enum(periodTypeValues).default("monthly"),
  start_date: z.string().min(10, "Select start date"),
  end_date: z.string().min(10, "Select end date"),
  category_id: z.string().uuid().optional().nullable(),
  account_id: z.string().uuid().optional().nullable(),
  rollover_enabled: z.boolean().default(false),
  rollover_mode: z.enum(rolloverModeValues).default("none"),
  rollover_limit: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Enter valid rollover limit")
    .default("0.00"),
  alert_threshold_percent: z.number().int().min(1).max(100).default(85),
  alert_thresholds: z.array(z.number().int().min(1).max(100)).default([50, 75, 90, 100]),
  notes: z.string().max(1000).optional().nullable(),
  status: z.enum(["active", "paused", "archived"]).default("active"),
  allocations: z
    .array(
      z.object({
        category_id: z.string().uuid(),
        allocated_amount: z
          .string()
          .regex(/^\d+(\.\d{1,4})?$/, "Enter a valid category allocation")
          .refine((val) => parseFloat(val) >= 0, "Allocation cannot be negative"),
        notes: z.string().max(255).optional().nullable(),
      })
    )
    .default([]),
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;

export const updateBudgetSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Budget name is required").max(100),
  budget_type: z.enum(budgetTypeValues).optional(),
  total_amount: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Enter a valid budget amount")
    .refine((val) => parseFloat(val) > 0, "Budget total must be greater than zero"),
  category_id: z.string().uuid().optional().nullable(),
  account_id: z.string().uuid().optional().nullable(),
  rollover_enabled: z.boolean().default(false),
  rollover_mode: z.enum(rolloverModeValues).default("none"),
  rollover_limit: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Enter valid rollover limit")
    .default("0.00"),
  alert_threshold_percent: z.number().int().min(1).max(100).default(85),
  alert_thresholds: z.array(z.number().int().min(1).max(100)).default([50, 75, 90, 100]),
  notes: z.string().max(1000).optional().nullable(),
  status: z.enum(["active", "paused", "archived"]).default("active"),
  allocations: z
    .array(
      z.object({
        category_id: z.string().uuid(),
        allocated_amount: z
          .string()
          .regex(/^\d+(\.\d{1,4})?$/, "Enter a valid category allocation")
          .refine((val) => parseFloat(val) >= 0, "Allocation cannot be negative"),
        notes: z.string().max(255).optional().nullable(),
      })
    )
    .optional(),
});

export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;


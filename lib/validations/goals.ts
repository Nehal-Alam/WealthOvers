import { z } from "zod";

export const goalCategoryValues = [
  "Emergency Fund",
  "Vacation",
  "Car",
  "House",
  "Education",
  "Marriage",
  "Gadgets",
  "Retirement",
  "Business",
  "Debt Repayment",
  "Other",
] as const;

export const goalPriorityValues = ["low", "medium", "high", "urgent"] as const;

export const createGoalSchema = z.object({
  name: z.string().min(1, "Goal title is required").max(120),
  category: z.enum(goalCategoryValues).default("Emergency Fund"),
  target_amount: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Enter target amount")
    .refine((val) => parseFloat(val) > 0, "Target must be greater than zero"),
  current_amount: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Enter initial saved amount")
    .default("0.00"),
  start_date: z.string().min(10, "Select start date").default(() => new Date().toISOString().slice(0, 10)),
  target_date: z.string().min(10, "Select target completion date"),
  priority: z.enum(goalPriorityValues).default("medium"),
  description: z.string().max(1000).optional().nullable(),
  account_id: z.string().uuid().optional().nullable(),
  investment_id: z.string().uuid().optional().nullable(),
  contribution_frequency: z.enum(["weekly", "monthly", "quarterly", "yearly", "lumpsum"]).default("monthly"),
  planned_contribution_amount: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Enter planned contribution")
    .default("0.00"),
  icon_or_image: z.string().max(100).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;

export const updateGoalSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Goal title is required").max(120),
  category: z.enum(goalCategoryValues).default("Emergency Fund"),
  target_amount: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Enter target amount")
    .refine((val) => parseFloat(val) > 0, "Target must be greater than zero"),
  current_amount: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Enter saved amount")
    .default("0.00"),
  start_date: z.string().min(10, "Select start date"),
  target_date: z.string().min(10, "Select target completion date"),
  priority: z.enum(goalPriorityValues).default("medium"),
  status: z.enum(["active", "paused", "completed", "cancelled"]).default("active"),
  is_completed: z.boolean().default(false),
  account_id: z.string().uuid().optional().nullable(),
  investment_id: z.string().uuid().optional().nullable(),
  contribution_frequency: z.enum(["weekly", "monthly", "quarterly", "yearly", "lumpsum"]).default("monthly"),
  planned_contribution_amount: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Enter planned contribution")
    .default("0.00"),
  icon_or_image: z.string().max(100).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;

export const contributeGoalSchema = z.object({
  goal_id: z.string().uuid(),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Enter contribution amount")
    .refine((val) => parseFloat(val) > 0, "Contribution must be greater than zero"),
  contribution_date: z.string().min(10, "Select contribution date"),
  account_id: z.string().uuid().optional().nullable(),
  contribution_type: z.enum(["deposit", "withdrawal"]).default("deposit"),
  link_transaction_id: z.string().uuid().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export type ContributeGoalInput = z.infer<typeof contributeGoalSchema>;


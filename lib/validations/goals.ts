import { z } from "zod";

export const createGoalSchema = z.object({
  name: z.string().min(1, "Goal title is required").max(120),
  target_amount: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Enter target amount")
    .refine((val) => parseFloat(val) > 0, "Target must be greater than zero"),
  current_amount: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Enter initial saved amount")
    .default("0.00"),
  target_date: z.string().min(10, "Select a target target date"),
  category: z.string().min(1, "Category is required").max(50).default("General"),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;

export const contributeGoalSchema = z.object({
  goal_id: z.string().uuid(),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Enter contribution amount")
    .refine((val) => parseFloat(val) > 0, "Contribution must be greater than zero"),
  contribution_date: z.string().min(10, "Select contribution date"),
  notes: z.string().max(500).optional().nullable(),
});

export type ContributeGoalInput = z.infer<typeof contributeGoalSchema>;


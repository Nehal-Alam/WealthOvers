import { z } from "zod";

export const subscriptionBillingCycleEnum = z.enum([
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
]);

export const subscriptionStatusEnum = z.enum(["active", "paused", "cancelled"]);

export const createSubscriptionSchema = z.object({
  name: z.string().min(1, "Subscription name is required").max(100),
  billing_cycle: subscriptionBillingCycleEnum.default("monthly"),
  cost: z.union([z.number(), z.string()]).refine((val) => {
    const num = Number(val);
    return !isNaN(num) && num >= 0;
  }, "Subscription cost must be a non-negative number"),
  currency: z.string().length(3).default("INR"),
  account_id: z.string().uuid().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  renewal_date: z.string().min(1, "Renewal date is required"),
  cancellation_reminder_days: z.coerce.number().min(0).max(90).default(3),
  status: subscriptionStatusEnum.default("active"),
});

export const updateSubscriptionStatusSchema = z.object({
  id: z.string().uuid(),
  status: subscriptionStatusEnum,
});

export const deleteSubscriptionSchema = z.object({
  id: z.string().uuid(),
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type UpdateSubscriptionStatusInput = z.infer<typeof updateSubscriptionStatusSchema>;
export type DeleteSubscriptionInput = z.infer<typeof deleteSubscriptionSchema>;


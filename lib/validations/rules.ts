import { z } from "zod";

export const createCategorizationRuleSchema = z.object({
  keyword_pattern: z
    .string()
    .min(1, "Keyword or regex pattern is required")
    .max(100),
  match_field: z.enum(["description", "merchant", "reference"]).default("description"),
  target_category_id: z.string().uuid("Please select a target category"),
  target_subcategory_id: z.string().uuid().optional().nullable(),
  priority: z.coerce.number().int().min(0).max(100).default(0),
});

export type CreateCategorizationRuleInput = z.infer<typeof createCategorizationRuleSchema>;


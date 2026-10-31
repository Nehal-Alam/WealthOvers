import { z } from "zod";

export const categoryTypeValues = ["income", "expense", "investment"] as const;

export const createCategorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(80),
  type: z.enum(categoryTypeValues, {
    errorMap: () => ({ message: "Select category type (income, expense, or investment)" }),
  }),
  icon: z.string().default("Folder"),
  color: z.string().default("#3B82F6"),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Category name is required").max(80),
  icon: z.string().default("Folder"),
  color: z.string().default("#3B82F6"),
});

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const createSubcategorySchema = z.object({
  category_id: z.string().uuid("Category is required"),
  name: z.string().min(1, "Subcategory name is required").max(80),
  icon: z.string().optional().nullable(),
});

export type CreateSubcategoryInput = z.infer<typeof createSubcategorySchema>;

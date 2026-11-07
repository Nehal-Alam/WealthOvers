import { z } from "zod";

export const categoryTypeValues = [
  "income",
  "expense",
  "investment",
  "loan",
  "debt",
  "transfer",
] as const;

export type CategoryTypeValue = (typeof categoryTypeValues)[number];

export const createCategorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(80),
  type: z.enum(categoryTypeValues, {
    errorMap: () => ({ message: "Select category type (income, expense, investment, loan, debt, transfer)" }),
  }),
  icon: z.string().default("Folder"),
  color: z.string().default("#376FE5"),
  description: z.string().max(255).optional().nullable(),
  parent_category_id: z.string().uuid().optional().nullable(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Category name is required").max(80),
  icon: z.string().default("Folder"),
  color: z.string().default("#376FE5"),
  description: z.string().max(255).optional().nullable(),
  is_archived: z.boolean().optional(),
});

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const deleteCategorySchema = z.object({
  id: z.string().uuid(),
  reassignToCategoryId: z.string().uuid().optional().nullable(),
});

export type DeleteCategoryInput = z.infer<typeof deleteCategorySchema>;

export const createSubcategorySchema = z.object({
  category_id: z.string().uuid("Category is required"),
  name: z.string().min(1, "Subcategory name is required").max(80),
  icon: z.string().optional().nullable(),
  description: z.string().max(255).optional().nullable(),
});

export type CreateSubcategoryInput = z.infer<typeof createSubcategorySchema>;

export const updateSubcategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Subcategory name is required").max(80),
  icon: z.string().optional().nullable(),
  description: z.string().max(255).optional().nullable(),
  is_archived: z.boolean().optional(),
});

export type UpdateSubcategoryInput = z.infer<typeof updateSubcategorySchema>;

export const createTagSchema = z.object({
  name: z.string().min(1, "Tag name is required").max(50),
  color: z.string().default("#376FE5"),
  description: z.string().max(255).optional().nullable(),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;

export const updateTagSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Tag name is required").max(50),
  color: z.string().default("#376FE5"),
  description: z.string().max(255).optional().nullable(),
  is_archived: z.boolean().optional(),
});

export type UpdateTagInput = z.infer<typeof updateTagSchema>;

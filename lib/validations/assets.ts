import { z } from "zod";

export const createAssetSchema = z.object({
  name: z.string().min(1, "Asset name is required").max(150),
  category: z.string().min(1, "Category is required").max(50).default("Real Estate"),
  purchase_price: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Enter valid purchase price")
    .refine((val) => parseFloat(val) >= 0, "Cannot be negative"),
  current_valuation: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Enter valid current valuation")
    .refine((val) => parseFloat(val) >= 0, "Cannot be negative"),
  purchase_date: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export type CreateAssetInput = z.infer<typeof createAssetSchema>;

export const createLiabilitySchema = z.object({
  name: z.string().min(1, "Liability name is required").max(150),
  category: z.string().min(1, "Category is required").max(50).default("Personal Debt"),
  total_amount: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Enter total amount")
    .refine((val) => parseFloat(val) >= 0, "Cannot be negative"),
  outstanding_amount: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Enter outstanding amount")
    .refine((val) => parseFloat(val) >= 0, "Cannot be negative"),
  due_date: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export type CreateLiabilityInput = z.infer<typeof createLiabilitySchema>;


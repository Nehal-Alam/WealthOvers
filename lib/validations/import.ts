import { z } from "zod";

export const confirmImportRowSchema = z.object({
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  description: z.string().min(1, "Description is required").max(255),
  amount: z.number().positive("Amount must be greater than zero"),
  transactionType: z.enum(["income", "expense"]),
  categoryId: z.string().uuid().optional().nullable(),
  subcategoryId: z.string().uuid().optional().nullable(),
  referenceNumber: z.string().max(100).optional().nullable(),
  idempotencyHash: z.string().max(64).optional().nullable(),
});

export const confirmImportJobSchema = z.object({
  jobId: z.string().uuid().optional().nullable(),
  accountId: z.string().uuid("Please select a target account"),
  transactions: z.array(confirmImportRowSchema).min(1, "No transactions selected for import"),
});

export type ConfirmImportJobInput = z.infer<typeof confirmImportJobSchema>;


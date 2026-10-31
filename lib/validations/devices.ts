import { z } from "zod";

export const registerDeviceSchema = z.object({
  device_name: z.string().min(1, "Device name is required").max(100),
  device_model: z.string().max(100).optional().nullable(),
  app_version: z.string().max(20).optional().nullable().default("1.0.0"),
});

export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;

export const syncRecordSchema = z.object({
  externalId: z.string().min(1).max(100),
  amount: z
    .union([z.number(), z.string()])
    .refine((val) => Number(val) > 0, "Amount must be positive"),
  transactionType: z.enum(["income", "expense", "transfer"]),
  merchant: z.string().max(100).optional().nullable(),
  description: z.string().max(255).optional().nullable(),
  accountIdentifier: z.string().max(30).optional().nullable(),
  timestamp: z.string().datetime({ message: "Invalid ISO 8601 timestamp" }),
  referenceNumber: z.string().max(100).optional().nullable(),
  sourceApplication: z.string().max(100).optional().nullable(),
  parserConfidence: z.number().min(0).max(1).default(0.95),
  idempotencyHash: z.string().max(64).optional().nullable(),
});

export const syncBatchSchema = z.object({
  syncBatchId: z.string().uuid().or(z.string().min(5)),
  records: z.array(syncRecordSchema).min(1, "At least one record is required in the sync batch"),
});

export type SyncBatchInput = z.infer<typeof syncBatchSchema>;


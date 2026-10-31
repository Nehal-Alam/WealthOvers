"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseCSVBankStatement } from "@/lib/parsers/csv-parser";
import { parseExcelBankStatement } from "@/lib/parsers/excel-parser";
import { parsePDFBankStatement } from "@/lib/parsers/pdf-parser";
import { filterDuplicates } from "@/lib/parsers/duplicate-detector";
import { applyCategorizationRules } from "@/lib/parsers/rule-matcher";
import {
  confirmImportJobSchema,
  ConfirmImportJobInput,
} from "@/lib/validations/import";
import { ParsedTransactionRow } from "@/lib/parsers/types";

export type ActionResult<T = unknown> = {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
};

export interface ParseStatementResponse {
  jobId: string;
  fileName: string;
  fileFormat: "csv" | "xlsx" | "pdf";
  totalRows: number;
  validRows: ParsedTransactionRow[];
  duplicateCount: number;
  detectedColumns?: string[];
}

export async function uploadAndParseStatementAction(
  formData: FormData
): Promise<ActionResult<ParseStatementResponse>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const file = formData.get("file") as File | null;
    const accountId = formData.get("accountId") as string | null;
    let fileFormat = (formData.get("fileFormat") as string | null) || "csv";

    if (!file) {
      return { success: false, error: "Please select a statement file to upload" };
    }

    if (!accountId) {
      return { success: false, error: "Please select an account for this statement" };
    }

    // Auto-detect format from file extension if needed
    const lowerName = file.name.toLowerCase();
    if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
      fileFormat = "xlsx";
    } else if (lowerName.endsWith(".pdf")) {
      fileFormat = "pdf";
    } else {
      fileFormat = "csv";
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let parseResult;
    if (fileFormat === "xlsx") {
      parseResult = parseExcelBankStatement(buffer, file.name);
    } else if (fileFormat === "pdf") {
      parseResult = await parsePDFBankStatement(buffer, file.name);
    } else {
      const textContent = buffer.toString("utf-8");
      parseResult = parseCSVBankStatement(textContent, file.name);
    }

    if (parseResult.error || parseResult.validRows.length === 0) {
      return {
        success: false,
        error: parseResult.error || "No valid transactions could be extracted from this statement.",
      };
    }

    // 1. Fetch user's existing transaction hashes to detect duplicates
    const { data: existingTxns } = await supabase
      .from("transactions")
      .select("idempotency_hash")
      .eq("user_id", user.id)
      .not("idempotency_hash", "is", null);

    const existingHashes = new Set<string>(
      (existingTxns || []).map((t) => t.idempotency_hash!).filter(Boolean)
    );

    // 2. Filter duplicates
    const dedupeResult = filterDuplicates(
      parseResult.validRows,
      user.id,
      accountId,
      existingHashes
    );

    // 3. Fetch user's categorization rules and auto-apply suggestions
    const { data: userRules } = await supabase
      .from("categorization_rules")
      .select("*")
      .eq("user_id", user.id)
      .order("priority", { ascending: false });

    const categorizedRows = applyCategorizationRules(
      dedupeResult.uniqueTransactions,
      userRules || []
    );

    // 4. Create an import_jobs record in pending status
    const { data: job, error: jobErr } = await supabase
      .from("import_jobs")
      .insert({
        user_id: user.id,
        account_id: accountId,
        file_name: file.name,
        file_format: fileFormat,
        status: "pending",
        total_parsed: parseResult.totalRows,
        total_imported: 0,
        total_duplicates: dedupeResult.duplicateCount,
      })
      .select("id")
      .single();

    if (jobErr || !job) {
      return { success: false, error: jobErr?.message || "Failed to record import job" };
    }

    return {
      success: true,
      message: `Parsed ${categorizedRows.length} transactions (${dedupeResult.duplicateCount} duplicates filtered)`,
      data: {
        jobId: job.id,
        fileName: file.name,
        fileFormat: fileFormat as "csv" | "xlsx" | "pdf",
        totalRows: parseResult.totalRows,
        validRows: categorizedRows,
        duplicateCount: dedupeResult.duplicateCount,
        detectedColumns: parseResult.detectedColumns,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to parse bank statement" };
  }
}

export async function confirmImportAction(input: ConfirmImportJobInput): Promise<ActionResult> {
  try {
    const validated = confirmImportJobSchema.parse(input);
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return { success: false, error: "Unauthorized" };
    }

    // Determine import source from job if provided
    let source: "csv_import" | "xlsx_import" | "pdf_import" = "csv_import";
    if (validated.jobId) {
      const { data: job } = await supabase
        .from("import_jobs")
        .select("file_format")
        .eq("id", validated.jobId)
        .single();

      if (job?.file_format === "xlsx") source = "xlsx_import";
      else if (job?.file_format === "pdf") source = "pdf_import";
    }

    // Format rows for bulk insert
    const rowsToInsert = validated.transactions.map((tx) => ({
      user_id: user.id,
      account_id: validated.accountId,
      amount: tx.amount,
      currency: "INR",
      transaction_type: tx.transactionType,
      transaction_date: tx.transactionDate,
      description: tx.description,
      category_id: tx.categoryId || null,
      subcategory_id: tx.subcategoryId || null,
      reference_number: tx.referenceNumber || null,
      source,
      idempotency_hash: tx.idempotencyHash || null,
      is_reviewed: true,
      parser_confidence: 0.95,
    }));

    // Insert in optimized batches of 500 records to prevent request payload saturation
    const BATCH_SIZE = 500;
    for (let i = 0; i < rowsToInsert.length; i += BATCH_SIZE) {
      const batch = rowsToInsert.slice(i, i + BATCH_SIZE);
      const { error: insertErr } = await supabase.from("transactions").insert(batch);
      if (insertErr) {
        return { success: false, error: insertErr.message };
      }
    }

    // Update import job if id exists
    if (validated.jobId) {
      await supabase
        .from("import_jobs")
        .update({
          status: "completed",
          total_imported: rowsToInsert.length,
          updated_at: new Date().toISOString(),
        })
        .eq("id", validated.jobId);
    }

    revalidatePath("/import");
    revalidatePath("/transactions");
    revalidatePath("/accounts");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: `Successfully imported ${rowsToInsert.length} transactions to your ledger!`,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to confirm transaction import" };
  }
}

export async function deleteImportJobAction(jobId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const { error } = await supabase
      .from("import_jobs")
      .delete()
      .eq("id", jobId)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/import");
    return { success: true, message: "Import record deleted" };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}


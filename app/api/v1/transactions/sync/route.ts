import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  hashDeviceToken,
  validateFinancialRecord,
} from "@/lib/security/device-auth";
import { syncBatchSchema } from "@/lib/validations/devices";
import { generateTransactionIdempotencyHash } from "@/lib/parsers/duplicate-detector";

export async function POST(req: NextRequest) {
  try {
    const deviceId = req.headers.get("x-device-id");
    let deviceToken = req.headers.get("x-device-token");

    // Also support Authorization: Bearer wov_dev_...
    if (!deviceToken) {
      const authHeader = req.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        deviceToken = authHeader.slice(7).trim();
      }
    }

    if (!deviceId || !deviceToken) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing device authentication credentials. Provide X-Device-Id and X-Device-Token headers.",
        },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const validated = syncBatchSchema.parse(body);

    // 1. Zero-Trust Content Filtering: strictly reject OTPs and non-financial data
    for (const record of validated.records) {
      const validation = validateFinancialRecord(record);
      if (!validation.isValid) {
        return NextResponse.json(
          {
            success: false,
            error: validation.error || "Security validation rejected incoming payload.",
          },
          { status: 400 }
        );
      }

      // Ensure each record has an idempotency hash calculated
      if (!record.idempotencyHash) {
        record.idempotencyHash = generateTransactionIdempotencyHash({
          userId: deviceId, // scoped in rpc
          amount: record.amount,
          transactionDate: record.timestamp,
          referenceNumber: record.referenceNumber,
          description: record.merchant || record.description,
        });
      }
    }

    // 2. Hash device token with SHA-256
    const tokenHash = hashDeviceToken(deviceToken);

    // 3. Connect to Supabase to execute secure stored procedure
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await supabase.rpc("sync_android_transactions", {
      p_device_id: deviceId,
      p_token_hash: tokenHash,
      p_batch_id: validated.syncBatchId,
      p_records: validated.records,
    });

    if (error) {
      const isForbidden =
        error.message.includes("revoked") ||
        error.message.includes("Invalid device") ||
        error.code === "42501" ||
        error.code === "28000";

      return NextResponse.json(
        { success: false, error: error.message },
        { status: isForbidden ? 403 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: "Validation Error", details: err.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: err.message || "Failed to process transaction synchronization" },
      { status: 500 }
    );
  }
}


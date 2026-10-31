import pdf from "pdf-parse";
import { ParsedTransactionRow, StatementParseResult } from "./types";
import { normalizeBankDate, cleanCurrencyAmount } from "./csv-parser";

/**
 * Parses Bank Statement text extracted from PDF files.
 */
export async function parsePDFBankStatement(
  buffer: Buffer,
  fileName = "statement.pdf"
): Promise<StatementParseResult> {
  try {
    const data = await pdf(buffer);
    const text = data.text;

    if (!text || text.trim().length === 0) {
      return {
        fileName,
        fileFormat: "pdf",
        totalRows: 0,
        validRows: [],
        skippedRows: 0,
        error: "PDF text layer is empty or scanned image without OCR text",
      };
    }

    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const validRows: ParsedTransactionRow[] = [];
    let skipped = 0;

    // Regex matching dates at start of transaction lines:
    // e.g., 15/10/2026, 15-10-2026, 15-Oct-2026, 15 Oct 2026, 2026-10-15
    const dateLineRegex = /^(\d{2}[/-]\d{2}[/-]\d{2,4}|\d{2}[/-][A-Za-z]{3}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/;

    // Currency amount pattern with optional comma separators: e.g. 1,450.00, 500.00
    const amountRegex = /([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})|[0-9]+(?:\.[0-9]{2}))/g;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const dateMatch = line.match(dateLineRegex);

      if (!dateMatch) {
        skipped++;
        continue;
      }

      const rawDate = dateMatch[1];
      const normalizedDate = normalizeBankDate(rawDate);
      if (!normalizedDate) {
        skipped++;
        continue;
      }

      // Rest of the line after the date
      const afterDate = line.slice(dateMatch[0].length).trim();
      const amounts = afterDate.match(amountRegex);

      if (!amounts || amounts.length === 0) {
        skipped++;
        continue;
      }

      // Find amounts: typically last 1-3 numbers are (Debit, Credit, Balance) or (Amount, Balance)
      let amount = 0;
      let transactionType: "income" | "expense" = "expense";
      let balance: number | null = null;
      let description = afterDate;

      // Strip amounts from narration/description
      const lastAmtStr = amounts[amounts.length - 1];
      const secondLastAmtStr = amounts.length > 1 ? amounts[amounts.length - 2] : null;
      const thirdLastAmtStr = amounts.length > 2 ? amounts[amounts.length - 3] : null;

      if (amounts.length >= 3 && thirdLastAmtStr && secondLastAmtStr) {
        // Format: Debit, Credit, Balance OR Amount, Balance, something
        const val1 = cleanCurrencyAmount(thirdLastAmtStr);
        const val2 = cleanCurrencyAmount(secondLastAmtStr);
        balance = cleanCurrencyAmount(lastAmtStr);

        if (val1 > 0 && val2 === 0) {
          amount = val1;
          transactionType = "expense";
        } else if (val2 > 0 && val1 === 0) {
          amount = val2;
          transactionType = "income";
        } else {
          amount = val1 > 0 ? val1 : val2;
        }

        // Clean description
        const firstAmtIndex = afterDate.indexOf(thirdLastAmtStr);
        if (firstAmtIndex > 0) {
          description = afterDate.substring(0, firstAmtIndex).trim();
        }
      } else if (amounts.length === 2 && secondLastAmtStr) {
        // Format: Amount, Balance
        amount = cleanCurrencyAmount(secondLastAmtStr);
        balance = cleanCurrencyAmount(lastAmtStr);

        const firstAmtIndex = afterDate.indexOf(secondLastAmtStr);
        if (firstAmtIndex > 0) {
          description = afterDate.substring(0, firstAmtIndex).trim();
        }

        // Detect Cr/Dr indicator
        const upper = line.toUpperCase();
        if (upper.includes(" CR") || upper.includes("CREDIT") || upper.includes("SALARY") || upper.includes("DEPOSIT")) {
          transactionType = "income";
        } else {
          transactionType = "expense";
        }
      } else {
        // Single amount
        amount = cleanCurrencyAmount(lastAmtStr);
        const amtIndex = afterDate.indexOf(lastAmtStr);
        if (amtIndex > 0) {
          description = afterDate.substring(0, amtIndex).trim();
        }
        const upper = line.toUpperCase();
        if (upper.includes(" CR") || upper.includes("CREDIT") || upper.includes("DEPOSIT")) {
          transactionType = "income";
        } else {
          transactionType = "expense";
        }
      }

      if (amount <= 0) {
        skipped++;
        continue;
      }

      // Check for Reference number (UPI, UTR, CHQ)
      const refMatch = description.match(/(?:UPI|UTR|CHQ|REF|TXN)[/: -]+([A-Za-z0-9]+)/i);
      const referenceNumber = refMatch ? refMatch[1] : null;

      validRows.push({
        transactionDate: normalizedDate,
        description: description.replace(/\s+/g, " ").trim() || "Statement Transaction",
        amount,
        transactionType,
        referenceNumber,
        balance,
        parserConfidence: 0.9,
      });
    }

    return {
      fileName,
      fileFormat: "pdf",
      totalRows: validRows.length + skipped,
      validRows,
      skippedRows: skipped,
    };
  } catch (err: any) {
    return {
      fileName,
      fileFormat: "pdf",
      totalRows: 0,
      validRows: [],
      skippedRows: 0,
      error: `Failed to parse PDF statement: ${err.message || String(err)}`,
    };
  }
}


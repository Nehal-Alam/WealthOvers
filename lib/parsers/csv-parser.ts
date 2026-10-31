import { parse, isValid, format } from "date-fns";
import { ParsedTransactionRow, StatementParseResult } from "./types";
import { toDecimal } from "../calculations/financial";

/**
 * Parses raw CSV text into a 2D array of cells handling RFC 4180 quotes.
 */
export function parseCSVToRows(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentCell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        currentRow.push(currentCell.trim());
        currentCell = "";
      } else if (char === "\r") {
        if (nextChar === "\n") i++;
        currentRow.push(currentCell.trim());
        if (currentRow.some((c) => c.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = "";
      } else if (char === "\n") {
        currentRow.push(currentCell.trim());
        if (currentRow.some((c) => c.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = "";
      } else {
        currentCell += char;
      }
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Normalizes different bank date formats into ISO 'YYYY-MM-DD'
 */
export function normalizeBankDate(dateStr: string): string | null {
  if (!dateStr) return null;
  const cleaned = dateStr.trim().replace(/\s+/g, " ");

  // Standard formats
  const candidateFormats = [
    "yyyy-MM-dd",
    "dd/MM/yyyy",
    "dd-MM-yyyy",
    "dd.MM.yyyy",
    "dd/MM/yy",
    "dd-MM-yy",
    "d/M/yyyy",
    "d-M-yyyy",
    "dd-MMM-yyyy", // e.g. 15-Oct-2026
    "dd MMM yyyy",  // e.g. 15 Oct 2026
    "dd-MMM-yy",
    "MMM dd, yyyy", // e.g. Oct 15, 2026
    "MM/dd/yyyy",
  ];

  for (const fmt of candidateFormats) {
    try {
      const parsed = parse(cleaned, fmt, new Date());
      if (isValid(parsed) && parsed.getFullYear() > 1990 && parsed.getFullYear() < 2100) {
        return format(parsed, "yyyy-MM-dd");
      }
    } catch {
      // Continue to next format candidate
    }
  }

  // Direct ISO regex fallback
  const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return isoMatch[0];

  return null;
}

/**
 * Cleans numerical currency string: removes currency symbols, commas, spaces
 */
export function cleanCurrencyAmount(amountStr: string | number | undefined | null): number {
  if (amountStr === undefined || amountStr === null) return 0;
  if (typeof amountStr === "number") return Math.abs(amountStr);

  const clean = amountStr
    .toString()
    .replace(/[₹$€£,]/g, "")
    .replace(/[^\d.-]/g, "")
    .trim();

  if (!clean || clean === "-" || isNaN(Number(clean))) return 0;
  try {
    return Math.abs(toDecimal(clean).toNumber());
  } catch {
    return 0;
  }
}

/**
 * Header resolution mapping
 */
interface ColumnIndices {
  dateIdx: number;
  descIdx: number;
  refIdx: number;
  debitIdx: number;
  creditIdx: number;
  amountIdx: number;
  typeIdx: number;
  balanceIdx: number;
}

function resolveColumns(headerRow: string[]): ColumnIndices {
  const norm = headerRow.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));

  const findIdx = (keywords: string[]) =>
    norm.findIndex((col) =>
      keywords.some((kw) => {
        if (kw === "cr" || kw === "dr") {
          return col === "cr" || col === "dr" || col === "cramt" || col === "dramt";
        }
        return col.includes(kw);
      })
    );

  const dateIdx = findIdx(["txndate", "transactiondate", "valuedate", "postdate", "date"]);
  const descIdx = findIdx(["narration", "description", "particulars", "remarks", "details", "merchant"]);
  const refIdx = findIdx(["chqref", "refno", "chequeno", "utr", "referencenumber", "txnid", "reference"]);
  const debitIdx = findIdx(["withdrawalamt", "withdrawal", "debitamt", "debit", "dramt", "dr"]);
  const creditIdx = findIdx(["depositamt", "deposit", "creditamt", "credit", "cramt", "cr"]);
  const amountIdx = findIdx(["amount", "transamt", "txnamount"]);
  const typeIdx = findIdx(["crdr", "drcr", "type", "trxtype"]);
  const balanceIdx = findIdx(["closingbalance", "balance", "netbalance"]);

  return { dateIdx, descIdx, refIdx, debitIdx, creditIdx, amountIdx, typeIdx, balanceIdx };
}

/**
 * Parse CSV Bank Statement
 */
export function parseCSVBankStatement(
  content: string,
  fileName = "statement.csv"
): StatementParseResult {
  const rows = parseCSVToRows(content);
  if (rows.length < 2) {
    return {
      fileName,
      fileFormat: "csv",
      totalRows: 0,
      validRows: [],
      skippedRows: rows.length,
      error: "File contains insufficient rows or is empty",
    };
  }

  // Find header row (some bank statements have introductory lines)
  let headerIndex = -1;
  let cols: ColumnIndices = {
    dateIdx: -1,
    descIdx: -1,
    refIdx: -1,
    debitIdx: -1,
    creditIdx: -1,
    amountIdx: -1,
    typeIdx: -1,
    balanceIdx: -1,
  };

  for (let r = 0; r < Math.min(rows.length, 15); r++) {
    const candidateCols = resolveColumns(rows[r]);
    // Valid header must identify at least a Date column and (Debit/Credit or Amount)
    if (
      candidateCols.dateIdx !== -1 &&
      (candidateCols.descIdx !== -1 || candidateCols.amountIdx !== -1 || candidateCols.debitIdx !== -1)
    ) {
      headerIndex = r;
      cols = candidateCols;
      break;
    }
  }

  if (headerIndex === -1) {
    return {
      fileName,
      fileFormat: "csv",
      totalRows: rows.length,
      validRows: [],
      skippedRows: rows.length,
      error: "Could not automatically identify bank statement header columns (Date, Description, Debit/Credit)",
    };
  }

  const validRows: ParsedTransactionRow[] = [];
  let skippedRows = headerIndex + 1;

  for (let r = headerIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    const rawDate = row[cols.dateIdx];
    const normalizedDate = normalizeBankDate(rawDate);

    if (!normalizedDate) {
      skippedRows++;
      continue;
    }

    const description = cols.descIdx !== -1 ? row[cols.descIdx] || "Bank Transaction" : "Bank Transaction";
    const refNumber = cols.refIdx !== -1 ? row[cols.refIdx] : null;

    let amount = 0;
    let type: "income" | "expense" = "expense";

    // 1. Check separate Debit and Credit columns
    const debitVal = cols.debitIdx !== -1 ? cleanCurrencyAmount(row[cols.debitIdx]) : 0;
    const creditVal = cols.creditIdx !== -1 ? cleanCurrencyAmount(row[cols.creditIdx]) : 0;

    if (debitVal > 0) {
      amount = debitVal;
      type = "expense";
    } else if (creditVal > 0) {
      amount = creditVal;
      type = "income";
    } else if (cols.amountIdx !== -1) {
      // 2. Check single amount column with Type or sign
      const rawAmt = row[cols.amountIdx] || "";
      const amtNum = cleanCurrencyAmount(rawAmt);
      const rawType = cols.typeIdx !== -1 ? (row[cols.typeIdx] || "").toUpperCase() : "";

      if (rawType.includes("CR") || rawType.includes("CREDIT") || rawAmt.includes("+")) {
        type = "income";
        amount = amtNum;
      } else {
        type = "expense";
        amount = amtNum;
      }
    }

    if (amount <= 0) {
      skippedRows++;
      continue;
    }

    const balance = cols.balanceIdx !== -1 ? cleanCurrencyAmount(row[cols.balanceIdx]) : null;

    const rawMap: Record<string, string> = {};
    rows[headerIndex].forEach((h, idx) => {
      rawMap[h] = row[idx] || "";
    });

    validRows.push({
      transactionDate: normalizedDate,
      description: description.trim(),
      amount,
      transactionType: type,
      referenceNumber: refNumber ? refNumber.trim() : null,
      balance,
      parserConfidence: 0.95,
      rawRow: rawMap,
    });
  }

  return {
    fileName,
    fileFormat: "csv",
    totalRows: validRows.length + skippedRows,
    validRows,
    detectedColumns: rows[headerIndex],
    skippedRows,
  };
}

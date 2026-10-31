import * as XLSX from "xlsx";
import { StatementParseResult } from "./types";
import { parseCSVBankStatement } from "./csv-parser";

/**
 * Parses Excel Bank Statements (.xlsx and .xls)
 */
export function parseExcelBankStatement(
  buffer: Buffer | ArrayBuffer | Uint8Array,
  fileName = "statement.xlsx"
): StatementParseResult {
  try {
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      return {
        fileName,
        fileFormat: "xlsx",
        totalRows: 0,
        validRows: [],
        skippedRows: 0,
        error: "Excel workbook contains no sheets",
      };
    }

    const worksheet = workbook.Sheets[firstSheetName];
    // Convert sheet to CSV string representation to reuse robust tokenizer and normalizer
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);

    if (!csvContent || csvContent.trim().length === 0) {
      return {
        fileName,
        fileFormat: "xlsx",
        totalRows: 0,
        validRows: [],
        skippedRows: 0,
        error: "Worksheet is empty",
      };
    }

    const parsed = parseCSVBankStatement(csvContent, fileName);
    parsed.fileFormat = "xlsx";
    return parsed;
  } catch (err: any) {
    return {
      fileName,
      fileFormat: "xlsx",
      totalRows: 0,
      validRows: [],
      skippedRows: 0,
      error: `Failed to parse Excel file: ${err.message || String(err)}`,
    };
  }
}

"use client";

import * as React from "react";
import { Check, CheckCircle2, AlertTriangle, ArrowRight, X } from "lucide-react";
import { toast } from "sonner";

import { Tables } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoneyDisplay } from "@/components/financial/money-display";
import { ParsedTransactionRow } from "@/lib/parsers/types";
import { confirmImportAction, ParseStatementResponse } from "@/app/(dashboard)/import/actions";

interface ParsedPreviewTableProps {
  parseData: ParseStatementResponse;
  accountId: string;
  categories: Tables<"categories">[];
  onImportComplete: () => void;
  onCancel: () => void;
}

export function ParsedPreviewTable({
  parseData,
  accountId,
  categories,
  onImportComplete,
  onCancel,
}: ParsedPreviewTableProps) {
  const [rows, setRows] = React.useState<ParsedTransactionRow[]>(parseData.validRows);
  const [selectedIndices, setSelectedIndices] = React.useState<Set<number>>(
    new Set(parseData.validRows.map((_, i) => i))
  );
  const [isImporting, setIsImporting] = React.useState(false);

  const toggleSelectAll = () => {
    if (selectedIndices.size === rows.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(rows.map((_, i) => i)));
    }
  };

  const toggleRow = (idx: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleCategoryChange = (idx: number, categoryId: string) => {
    setRows((prev) => {
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        categorySuggestionId: categoryId === "none" ? null : categoryId,
      };
      return updated;
    });
  };

  const handleConfirmImport = async () => {
    const selectedRows = rows.filter((_, idx) => selectedIndices.has(idx));
    if (selectedRows.length === 0) {
      toast.error("Please select at least one transaction to import");
      return;
    }

    setIsImporting(true);
    try {
      const res = await confirmImportAction({
        jobId: parseData.jobId,
        accountId,
        transactions: selectedRows.map((r) => ({
          transactionDate: r.transactionDate,
          description: r.description,
          amount: r.amount,
          transactionType: r.transactionType,
          categoryId: r.categorySuggestionId || null,
          referenceNumber: r.referenceNumber || null,
          idempotencyHash: r.idempotencyHash,
        })),
      });

      if (res.success) {
        toast.success(res.message);
        onImportComplete();
      } else {
        toast.error(res.error || "Failed to import transactions");
      }
    } catch {
      toast.error("An error occurred during import");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card className="border-primary/20 shadow-md">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            Statement Preview: {parseData.fileName}
          </CardTitle>
          <CardDescription>
            Review extracted transactions and adjust categories before committing to your ledger.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4 mr-1" />
            Discard
          </Button>
          <Button
            size="sm"
            onClick={handleConfirmImport}
            disabled={isImporting || selectedIndices.size === 0}
            className="gap-1.5"
          >
            <Check className="h-4 w-4" />
            {isImporting ? "Importing..." : `Import Selected (${selectedIndices.size})`}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Metric Badges */}
        <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/40 rounded-lg text-xs">
          <div>
            <span className="text-muted-foreground">Format:</span>{" "}
            <Badge variant="outline" className="uppercase font-mono">
              {parseData.fileFormat}
            </Badge>
          </div>
          <div>
            <span className="text-muted-foreground">Extracted Rows:</span>{" "}
            <span className="font-semibold">{rows.length}</span>
          </div>
          {parseData.duplicateCount > 0 && (
            <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>{parseData.duplicateCount} duplicates auto-filtered</span>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Selected for Ledger:</span>{" "}
            <span className="font-semibold text-primary">{selectedIndices.size}</span>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="rounded-md border overflow-x-auto max-h-[480px]">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-12 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIndices.size === rows.length && rows.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300"
                  />
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Narration / Description</TableHead>
                <TableHead>Ref / UTR</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx) => {
                const isSelected = selectedIndices.has(idx);

                return (
                  <TableRow
                    key={idx}
                    className={`cursor-pointer ${
                      isSelected ? "" : "opacity-50 bg-muted/20"
                    }`}
                  >
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(idx)}
                        className="rounded border-gray-300"
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs whitespace-nowrap">
                      {row.transactionDate}
                    </TableCell>
                    <TableCell className="max-w-[280px] truncate text-xs font-medium">
                      {row.description}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">
                      {row.referenceNumber || "—"}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={row.categorySuggestionId || "none"}
                        onValueChange={(val) => handleCategoryChange(idx, val)}
                      >
                        <SelectTrigger className="h-7 text-xs w-[160px]">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Uncategorized</SelectItem>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id} className="text-xs">
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <MoneyDisplay
                        amount={row.amount}
                        className={`font-semibold text-xs ${
                          row.transactionType === "income"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-foreground"
                        }`}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}


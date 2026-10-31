"use client";

import * as React from "react";
import { Tables } from "@/types/database";
import { UploadStatementCard } from "./upload-statement-card";
import { ParsedPreviewTable } from "./parsed-preview-table";
import { ImportHistoryTable } from "./import-history-table";
import { ParseStatementResponse } from "@/app/(dashboard)/import/actions";

interface ImportViewProps {
  accounts: Tables<"accounts">[];
  categories: Tables<"categories">[];
  importJobs: Tables<"import_jobs">[];
}

export function ImportView({ accounts, categories, importJobs }: ImportViewProps) {
  const [activeParseData, setActiveParseData] = React.useState<ParseStatementResponse | null>(null);
  const [targetAccountId, setTargetAccountId] = React.useState<string>("");

  const handleParsed = (result: ParseStatementResponse, accountId: string) => {
    setActiveParseData(result);
    setTargetAccountId(accountId);
  };

  const handleClearPreview = () => {
    setActiveParseData(null);
    setTargetAccountId("");
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Statement Import Engine</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Upload and extract financial data from CSV, Excel, and PDF bank statements with automated duplicate detection and category tagging.
        </p>
      </div>

      {/* Active Preview Mode or Upload Card */}
      {activeParseData ? (
        <ParsedPreviewTable
          parseData={activeParseData}
          accountId={targetAccountId}
          categories={categories}
          onImportComplete={handleClearPreview}
          onCancel={handleClearPreview}
        />
      ) : (
        <UploadStatementCard accounts={accounts} onParsed={handleParsed} />
      )}

      {/* Import History */}
      <ImportHistoryTable importJobs={importJobs} />
    </div>
  );
}


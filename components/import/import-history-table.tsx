"use client";

import * as React from "react";
import { format } from "date-fns";
import { FileSpreadsheet, Trash2, CheckCircle2, AlertCircle, Clock } from "lucide-react";
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
import { deleteImportJobAction } from "@/app/(dashboard)/import/actions";

interface ImportHistoryTableProps {
  importJobs: Tables<"import_jobs">[];
}

export function ImportHistoryTable({ importJobs }: ImportHistoryTableProps) {
  const handleDelete = async (jobId: string) => {
    try {
      const res = await deleteImportJobAction(jobId);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.error || "Failed to delete record");
      }
    } catch {
      toast.error("Failed to delete record");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          Import History & Audit Log
        </CardTitle>
        <CardDescription>
          Record of all uploaded bank statements and parsing execution summaries.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {importJobs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No bank statements imported yet. Upload your first statement above.
          </p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Parsed</TableHead>
                  <TableHead className="text-right">Imported</TableHead>
                  <TableHead className="text-right">Duplicates</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium text-xs max-w-[200px] truncate">
                      {job.file_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="uppercase font-mono text-[10px]">
                        {job.file_format}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {job.status === "completed" ? (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-300 dark:border-emerald-800 text-[10px] gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Completed
                        </Badge>
                      ) : job.status === "failed" ? (
                        <Badge variant="destructive" className="text-[10px] gap-1">
                          <AlertCircle className="h-3 w-3" /> Failed
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <Clock className="h-3 w-3" /> {job.status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {job.total_parsed}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold text-emerald-600">
                      {job.total_imported}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {job.total_duplicates}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(job.created_at), "dd MMM yyyy, HH:mm")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(job.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


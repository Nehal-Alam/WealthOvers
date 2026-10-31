"use client";

import * as React from "react";
import { format } from "date-fns";
import { History, CheckCircle2, AlertCircle, ShieldAlert } from "lucide-react";
import { Tables } from "@/types/database";
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

interface SyncHistoryTableProps {
  logs: Tables<"sync_logs">[];
  devices: Tables<"devices">[];
}

export function SyncHistoryTable({ logs, devices }: SyncHistoryTableProps) {
  const getDeviceName = (deviceId: string) => {
    const dev = devices.find((d) => d.id === deviceId);
    return dev ? dev.device_name : "Revoked Device";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          Synchronization History & Audit Trail
        </CardTitle>
        <CardDescription>
          Live stream of device sync attempts, ingested batches, and security validations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No synchronization events logged yet. Paired devices will report sync logs here.
          </p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Ingested</TableHead>
                  <TableHead className="text-right">Flagged Review</TableHead>
                  <TableHead>Notes / Error</TableHead>
                  <TableHead className="text-right">Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium text-xs">
                      {getDeviceName(log.device_id)}
                    </TableCell>
                    <TableCell>
                      {log.sync_status === "success" ? (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-300 dark:border-emerald-800 text-[10px] gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Success
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px] gap-1">
                          <AlertCircle className="h-3 w-3" /> Failed
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {log.records_received}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold text-emerald-600">
                      {log.records_ingested}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-amber-600">
                      {log.records_flagged_for_review}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[220px] truncate">
                      {log.error_message || "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.created_at), "dd MMM, HH:mm:ss")}
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


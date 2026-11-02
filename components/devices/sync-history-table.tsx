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
    <Card className="border border-border/80 bg-card rounded-2xl shadow-xs">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
          <History className="h-4 w-4 text-primary" />
          Synchronization History & Audit Trail
        </CardTitle>
        <CardDescription className="text-xs">
          Live stream of device sync attempts, ingested batches, and security validations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">
            No synchronization events logged yet. Paired devices will report sync logs here.
          </p>
        ) : (
          <div className="rounded-xl border border-border/60 overflow-x-auto bg-card">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/60 bg-surface-secondary/40">
                  <TableHead className="text-xs font-semibold text-muted-foreground">Device</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">Status</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-muted-foreground">Received</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-muted-foreground">Ingested</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-muted-foreground">Flagged Review</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">Notes / Error</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-muted-foreground">Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/60">
                {logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-surface-secondary/30 transition-colors">
                    <TableCell className="font-semibold text-xs text-foreground">
                      {getDeviceName(log.device_id)}
                    </TableCell>
                    <TableCell>
                      {log.sync_status === "success" ? (
                        <Badge variant="outline" className="text-success border-success/30 bg-success/10 text-[10px] gap-1 font-medium">
                          <CheckCircle2 className="h-3 w-3" /> Success
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-danger border-danger/30 bg-danger/10 text-[10px] gap-1 font-medium">
                          <AlertCircle className="h-3 w-3" /> Failed
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-foreground">
                      {log.records_received}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold text-success">
                      {log.records_ingested}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-warning font-medium">
                      {log.records_flagged_for_review}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[220px] truncate">
                      {log.error_message || "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap font-mono">
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

"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  Smartphone,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Lock,
  Clock,
  Wifi,
  AlertTriangle,
  Activity,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Tables } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/financial/metric-card";
import { PairDeviceDialog } from "./pair-device-dialog";
import { SyncHistoryTable } from "./sync-history-table";
import { SyncSimulatorCard } from "./sync-simulator-card";
import { DetectedTransactionsCard } from "./detected-transactions-card";
import { revokeDeviceAction, deleteDeviceAction } from "@/app/(dashboard)/devices/actions";

interface DevicesViewProps {
  devices: Tables<"devices">[];
  syncLogs: Tables<"sync_logs">[];
  transactions?: Tables<"transactions">[];
  accounts?: Tables<"accounts">[];
  categories?: Tables<"categories">[];
}

export function DevicesView({
  devices,
  syncLogs,
  transactions = [],
  accounts = [],
  categories = [],
}: DevicesViewProps) {
  const handleRevoke = async (deviceId: string, name: string) => {
    if (!confirm(`Are you sure you want to revoke "${name}"? It will be immediately blocked from syncing transactions.`)) {
      return;
    }
    try {
      const res = await revokeDeviceAction(deviceId);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.error || "Failed to revoke device");
      }
    } catch {
      toast.error("Failed to revoke device");
    }
  };

  const handleDelete = async (deviceId: string) => {
    if (!confirm("Are you sure you want to delete this device and all its sync logs?")) {
      return;
    }
    try {
      const res = await deleteDeviceAction(deviceId);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.error || "Failed to delete device");
      }
    } catch {
      toast.error("Failed to delete device");
    }
  };

  // Telemetry Aggregates (Truthful Metrics: No fake 100% when no sync has occurred)
  const { activeDevicesCount, totalTransactionsSynced, successRateText, successRateSubtitle } = React.useMemo(() => {
    const active = devices.filter((d) => d.status === "active").length;
    const synced = syncLogs.reduce((acc, l) => acc + (l.records_ingested || 0), 0);
    const hasLogs = syncLogs.length > 0;
    const rate = hasLogs
      ? Math.round((syncLogs.filter((l) => l.sync_status === "success").length / syncLogs.length) * 100)
      : null;
    return {
      activeDevicesCount: active,
      totalTransactionsSynced: synced,
      successRateText: rate !== null ? `${rate}%` : "N/A",
      successRateSubtitle: hasLogs
        ? "On-device parser reliability"
        : "No synchronization events yet",
    };
  }, [devices, syncLogs]);

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Android Companion Synchronization
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Pair and manage Android companion devices for automatic, on-device financial transaction capture.
          </p>
        </div>
        <PairDeviceDialog />
      </div>

      {/* Sync Telemetry KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Active Devices"
          amount={activeDevicesCount}
          formatType="count"
          subtitle={`${devices.length} total paired hardware`}
          icon={Smartphone}
          iconColor="#244B3C"
        />
        <MetricCard
          title="Synced Transactions"
          amount={totalTransactionsSynced}
          formatType="count"
          subtitle="Processed via companion channel"
          icon={Zap}
          iconColor="#8BA58C"
        />
        <MetricCard
          title="Ingestion Success Rate"
          amount={successRateText}
          formatType={successRateText.includes("%") ? "percent" : undefined}
          subtitle={successRateSubtitle}
          icon={CheckCircle2}
          iconColor="#39805B"
        />
      </div>

      {/* Security & Privacy Banner - Leftovers Sage Theme */}
      <div className="rounded-2xl border border-primary/20 bg-surface-secondary/70 dark:bg-surface-secondary/30 p-5 space-y-2">
        <div className="flex items-center gap-2 text-primary font-bold text-sm">
          <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
          <span>Zero-Trust Privacy & On-Device Security Architecture</span>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">
          The WealthOvers Android companion app parses financial SMS notifications locally on your device. 
          Raw SMS messages, personal communications, contacts, and authentication OTPs are <strong>never uploaded or stored</strong>. 
          Only sanitized financial transaction metadata (amount, merchant, timestamp, UPI reference) is transmitted with device token authentication.
          All automated capture remains opt-in and requires your explicit review.
        </p>
      </div>

      {/* Section 10: Automatic Transaction Detection & Review Section */}
      <DetectedTransactionsCard
        transactions={transactions}
        accounts={accounts}
        categories={categories}
      />

      {/* Devices List */}
      <div className="space-y-4">
        <h3 className="font-bold text-base text-foreground">Paired Devices ({devices.length})</h3>

        {devices.length === 0 ? (
          /* Section 11 Onboarding Empty State */
          <div className="rounded-2xl border border-dashed border-border p-8 sm:p-12 text-center bg-card">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
              <Smartphone className="h-6 w-6" />
            </div>
            <h4 className="text-base font-bold text-foreground">No Companion Devices Paired</h4>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md mx-auto leading-relaxed">
              Pair your Android phone to automatically capture UPI, debit card, and banking transactions in real-time.
            </p>
            <div className="mt-3 p-3 rounded-lg bg-surface-secondary/40 border border-border/60 max-w-sm mx-auto text-left text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Example: </span>
              Samsung Galaxy or Google Pixel running the WealthOvers companion service.
            </div>
            <div className="pt-5">
              <PairDeviceDialog />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices.map((device) => {
              const isActive = device.status === "active";

              return (
                <Card
                  key={device.id}
                  className={`border border-border/80 rounded-2xl bg-card shadow-xs transition-colors ${
                    isActive ? "hover:border-primary/50" : "opacity-75 bg-surface-secondary/30 border-danger/20"
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                          <Smartphone className="h-4 w-4 text-primary" />
                          {device.device_name}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {device.device_model || "Android Device"} • v{device.app_version || "1.0.0"}
                        </CardDescription>
                      </div>
                      {isActive ? (
                        <Badge variant="outline" className="text-success border-success/30 bg-success/10 text-[10px] gap-1 font-medium">
                          <Wifi className="h-3 w-3" /> Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-danger border-danger/30 bg-danger/10 text-[10px] gap-1 font-medium">
                          <Lock className="h-3 w-3" /> Revoked
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-0">
                    <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border/60">
                      <div className="flex justify-between">
                        <span>Last Synchronized:</span>
                        <span className="font-medium text-foreground">
                          {device.last_sync_at
                            ? format(new Date(device.last_sync_at), "dd MMM yyyy, HH:mm")
                            : "Never"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Paired On:</span>
                        <span className="text-foreground">{format(new Date(device.created_at), "dd MMM yyyy")}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                      {isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs text-warning border-warning/30 hover:bg-warning/10"
                          onClick={() => handleRevoke(device.id, device.device_name)}
                        >
                          <Lock className="h-3.5 w-3.5 mr-1" />
                          Revoke Access
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-danger hover:bg-danger/10 shrink-0"
                        onClick={() => handleDelete(device.id)}
                        aria-label="Delete companion device"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Interactive Verification Console / Simulator */}
      {devices.length > 0 && <SyncSimulatorCard devices={devices} />}

      {/* Sync Logs */}
      <SyncHistoryTable logs={syncLogs} devices={devices} />
    </div>
  );
}

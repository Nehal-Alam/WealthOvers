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
} from "lucide-react";
import { toast } from "sonner";

import { Tables } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PairDeviceDialog } from "./pair-device-dialog";
import { SyncHistoryTable } from "./sync-history-table";
import { SyncSimulatorCard } from "./sync-simulator-card";
import { revokeDeviceAction, deleteDeviceAction } from "@/app/(dashboard)/devices/actions";

interface DevicesViewProps {
  devices: Tables<"devices">[];
  syncLogs: Tables<"sync_logs">[];
}

export function DevicesView({ devices, syncLogs }: DevicesViewProps) {
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

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Android Companion Synchronization</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Pair and manage Android companion devices for automatic, on-device financial transaction capture.
          </p>
        </div>
        <PairDeviceDialog />
      </div>

      {/* Security & Privacy Banner */}
      <div className="rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20 p-5 space-y-2">
        <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-300 font-semibold text-sm">
          <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          Zero-Trust Privacy & Data Integrity Architecture
        </div>
        <p className="text-xs text-indigo-800/80 dark:text-indigo-300/80 leading-relaxed">
          The WealthOvers Android companion app parses financial SMS notifications locally on your device. 
          Raw SMS messages, personal communications, contacts, and authentication OTPs are <strong>never uploaded or stored</strong>. 
          Only sanitized financial transaction metadata (amount, merchant, timestamp, UPI reference) is transmitted with device token authentication.
        </p>
      </div>

      {/* Devices List */}
      <div className="space-y-4">
        <h3 className="font-semibold text-base">Paired Devices ({devices.length})</h3>

        {devices.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center space-y-3">
              <Smartphone className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <div>
                <p className="font-semibold text-sm">No Companion Devices Paired</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Pair your Android phone to automatically capture UPI, debit card, and banking transactions in real-time.
                </p>
              </div>
              <div className="pt-2">
                <PairDeviceDialog />
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices.map((device) => {
              const isActive = device.status === "active";

              return (
                <Card
                  key={device.id}
                  className={`border transition-colors ${
                    isActive ? "hover:border-primary/50" : "opacity-75 bg-muted/20 border-destructive/20"
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Smartphone className="h-4 w-4 text-primary" />
                          {device.device_name}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {device.device_model || "Android Device"} • v{device.app_version || "1.0.0"}
                        </CardDescription>
                      </div>
                      {isActive ? (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-300 dark:border-emerald-800 text-[10px] gap-1">
                          <Wifi className="h-3 w-3" /> Active
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px] gap-1">
                          <Lock className="h-3 w-3" /> Revoked
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-0">
                    <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
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
                        <span>{format(new Date(device.created_at), "dd MMM yyyy")}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      {isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs text-amber-600 border-amber-300 dark:border-amber-900 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                          onClick={() => handleRevoke(device.id, device.device_name)}
                        >
                          <Lock className="h-3.5 w-3.5 mr-1" />
                          Revoke Access
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
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


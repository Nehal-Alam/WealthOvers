"use client";

import * as React from "react";
import { Terminal, Play, CheckCircle2, ShieldAlert, WifiOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Tables } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SyncSimulatorCardProps {
  devices: Tables<"devices">[];
}

export function SyncSimulatorCard({ devices }: SyncSimulatorCardProps) {
  const [selectedDeviceId, setSelectedDeviceId] = React.useState<string>(devices[0]?.id || "");
  const [deviceToken, setDeviceToken] = React.useState<string>("");
  const [isSimulating, setIsSimulating] = React.useState(false);
  const [resultLog, setResultLog] = React.useState<string | null>(null);

  const activeDevices = devices.filter((d) => d.status === "active");

  const runSimulation = async (scenario: "online" | "offline_batch" | "duplicate" | "malicious_otp") => {
    if (!selectedDeviceId) {
      toast.error("Please select an active device first");
      return;
    }
    if (!deviceToken) {
      toast.error("Please enter the device token (wov_dev_...) to simulate sync");
      return;
    }

    setIsSimulating(true);
    setResultLog("Executing request to POST /api/v1/transactions/sync...\n");

    try {
      const now = new Date();
      let records: any[] = [];

      if (scenario === "online") {
        records = [
          {
            externalId: `notif_${Date.now()}`,
            amount: "450.00",
            transactionType: "expense",
            merchant: "Swiggy",
            description: "Swiggy Order #39281",
            accountIdentifier: "4321",
            timestamp: now.toISOString(),
            referenceNumber: `UPI/${Date.now().toString().slice(-8)}`,
            sourceApplication: "com.phonepe.app",
            parserConfidence: 0.96,
          },
        ];
      } else if (scenario === "offline_batch") {
        // Offline batch: 3 transactions queued during airplane mode / network loss
        const t1 = new Date(now.getTime() - 3600000);
        const t2 = new Date(now.getTime() - 1800000);
        records = [
          {
            externalId: `offline_1_${Date.now()}`,
            amount: "120.00",
            transactionType: "expense",
            merchant: "Uber India",
            description: "Uber Ride Bangalore",
            timestamp: t1.toISOString(),
            parserConfidence: 0.95,
          },
          {
            externalId: `offline_2_${Date.now()}`,
            amount: "850.00",
            transactionType: "expense",
            merchant: "DMart Retail",
            description: "POS Grocery Purchase",
            timestamp: t2.toISOString(),
            parserConfidence: 0.92,
          },
          {
            externalId: `offline_3_${Date.now()}`,
            amount: "25000.00",
            transactionType: "income",
            merchant: "Freelance Payment",
            description: "NEFT Salary Inflow",
            timestamp: now.toISOString(),
            parserConfidence: 0.98,
          },
        ];
      } else if (scenario === "duplicate") {
        // Duplicate: Send the same fixed hash repeatedly
        const fixedHash = "fixed_test_duplicate_hash_77889900";
        records = [
          {
            externalId: "dup_attempt_1",
            amount: "999.00",
            transactionType: "expense",
            merchant: "Amazon India",
            timestamp: now.toISOString(),
            parserConfidence: 0.95,
            idempotencyHash: fixedHash,
          },
        ];
      } else if (scenario === "malicious_otp") {
        // Malicious test: contains OTP keyword, should be strictly rejected with HTTP 400
        records = [
          {
            externalId: "sms_leak_attempt",
            amount: "100.00",
            transactionType: "expense",
            merchant: "Bank Alert",
            description: "Your OTP for transaction is 482910. Do not share this with anyone.",
            timestamp: now.toISOString(),
            parserConfidence: 0.2,
          },
        ];
      }

      const res = await fetch("/api/v1/transactions/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-Id": selectedDeviceId,
          "X-Device-Token": deviceToken.trim(),
        },
        body: JSON.stringify({
          syncBatchId: crypto.randomUUID(),
          records,
        }),
      });

      const json = await res.json();
      setResultLog(
        `HTTP Status: ${res.status} ${res.statusText}\nResponse:\n` +
          JSON.stringify(json, null, 2)
      );

      if (res.ok && json.success) {
        toast.success("Sync executed successfully!");
      } else if (res.status === 400 && scenario === "malicious_otp") {
        toast.success("Security Defense Verified: Malicious OTP rejected by server policy!");
      } else {
        toast.error(json.error || "Sync failed");
      }
    } catch (err: any) {
      setResultLog(`Error: ${err.message}`);
      toast.error("Failed to execute sync test");
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <Card className="border-muted">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Terminal className="h-4 w-4 text-primary" />
          Companion Sync Simulator & Verification Console
        </CardTitle>
        <CardDescription>
          Verify the end-to-end sync pipeline, offline batch catch-up, idempotency deduplication, and zero-trust OTP defense.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="sim-device">Active Companion Device</Label>
            <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select device" />
              </SelectTrigger>
              <SelectContent>
                {activeDevices.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.device_name} ({d.device_model || "Android"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sim-token">Device Token (wov_dev_...)</Label>
            <Input
              id="sim-token"
              placeholder="Paste paired token"
              type="password"
              value={deviceToken}
              onChange={(e) => setDeviceToken(e.target.value)}
              className="font-mono text-xs"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            disabled={isSimulating}
            onClick={() => runSimulation("online")}
            className="gap-1.5 text-xs"
          >
            <Play className="h-3 w-3 text-emerald-500" />
            1. Test Real-Time Sync (Swiggy ₹450)
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={isSimulating}
            onClick={() => runSimulation("offline_batch")}
            className="gap-1.5 text-xs"
          >
            <WifiOff className="h-3 w-3 text-primary" />
            2. Test Offline Recovery Batch (3 txns)
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={isSimulating}
            onClick={() => runSimulation("duplicate")}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className="h-3 w-3 text-amber-500" />
            3. Test Duplicate Deduplication
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={isSimulating}
            onClick={() => runSimulation("malicious_otp")}
            className="gap-1.5 text-xs text-destructive border-destructive/30"
          >
            <ShieldAlert className="h-3 w-3 text-destructive" />
            4. Test OTP Defense Rejection
          </Button>
        </div>

        {/* Terminal Result Display */}
        {resultLog && (
          <div className="rounded-md bg-zinc-950 p-3 font-mono text-xs text-zinc-200 overflow-x-auto max-h-48 border border-zinc-800">
            <pre>{resultLog}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


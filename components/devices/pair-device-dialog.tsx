"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Smartphone, Plus, Copy, Check, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerDeviceSchema, RegisterDeviceInput } from "@/lib/validations/devices";
import { registerDeviceAction } from "@/app/(dashboard)/devices/actions";

export function PairDeviceDialog() {
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [registeredData, setRegisteredData] = React.useState<{
    deviceId: string;
    deviceToken: string;
  } | null>(null);
  const [copied, setCopied] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RegisterDeviceInput>({
    resolver: zodResolver(registerDeviceSchema),
    defaultValues: {
      device_name: "Pixel 8 Pro",
      device_model: "Google Pixel 8 Pro",
      app_version: "1.0.0",
    },
  });

  const onSubmit = async (data: RegisterDeviceInput) => {
    setIsSubmitting(true);
    try {
      const res = await registerDeviceAction(data);
      if (res.success && res.data) {
        toast.success(res.message);
        setRegisteredData(res.data);
      } else {
        toast.error(res.error || "Failed to register device");
      }
    } catch {
      toast.error("An error occurred during device registration");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (registeredData?.deviceToken) {
      navigator.clipboard.writeText(registeredData.deviceToken);
      setCopied(true);
      toast.success("Device token copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    reset();
    setRegisteredData(null);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => (val ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Smartphone className="h-4 w-4" />
          Pair New Device
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Pair Android Companion Device</DialogTitle>
          <DialogDescription>
            Register an Android smartphone for automated on-device financial transaction synchronization.
          </DialogDescription>
        </DialogHeader>

        {registeredData ? (
          <div className="space-y-4 py-3">
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-4 border border-emerald-200 dark:border-emerald-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-sm">
                <ShieldCheck className="h-4 w-4" /> Device Paired Successfully!
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-300">
                Copy your device token below. Store it securely in the Android companion app. For security, this token will not be displayed again.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Device ID</Label>
              <Input
                readOnly
                value={registeredData.deviceId}
                className="font-mono text-xs bg-muted"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Secret Device Token</Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={registeredData.deviceToken}
                  className="font-mono text-xs bg-muted"
                />
                <Button size="icon" variant="outline" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="text-xs text-muted-foreground p-3 bg-muted rounded-md space-y-1">
              <p className="font-medium text-foreground">API Headers for Companion App:</p>
              <p className="font-mono">X-Device-Id: {registeredData.deviceId}</p>
              <p className="font-mono">X-Device-Token: {registeredData.deviceToken.slice(0, 15)}...</p>
            </div>

            <DialogFooter>
              <Button onClick={handleClose} className="w-full">
                I Have Saved My Device Token
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="device_name">Device Name</Label>
              <Input
                id="device_name"
                placeholder="e.g. My Primary Phone"
                {...register("device_name")}
              />
              {errors.device_name && (
                <p className="text-xs text-destructive">{errors.device_name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="device_model">Device Model (Optional)</Label>
              <Input
                id="device_model"
                placeholder="e.g. Samsung Galaxy S24, Pixel 8"
                {...register("device_model")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="app_version">App Version</Label>
              <Input id="app_version" placeholder="1.0.0" {...register("app_version")} />
            </div>

            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 p-3 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Zero-Trust Guarantee: The Android companion parses notifications locally. OTPs, passwords, and personal messages are never transmitted.
              </span>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Generating Keys..." : "Generate Pairing Token"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}


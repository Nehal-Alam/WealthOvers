"use client";

import * as React from "react";
import Link from "next/link";
import {
  User,
  Bot,
  Smartphone,
  Shield,
  Eye,
  EyeOff,
  Sparkles,
  ChevronRight,
  Download,
  Lock,
  Cpu,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUIStore } from "@/stores/ui-store";
import { toast } from "sonner";

interface MobileSettingsExtrasProps {
  userEmail?: string;
  userName?: string;
}

export function MobileSettingsExtras({
  userEmail = "user@wealthovers.in",
  userName = "Investor",
}: MobileSettingsExtrasProps) {
  const { isPrivacyMode, togglePrivacyMode } = useUIStore();
  const [selectedAI, setSelectedAI] = React.useState<string>("gemini");

  const handleAIChange = (val: string) => {
    setSelectedAI(val);
    toast.success(`Default AI assistant provider set to ${val.toUpperCase()}`);
  };

  return (
    <div className="space-y-4">
      {/* 1. Profile Card */}
      <Card className="bg-surface border-border shadow-xs rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-11 w-11 rounded-full bg-surface-elevated border border-border text-terminalAccent flex items-center justify-center font-mono font-bold text-sm">
              {userName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-sm text-text-primary">{userName}</h3>
              <p className="text-xs text-text-secondary font-mono truncate max-w-[200px]">
                {userEmail}
              </p>
            </div>
          </div>
          <Link href="/profile">
            <Button variant="outline" size="sm" className="h-8 text-xs font-mono border-border">
              Edit
            </Button>
          </Link>
        </div>
      </Card>

      {/* 2. Privacy Mode Toggle */}
      <Card className="bg-surface border-border shadow-xs rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5 pr-4">
            <div className="flex items-center space-x-2">
              {isPrivacyMode ? (
                <EyeOff className="h-4 w-4 text-terminalAccent" />
              ) : (
                <Eye className="h-4 w-4 text-text-secondary" />
              )}
              <span className="font-semibold text-xs text-text-primary">
                Privacy Mode (Mask Balances)
              </span>
            </div>
            <p className="text-[11px] text-text-secondary">
              Replaces financial amounts with &bull;&bull;&bull;&bull; across the dashboard
            </p>
          </div>
          <Switch
            checked={isPrivacyMode}
            onCheckedChange={togglePrivacyMode}
            aria-label="Toggle Privacy Mode"
          />
        </div>
      </Card>

      {/* 3. AI Provider Preferences */}
      <Card className="bg-surface border-border shadow-xs rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Cpu className="h-4 w-4 text-terminalAccent" />
            <span className="font-semibold text-xs text-text-primary">
              AI Provider Preference
            </span>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono border-positive text-positive">
            SANDBOX ACTIVE
          </Badge>
        </div>

        <p className="text-[11px] text-text-secondary">
          Choose the default LLM provider for the AI Finance Assistant
        </p>

        <Select value={selectedAI} onValueChange={handleAIChange}>
          <SelectTrigger className="w-full h-9 text-xs font-mono bg-surface-elevated border-border">
            <SelectValue placeholder="Select AI Provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gemini" className="text-xs font-mono">
              Google Gemini (gemini-1.5-flash) • Default
            </SelectItem>
            <SelectItem value="claude" className="text-xs font-mono">
              Anthropic Claude (claude-3-5-sonnet)
            </SelectItem>
            <SelectItem value="openai" className="text-xs font-mono">
              OpenAI (gpt-4o)
            </SelectItem>
            <SelectItem value="local" className="text-xs font-mono">
              Local Deterministic Rule Engine (Offline)
            </SelectItem>
          </SelectContent>
        </Select>
      </Card>

      {/* 4. Connected Devices (Android Sync) */}
      <Card className="bg-surface border-border shadow-xs rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-info/10 text-info flex items-center justify-center">
              <Smartphone className="h-4 w-4" />
            </div>
            <div>
              <h4 className="font-semibold text-xs text-text-primary">
                Connected Devices
              </h4>
              <p className="text-[11px] text-text-secondary">
                Android companion SMS & transaction sync
              </p>
            </div>
          </div>
          <Link href="/devices">
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs text-terminalAccent">
              <span>Manage</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

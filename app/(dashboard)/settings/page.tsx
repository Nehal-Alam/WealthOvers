import React from "react";
import { createClient } from "@/lib/supabase/server";
import { Globe, Shield, Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/types/database";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: settingsData } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const settings = settingsData as Tables<"user_settings"> | null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Financial Preferences
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure currency standards, fiscal calendars, and application behavior
        </p>
      </div>

      <div className="space-y-6">
        {/* Currency & Localization */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              Currency & Regional Standards
            </CardTitle>
            <CardDescription className="text-xs">
              Configured defaults for monetary formatting and accounting periods
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 p-3 rounded-lg border bg-card/60">
                <span className="text-xs text-muted-foreground font-medium">Base Currency</span>
                <p className="text-base font-bold text-foreground">
                  {settings?.currency || "INR"} (₹)
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Default currency for all accounts and net worth rollups.
                </p>
              </div>

              <div className="space-y-1.5 p-3 rounded-lg border bg-card/60">
                <span className="text-xs text-muted-foreground font-medium">Financial Year Cycle</span>
                <p className="text-base font-bold text-foreground">
                  April to March (India standard)
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Starts month {settings?.financial_year_start_month || 4} of every calendar year.
                </p>
              </div>

              <div className="space-y-1.5 p-3 rounded-lg border bg-card/60">
                <span className="text-xs text-muted-foreground font-medium">Timezone</span>
                <p className="text-base font-bold text-foreground">
                  {settings?.timezone || "Asia/Kolkata"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Used for daily recurring transaction runs and statement timestamps.
                </p>
              </div>

              <div className="space-y-1.5 p-3 rounded-lg border bg-card/60">
                <span className="text-xs text-muted-foreground font-medium">Number Formatting Locale</span>
                <p className="text-base font-bold text-foreground">
                  {settings?.locale || "en-IN"} (Lakhs & Crores)
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Applies ₹1,50,000 Indian digit grouping style.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Security & Privacy */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-500" />
              Data Privacy & Access Control
            </CardTitle>
            <CardDescription className="text-xs">
              Review how your data is isolated and protected
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3.5 rounded-lg border bg-emerald-500/5 border-emerald-500/20 text-xs space-y-1 text-muted-foreground">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                PostgreSQL Row Level Security Active
              </p>
              <p>
                Every table in your financial database verifies your user session token (`auth.uid()`).
                Other users or unauthenticated clients cannot read, insert, update or delete your records.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Export Data */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Download className="h-4 w-4 text-primary" />
              Data Portability
            </CardTitle>
            <CardDescription className="text-xs">
              Export your full financial dataset anytime
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" asChild>
              <a href="/reports">
                Go to Reports & Data Export
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

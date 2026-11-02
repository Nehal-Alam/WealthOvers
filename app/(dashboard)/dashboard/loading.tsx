import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Title & Action Toolbar Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="h-7 w-52 bg-muted rounded-md" />
          <div className="h-4 w-72 bg-muted/60 rounded-md mt-1.5" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-28 bg-muted rounded-md" />
          <div className="h-8 w-24 bg-muted rounded-md" />
          <div className="h-8 w-8 bg-muted rounded-md" />
        </div>
      </div>

      {/* Primary Financial Hierarchy (7 Core Metrics) */}
      <div className="space-y-3.5">
        {/* Tier 1: 3 Balance Sheet Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="shadow-xs border-border/80">
              <CardContent className="p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="h-4 w-28 bg-muted rounded" />
                  <div className="h-8 w-8 rounded-lg bg-muted" />
                </div>
                <div className="h-7 w-36 bg-muted/80 rounded" />
                <div className="h-3 w-44 bg-muted/50 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tier 2: 4 Operational Cash Flow Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="shadow-xs border-border/80">
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <div className="h-3.5 w-24 bg-muted rounded" />
                  <div className="h-6 w-6 rounded bg-muted" />
                </div>
                <div className="h-6 w-28 bg-muted/80 rounded" />
                <div className="h-3 w-32 bg-muted/50 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Visualisations Grid: Net Worth Trajectory & Asset Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-xs border-border/80">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div className="space-y-1.5">
              <div className="h-4 w-36 bg-muted rounded" />
              <div className="h-3 w-48 bg-muted/60 rounded" />
            </div>
            <div className="h-7 w-20 bg-muted rounded" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-36 bg-muted/30 rounded-lg" />
            <div className="h-4 w-full bg-muted/40 rounded" />
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/80">
          <CardHeader className="pb-3">
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-3 w-40 bg-muted/60 rounded mt-1.5" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-3 w-full bg-muted/40 rounded-full" />
            <div className="space-y-2.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="h-3.5 w-28 bg-muted rounded" />
                  <div className="h-3.5 w-16 bg-muted rounded" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Modules: Accounts & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((col) => (
          <Card key={col} className="shadow-xs border-border/80">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div className="space-y-1">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-3 w-48 bg-muted/60 rounded" />
              </div>
              <div className="h-7 w-20 bg-muted rounded" />
            </CardHeader>
            <CardContent className="space-y-2.5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-muted/20">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-lg bg-muted shrink-0" />
                    <div className="space-y-1">
                      <div className="h-3.5 w-28 bg-muted rounded" />
                      <div className="h-3 w-20 bg-muted/50 rounded" />
                    </div>
                  </div>
                  <div className="h-4 w-20 bg-muted rounded" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

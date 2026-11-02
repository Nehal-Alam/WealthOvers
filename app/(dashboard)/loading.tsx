import React from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function GlobalDashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="h-7 w-48 bg-muted rounded-md" />
          <div className="h-4 w-64 bg-muted/60 rounded-md mt-1.5" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-24 bg-muted rounded-md" />
          <div className="h-8 w-28 bg-muted rounded-md" />
        </div>
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="shadow-xs border-border/80">
            <CardContent className="p-5 space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-4 w-28 bg-muted rounded" />
                <div className="h-7 w-7 rounded-lg bg-muted" />
              </div>
              <div className="h-7 w-36 bg-muted/80 rounded" />
              <div className="h-3 w-40 bg-muted/50 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Skeleton */}
      <Card className="shadow-xs border-border/80">
        <CardContent className="p-6 space-y-4">
          <div className="h-6 w-44 bg-muted rounded" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 w-full bg-muted/40 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


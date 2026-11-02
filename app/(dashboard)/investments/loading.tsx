import React from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function InvestmentsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="h-7 w-52 bg-muted rounded-md" />
          <div className="h-4 w-72 bg-muted/60 rounded-md mt-1.5" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-32 bg-muted rounded-md" />
        </div>
      </div>

      {/* Portfolio Summary 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="shadow-xs border-border/80">
            <CardContent className="p-4 space-y-2">
              <div className="h-3.5 w-24 bg-muted rounded" />
              <div className="h-6 w-28 bg-muted/80 rounded" />
              <div className="h-3 w-32 bg-muted/50 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Asset Class Filter Tabs */}
      <div className="h-9 w-72 bg-muted/40 rounded-lg" />

      {/* Holdings Table Skeleton */}
      <Card className="shadow-xs border-border/80">
        <CardContent className="p-4 space-y-3">
          <div className="h-8 w-full bg-muted/40 rounded" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex justify-between items-center py-2.5 border-b border-border/40">
              <div className="space-y-1">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-3 w-16 bg-muted/50 rounded" />
              </div>
              <div className="h-4 w-20 bg-muted rounded" />
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-4 w-16 bg-muted rounded" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

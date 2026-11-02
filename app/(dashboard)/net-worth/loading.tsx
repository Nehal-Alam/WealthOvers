import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function NetWorthLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="h-7 w-56 bg-muted rounded-md" />
          <div className="h-4 w-72 bg-muted/60 rounded-md mt-1.5" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-28 bg-muted rounded-md" />
          <div className="h-8 w-32 bg-muted rounded-md" />
        </div>
      </div>

      {/* 3 Core Balance Sheet Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="shadow-xs border-border/80">
            <CardContent className="p-5 space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-8 w-8 rounded-lg bg-muted" />
              </div>
              <div className="h-7 w-40 bg-muted/80 rounded" />
              <div className="h-3 w-48 bg-muted/50 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Financial Health Score & Ratios */}
      <Card className="shadow-xs border-border/80">
        <CardContent className="p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3.5 w-24 bg-muted rounded" />
                <div className="h-6 w-20 bg-muted/80 rounded" />
                <div className="h-2.5 w-32 bg-muted/50 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 2-Column: Assets Breakdown vs Liabilities Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((col) => (
          <Card key={col} className="shadow-xs border-border/80">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div className="space-y-1">
                <div className="h-4 w-36 bg-muted rounded" />
                <div className="h-3 w-48 bg-muted/60 rounded" />
              </div>
              <div className="h-6 w-16 bg-muted rounded" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20">
                  <div className="flex items-center space-x-3">
                    <div className="h-3 w-3 rounded-full bg-muted shrink-0" />
                    <div className="h-4 w-32 bg-muted rounded" />
                  </div>
                  <div className="h-4 w-24 bg-muted rounded" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}


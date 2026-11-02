import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AssetsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="h-7 w-52 bg-muted rounded-md" />
          <div className="h-4 w-72 bg-muted/60 rounded-md mt-1.5" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-24 bg-muted rounded-md" />
          <div className="h-8 w-24 bg-muted rounded-md" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="shadow-xs border-border/80">
            <CardContent className="p-4 space-y-2">
              <div className="h-3.5 w-28 bg-muted rounded" />
              <div className="h-6 w-32 bg-muted/80 rounded" />
              <div className="h-3 w-36 bg-muted/50 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 2-Column Assets vs Liabilities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((col) => (
          <Card key={col} className="shadow-xs border-border/80">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div className="space-y-1">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-3 w-40 bg-muted/60 rounded" />
              </div>
              <div className="h-7 w-16 bg-muted rounded" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20">
                  <div className="space-y-1">
                    <div className="h-4 w-32 bg-muted rounded" />
                    <div className="h-3 w-20 bg-muted/50 rounded" />
                  </div>
                  <div className="h-5 w-24 bg-muted rounded" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}


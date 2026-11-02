import React from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function LoansLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="h-7 w-48 bg-muted rounded-md" />
          <div className="h-4 w-72 bg-muted/60 rounded-md mt-1.5" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-24 bg-muted rounded-md" />
        </div>
      </div>

      {/* Debt Summary KPIs */}
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

      {/* Loans List */}
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i} className="shadow-xs border-border/80">
            <CardContent className="p-5 space-y-3">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="h-5 w-40 bg-muted rounded" />
                  <div className="h-3.5 w-24 bg-muted/50 rounded" />
                </div>
                <div className="h-6 w-28 bg-muted rounded" />
              </div>
              <div className="h-2 w-full bg-muted/40 rounded-full" />
              <div className="flex justify-between items-center pt-2 border-t border-border/40">
                <div className="h-3.5 w-32 bg-muted/60 rounded" />
                <div className="h-7 w-24 bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}


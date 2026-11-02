import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function ImportLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="pb-2 border-b border-border/60">
        <div className="h-7 w-48 bg-muted rounded-md" />
        <div className="h-4 w-72 bg-muted/60 rounded-md mt-1.5" />
      </div>

      {/* Upload Zone Card */}
      <Card className="shadow-xs border-border/80">
        <CardContent className="p-8 flex flex-col items-center justify-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-muted" />
          <div className="space-y-1.5 text-center">
            <div className="h-5 w-48 bg-muted rounded mx-auto" />
            <div className="h-3.5 w-64 bg-muted/60 rounded mx-auto" />
          </div>
          <div className="h-9 w-32 bg-muted rounded" />
        </CardContent>
      </Card>

      {/* Import History */}
      <Card className="shadow-xs border-border/80">
        <CardHeader className="pb-3">
          <div className="h-4 w-36 bg-muted rounded" />
          <div className="h-3 w-48 bg-muted/60 rounded mt-1.5" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between items-center py-2.5 border-b border-border/40">
              <div className="space-y-1">
                <div className="h-4 w-36 bg-muted rounded" />
                <div className="h-3 w-24 bg-muted/50 rounded" />
              </div>
              <div className="h-6 w-16 bg-muted rounded" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function SettingsLoading() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-pulse">
      {/* Header Skeleton */}
      <div className="pb-2 border-b border-border/60">
        <div className="h-7 w-56 bg-muted rounded-md" />
        <div className="h-4 w-80 bg-muted/60 rounded-md mt-1.5" />
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {[1, 2, 3].map((section) => (
          <Card key={section} className="shadow-xs border-border/80">
            <CardHeader className="pb-3">
              <div className="h-4 w-44 bg-muted rounded" />
              <div className="h-3 w-64 bg-muted/60 rounded mt-1.5" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2].map((i) => (
                  <div key={i} className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1.5">
                    <div className="h-3 w-24 bg-muted/60 rounded" />
                    <div className="h-4 w-32 bg-muted rounded" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

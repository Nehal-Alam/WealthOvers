import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function CategoriesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="h-7 w-52 bg-muted rounded-md" />
          <div className="h-4 w-72 bg-muted/60 rounded-md mt-1.5" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-28 bg-muted rounded-md" />
          <div className="h-8 w-24 bg-muted rounded-md" />
        </div>
      </div>

      {/* Categories Grid */}
      <Card className="shadow-xs border-border/80">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div className="space-y-1">
            <div className="h-4 w-36 bg-muted rounded" />
            <div className="h-3 w-48 bg-muted/60 rounded" />
          </div>
          <div className="h-7 w-24 bg-muted rounded" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-muted shrink-0" />
                  <div className="h-4 w-20 bg-muted rounded" />
                </div>
                <div className="h-3 w-14 bg-muted/50 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Categorization Rules Card */}
      <Card className="shadow-xs border-border/80">
        <CardHeader className="pb-3">
          <div className="h-4 w-44 bg-muted rounded" />
          <div className="h-3 w-60 bg-muted/60 rounded mt-1.5" />
        </CardHeader>
        <CardContent className="space-y-2.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between items-center p-3 rounded-lg border border-border/60 bg-muted/20">
              <div className="space-y-1">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-3 w-48 bg-muted/50 rounded" />
              </div>
              <div className="h-6 w-16 bg-muted rounded" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}


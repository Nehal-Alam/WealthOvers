import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function ProfileLoading() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-pulse">
      {/* Header Skeleton */}
      <div className="pb-2 border-b border-border/60">
        <div className="h-7 w-40 bg-muted rounded-md" />
        <div className="h-4 w-72 bg-muted/60 rounded-md mt-1.5" />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Avatar Card */}
        <Card className="md:col-span-1 shadow-xs border-border/80">
          <CardContent className="p-6 flex flex-col items-center space-y-4">
            <div className="h-20 w-20 rounded-full bg-muted" />
            <div className="space-y-1 text-center w-full">
              <div className="h-5 w-32 bg-muted rounded mx-auto" />
              <div className="h-3.5 w-44 bg-muted/60 rounded mx-auto" />
            </div>
            <div className="h-7 w-28 bg-muted rounded" />
          </CardContent>
        </Card>

        {/* Right Info Card */}
        <Card className="md:col-span-2 shadow-xs border-border/80">
          <CardHeader className="pb-3">
            <div className="h-4 w-36 bg-muted rounded" />
            <div className="h-3 w-48 bg-muted/60 rounded mt-1.5" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3.5 w-24 bg-muted/60 rounded" />
                <div className="h-9 w-full bg-muted/40 rounded-lg" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

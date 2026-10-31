"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error securely for telemetry / error monitoring without exposing to DOM
    console.error("Application runtime error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-lg text-center shadow-lg border-destructive/20">
        <CardHeader className="pb-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-2">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Something Went Wrong</CardTitle>
          <CardDescription className="text-sm text-muted-foreground mt-2">
            An unexpected error occurred while processing your financial data. Your data remains safe and securely isolated.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          {error.digest && (
            <div className="text-xs text-muted-foreground bg-muted p-2 rounded-md font-mono select-all">
              Error Digest: {error.digest}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => reset()} variant="default" className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard" className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                Go to Dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


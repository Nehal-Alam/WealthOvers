"use client";

import * as React from "react";
import { Sparkles, Calendar, Plus, RefreshCw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Tables } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  detectRecurringCandidatesAction,
  convertCandidateToRecurringAction,
} from "@/app/(dashboard)/recurring/actions";
import { RecurringPatternCandidate } from "@/lib/parsers/types";
import { MoneyDisplay } from "@/components/financial/money-display";

interface RecurringDetectorCardProps {
  accounts: Tables<"accounts">[];
}

export function RecurringDetectorCard({ accounts }: RecurringDetectorCardProps) {
  const [isScanning, setIsScanning] = React.useState(false);
  const [candidates, setCandidates] = React.useState<RecurringPatternCandidate[] | null>(null);
  const [convertingIdx, setConvertingIdx] = React.useState<number | null>(null);
  const [convertedNames, setConvertedNames] = React.useState<Set<string>>(new Set());

  const handleScan = async () => {
    setIsScanning(true);
    try {
      const res = await detectRecurringCandidatesAction();
      if (res.success && res.data) {
        setCandidates(res.data);
        if (res.data.length === 0) {
          toast.info("No recurring patterns detected in historical transactions yet.");
        } else {
          toast.success(`Found ${res.data.length} potential recurring bills/subscriptions!`);
        }
      } else {
        toast.error(res.error || "Failed to scan transactions");
      }
    } catch {
      toast.error("An error occurred during transaction pattern analysis");
    } finally {
      setIsScanning(false);
    }
  };

  const handleConvert = async (candidate: RecurringPatternCandidate, idx: number) => {
    if (accounts.length === 0) {
      toast.error("Please create an account first");
      return;
    }

    setConvertingIdx(idx);
    try {
      const res = await convertCandidateToRecurringAction({
        name: candidate.name,
        amount: candidate.amount,
        transactionType: candidate.transactionType,
        recurrenceInterval: candidate.recurrenceInterval,
        accountId: accounts[0].id,
        categoryId: candidate.suggestedCategoryId,
      });

      if (res.success) {
        toast.success(res.message);
        setConvertedNames((prev) => new Set(prev).add(candidate.name));
      } else {
        toast.error(res.error || "Failed to create recurring rule");
      }
    } catch {
      toast.error("Failed to convert candidate");
    } finally {
      setConvertingIdx(null);
    }
  };

  return (
    <Card className="border-indigo-100 dark:border-indigo-950/50 bg-gradient-to-br from-indigo-50/30 to-background dark:from-indigo-950/10">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            Smart Recurring Detector
          </CardTitle>
          <CardDescription>
            AI pattern detection scans your transaction history to discover recurring bills, subscriptions, and periodic salaries.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleScan}
          disabled={isScanning}
          className="gap-2 shrink-0 border-indigo-200 dark:border-indigo-900"
        >
          <RefreshCw className={`h-4 w-4 ${isScanning ? "animate-spin text-indigo-500" : ""}`} />
          {isScanning ? "Analyzing..." : "Scan Transactions"}
        </Button>
      </CardHeader>
      {candidates !== null && candidates.length > 0 && (
        <CardContent className="space-y-3 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {candidates.map((cand, idx) => {
              const isConverted = convertedNames.has(cand.name);

              return (
                <div
                  key={idx}
                  className="rounded-lg border bg-card p-4 space-y-3 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-sm line-clamp-1">{cand.name}</h4>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="secondary" className="capitalize text-[10px]">
                          {cand.recurrenceInterval}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300 dark:border-emerald-800">
                          {Math.round(cand.confidence * 100)}% match
                        </Badge>
                      </div>
                    </div>
                    <MoneyDisplay
                      amount={cand.amount}
                      className="font-bold text-sm"
                    />
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Observed {cand.sampleOccurrences.length} times in history
                  </p>

                  <Button
                    size="sm"
                    className="w-full gap-1.5 text-xs h-8"
                    variant={isConverted ? "secondary" : "default"}
                    disabled={isConverted || convertingIdx === idx}
                    onClick={() => handleConvert(cand, idx)}
                  >
                    {isConverted ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Activated
                      </>
                    ) : convertingIdx === idx ? (
                      "Activating..."
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5" />
                        Add to Recurring
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}


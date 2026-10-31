"use client";

import * as React from "react";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createInvestmentAction } from "@/app/(dashboard)/investments/actions";

interface CSVImportHoldingsDialogProps {
  trigger?: React.ReactNode;
}

const SAMPLE_CSV = `Name,AssetType,Symbol,Quantity,BuyPrice,CurrentPrice,Broker,Currency
HDFC Bank,stock_in,HDFCBANK,25,1620.50,1740.00,Zerodha,INR
Apple Inc,stock_us,AAPL,5,185.00,225.50,IndMoney,USD
Parag Parikh Flexi Cap Fund,mutual_fund,PPFAS,150.25,65.20,78.90,Groww,INR
Nippon India Gold ETF,etf,GOLDBEES,100,55.40,64.20,Zerodha,INR
SBI Fixed Deposit,fixed_deposit,SBI_FD,1,100000.00,107200.00,SBI,INR`;

export function CSVImportHoldingsDialog({ trigger }: CSVImportHoldingsDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [csvContent, setCsvContent] = React.useState(SAMPLE_CSV);
  const [isImporting, setIsImporting] = React.useState(false);

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const lines = csvContent
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (lines.length <= 1) {
        toast.error("Please provide CSV data with a header and at least one row");
        setIsImporting(false);
        return;
      }

      // Skip header
      let importedCount = 0;
      let errorCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(",").map((p) => p.trim());
        if (parts.length >= 6) {
          const [name, assetType, symbol, qty, buyPrice, curPrice, broker, currency] = parts;
          const res = await createInvestmentAction({
            name,
            asset_type: (assetType as any) || "other",
            symbol: symbol || undefined,
            total_quantity: qty || "1",
            average_buy_price: buyPrice || "0",
            current_nav_or_price: curPrice || buyPrice || "0",
            broker_name: broker || "Imported",
            currency: (currency || "INR").toUpperCase(),
          });
          if (res.success) {
            importedCount++;
          } else {
            errorCount++;
          }
        }
      }

      toast.success(`Imported ${importedCount} investment holding(s) successfully!`);
      if (errorCount > 0) {
        toast.warning(`${errorCount} row(s) skipped due to formatting errors.`);
      }
      setOpen(false);
    } catch {
      toast.error("Failed to parse and import CSV");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-1.5 h-9">
            <FileSpreadsheet className="h-4 w-4" />
            <span>Import CSV</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" />
            <span>Spreadsheet / CSV Portfolio Import</span>
          </DialogTitle>
          <DialogDescription>
            Bulk import stocks, mutual funds, ETFs, and deposits by pasting CSV data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="csv-input" className="text-xs font-semibold">
              CSV Format: Name, AssetType, Symbol, Quantity, BuyPrice, CurrentPrice, Broker, Currency
            </Label>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-6 px-1.5"
              onClick={() => setCsvContent(SAMPLE_CSV)}
            >
              Load Sample Data
            </Button>
          </div>

          <Textarea
            id="csv-input"
            rows={8}
            className="font-mono text-xs leading-relaxed"
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
          />
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isImporting}
          >
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={isImporting}>
            {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Import Holdings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


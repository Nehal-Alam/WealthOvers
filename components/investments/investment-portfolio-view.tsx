"use client";

import * as React from "react";
import {
  Coins,
  TrendingUp,
  TrendingDown,
  Layers,
  FileSpreadsheet,
  PlusCircle,
  RefreshCw,
  Trash2,
  Globe,
  Clock,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { Tables } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MoneyDisplay } from "@/components/financial/money-display";
import { MetricCard } from "@/components/financial/metric-card";
import { CreateInvestmentDialog } from "@/components/investments/create-investment-dialog";
import { UpdatePriceDialog } from "@/components/investments/update-price-dialog";
import { CSVImportHoldingsDialog } from "@/components/investments/csv-import-holdings-dialog";
import {
  calculateInvestmentReturns,
  addMoney,
  subtractMoney,
  calculateXIRR,
  DEFAULT_USD_INR_RATE,
} from "@/lib/calculations/financial";
import { deleteInvestmentAction } from "@/app/(dashboard)/investments/actions";

interface InvestmentPortfolioViewProps {
  investments: Tables<"investments">[];
  accounts: Tables<"accounts">[];
}

export function InvestmentPortfolioView({
  investments,
  accounts,
}: InvestmentPortfolioViewProps) {
  const [activeTab, setActiveTab] = React.useState<string>("all");
  const [updatingInvestment, setUpdatingInvestment] = React.useState<Tables<"investments"> | null>(null);

  // Group assets
  const filteredInvestments = React.useMemo(() => {
    switch (activeTab) {
      case "stocks_in":
        return investments.filter((i) => i.asset_type === "stock_in");
      case "stocks_us":
        return investments.filter((i) => i.asset_type === "stock_us");
      case "mutual_funds":
        return investments.filter((i) => i.asset_type === "mutual_fund");
      case "etf_gold":
        return investments.filter((i) =>
          ["etf", "sovereign_gold_bond", "gold_physical", "gold_digital"].includes(
            i.asset_type
          )
        );
      case "deposits_retirement":
        return investments.filter((i) =>
          [
            "fixed_deposit",
            "recurring_deposit",
            "ppf",
            "epf",
            "nps",
            "crypto",
            "other",
          ].includes(i.asset_type)
        );
      default:
        return investments;
    }
  }, [investments, activeTab]);

  // Aggregate Portfolio Financials
  const { totalValuationINR, totalInvestedINR, totalPnLINR, absoluteReturnPercent, isNetProfit } =
    React.useMemo(() => {
      let val = "0.0000";
      let inv = "0.0000";

      for (const i of investments) {
        const returns = calculateInvestmentReturns(
          i.total_quantity,
          i.average_buy_price,
          i.current_nav_or_price,
          i.currency,
          DEFAULT_USD_INR_RATE
        );
        val = addMoney(val, returns.currentValuation);
        inv = addMoney(inv, returns.investedAmount);
      }

      const pnl = subtractMoney(val, inv);
      const isProfit = parseFloat(pnl) >= 0;
      let retPct = "0.00";
      if (parseFloat(inv) > 0) {
        retPct = (
          (parseFloat(pnl) / parseFloat(inv)) *
          100
        ).toFixed(2);
      }

      return {
        totalValuationINR: val,
        totalInvestedINR: inv,
        totalPnLINR: pnl,
        absoluteReturnPercent: retPct,
        isNetProfit: isProfit,
      };
    }, [investments]);

  // Asset Allocation across classes
  const assetAllocation = React.useMemo(() => {
    let equities = 0;
    let mutualFunds = 0;
    let goldEtf = 0;
    let fixedIncome = 0;

    for (const i of investments) {
      const ret = calculateInvestmentReturns(
        i.total_quantity,
        i.average_buy_price,
        i.current_nav_or_price,
        i.currency,
        DEFAULT_USD_INR_RATE
      );
      const amount = parseFloat(ret.currentValuation);
      if (i.asset_type === "stock_in" || i.asset_type === "stock_us") {
        equities += amount;
      } else if (i.asset_type === "mutual_fund") {
        mutualFunds += amount;
      } else if (["etf", "sovereign_gold_bond", "gold_physical", "gold_digital"].includes(i.asset_type)) {
        goldEtf += amount;
      } else {
        fixedIncome += amount;
      }
    }

    const total = equities + mutualFunds + goldEtf + fixedIncome;
    return {
      equities,
      mutualFunds,
      goldEtf,
      fixedIncome,
      total,
      equitiesPct: total > 0 ? ((equities / total) * 100).toFixed(1) : "0.0",
      mutualFundsPct: total > 0 ? ((mutualFunds / total) * 100).toFixed(1) : "0.0",
      goldEtfPct: total > 0 ? ((goldEtf / total) * 100).toFixed(1) : "0.0",
      fixedIncomePct: total > 0 ? ((fixedIncome / total) * 100).toFixed(1) : "0.0",
    };
  }, [investments]);

  // Annualized XIRR return across cash flows
  const portfolioXIRR = React.useMemo(() => {
    if (investments.length === 0 || parseFloat(totalValuationINR) <= 0) return null;

    const cashFlows: { amount: number | string; date: Date | string }[] = [];
    for (const i of investments) {
      const ret = calculateInvestmentReturns(
        i.total_quantity,
        i.average_buy_price,
        i.current_nav_or_price,
        i.currency,
        DEFAULT_USD_INR_RATE
      );
      const invAmt = parseFloat(ret.investedAmount);
      if (invAmt > 0) {
        cashFlows.push({
          amount: -invAmt,
          date: i.created_at,
        });
      }
    }

    cashFlows.push({
      amount: parseFloat(totalValuationINR),
      date: new Date(),
    });

    const rate = calculateXIRR(cashFlows);
    return rate !== null ? rate.toFixed(2) : null;
  }, [investments, totalValuationINR]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove holding for "${name}" from your portfolio?`)) return;
    const res = await deleteInvestmentAction(id);
    if (res.success) {
      toast.success(res.message || "Holding removed");
    } else {
      toast.error(res.error || "Failed to remove holding");
    }
  };

  const getAssetTypeLabel = (type: string) => {
    switch (type) {
      case "stock_in":
        return "Indian Stock";
      case "stock_us":
        return "US Equity";
      case "mutual_fund":
        return "Mutual Fund";
      case "etf":
        return "ETF";
      case "sovereign_gold_bond":
        return "SGB";
      case "gold_physical":
      case "gold_digital":
        return "Gold";
      case "fixed_deposit":
        return "Fixed Deposit";
      case "recurring_deposit":
        return "Recurring Deposit";
      case "ppf":
        return "PPF";
      case "epf":
        return "EPF";
      case "nps":
        return "NPS";
      case "crypto":
        return "Crypto";
      default:
        return "Asset";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Investment Portfolio</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <span>Stocks, Mutual Funds, ETFs, SGBs, Gold & Fixed Deposits</span>
            <span className="text-xs text-muted-foreground/60">• USD @ ₹{DEFAULT_USD_INR_RATE}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <CSVImportHoldingsDialog />
          <CreateInvestmentDialog accounts={accounts} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Portfolio Valuation"
          amount={totalValuationINR}
          subtitle="Consolidated real-time valuation"
          icon={Coins}
          iconColor="#3B82F6"
        />
        <MetricCard
          title="Total Invested Capital"
          amount={totalInvestedINR}
          subtitle="Net purchase cost basis"
          icon={Layers}
          iconColor="#6366F1"
        />
        <MetricCard
          title="Unrealized Profit / Loss"
          amount={totalPnLINR}
          subtitle={isNetProfit ? "Net Capital Gains" : "Net Capital Loss"}
          icon={isNetProfit ? TrendingUp : TrendingDown}
          iconColor={isNetProfit ? "#10B981" : "#EF4444"}
          coloredAmount
        />
        <MetricCard
          title="Annualized XIRR"
          amount={portfolioXIRR !== null ? `${portfolioXIRR}%` : `${absoluteReturnPercent}%`}
          subtitle={
            portfolioXIRR !== null
              ? `Annualized rate • Abs: ${absoluteReturnPercent}%`
              : isNetProfit
              ? "Positive portfolio return"
              : "Negative return"
          }
          icon={Sparkles}
          iconColor={isNetProfit ? "#10B981" : "#EF4444"}
          coloredAmount
        />
      </div>

      {/* Asset Allocation Breakdown Banner */}
      {assetAllocation.total > 0 && (
        <Card className="border bg-card shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-primary" />
              <span>Portfolio Asset Allocation</span>
            </span>
            <span className="text-muted-foreground font-mono">
              Total: ₹{assetAllocation.total.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </span>
          </div>

          {/* Segmented Stacked Progress Bar */}
          <div className="h-2.5 w-full rounded-full bg-muted/40 overflow-hidden flex">
            {parseFloat(assetAllocation.equitiesPct) > 0 && (
              <div
                style={{ width: `${assetAllocation.equitiesPct}%` }}
                className="bg-indigo-600 h-full transition-all"
                title={`Equities: ${assetAllocation.equitiesPct}%`}
              />
            )}
            {parseFloat(assetAllocation.mutualFundsPct) > 0 && (
              <div
                style={{ width: `${assetAllocation.mutualFundsPct}%` }}
                className="bg-emerald-500 h-full transition-all"
                title={`Mutual Funds: ${assetAllocation.mutualFundsPct}%`}
              />
            )}
            {parseFloat(assetAllocation.goldEtfPct) > 0 && (
              <div
                style={{ width: `${assetAllocation.goldEtfPct}%` }}
                className="bg-amber-500 h-full transition-all"
                title={`Gold & SGBs: ${assetAllocation.goldEtfPct}%`}
              />
            )}
            {parseFloat(assetAllocation.fixedIncomePct) > 0 && (
              <div
                style={{ width: `${assetAllocation.fixedIncomePct}%` }}
                className="bg-violet-500 h-full transition-all"
                title={`Deposits & PPF: ${assetAllocation.fixedIncomePct}%`}
              />
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 flex-wrap text-xs pt-0.5">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-600 shrink-0" />
              <span className="text-muted-foreground">Equities:</span>
              <span className="font-semibold">{assetAllocation.equitiesPct}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-muted-foreground">Mutual Funds:</span>
              <span className="font-semibold">{assetAllocation.mutualFundsPct}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
              <span className="text-muted-foreground">Gold & SGBs:</span>
              <span className="font-semibold">{assetAllocation.goldEtfPct}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-violet-500 shrink-0" />
              <span className="text-muted-foreground">Deposits & PPF:</span>
              <span className="font-semibold">{assetAllocation.fixedIncomePct}%</span>
            </div>
          </div>
        </Card>
      )}

      {/* Portfolio Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-6 h-auto p-1 gap-1">
          <TabsTrigger value="all" className="text-xs py-1.5">
            All ({investments.length})
          </TabsTrigger>
          <TabsTrigger value="stocks_in" className="text-xs py-1.5">
            Indian Equities
          </TabsTrigger>
          <TabsTrigger value="stocks_us" className="text-xs py-1.5">
            US Stocks
          </TabsTrigger>
          <TabsTrigger value="mutual_funds" className="text-xs py-1.5">
            Mutual Funds & SIP
          </TabsTrigger>
          <TabsTrigger value="etf_gold" className="text-xs py-1.5">
            ETFs & Gold
          </TabsTrigger>
          <TabsTrigger value="deposits_retirement" className="text-xs py-1.5">
            Deposits & PPF
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredInvestments.length === 0 ? (
            <div className="rounded-xl border border-dashed p-12 text-center bg-card">
              <Coins className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
              <h3 className="text-base font-semibold">No assets in this category</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Add your holdings or paste a spreadsheet export to track performance.
              </p>
              <div className="flex justify-center gap-2">
                <CSVImportHoldingsDialog />
                <CreateInvestmentDialog accounts={accounts} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredInvestments.map((inv) => {
                const metrics = calculateInvestmentReturns(
                  inv.total_quantity,
                  inv.average_buy_price,
                  inv.current_nav_or_price,
                  inv.currency,
                  DEFAULT_USD_INR_RATE
                );

                return (
                  <Card key={inv.id} className="overflow-hidden border shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 capitalize">
                              {getAssetTypeLabel(inv.asset_type)}
                            </Badge>
                            {inv.currency === "USD" && (
                              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4 gap-1">
                                <Globe className="h-2.5 w-2.5" />
                                USD ($)
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-base font-semibold mt-1">
                            {inv.name}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {inv.symbol ? `${inv.symbol} • ` : ""}
                            {inv.broker_name}
                          </p>
                        </div>

                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => setUpdatingInvestment(inv)}
                            aria-label="Update price"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(inv.id, inv.name)}
                            aria-label="Delete holding"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 pt-2">
                      {/* Holding Details */}
                      <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y my-2">
                        <div>
                          <span className="text-muted-foreground block">Quantity</span>
                          <span className="font-mono font-semibold">
                            {parseFloat(inv.total_quantity.toString())} units
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Avg Buy Price</span>
                          <span className="font-mono font-semibold">
                            {inv.currency === "USD" ? "$" : "₹"}
                            {parseFloat(inv.average_buy_price.toString()).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Current Valuation & PnL */}
                      <div className="flex items-baseline justify-between pt-1">
                        <div>
                          <span className="text-[11px] text-muted-foreground block">
                            Current Value (INR)
                          </span>
                          <MoneyDisplay
                            amount={metrics.currentValuation}
                            className="text-base font-bold"
                          />
                        </div>

                        <div className="text-right">
                          <span className="text-[11px] text-muted-foreground block">
                            Returns (P&L)
                          </span>
                          <div
                            className={`font-mono text-sm font-bold flex items-center justify-end gap-1 ${
                              metrics.isProfit ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            {metrics.isProfit ? (
                              <TrendingUp className="h-3.5 w-3.5" />
                            ) : (
                              <TrendingDown className="h-3.5 w-3.5" />
                            )}
                            <span>
                              {metrics.isProfit ? "+" : ""}
                              {metrics.absoluteReturnPercent}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Manual / Delayed Price Indicator */}
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground/70 mt-3 pt-2 border-t">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {inv.last_price_update_at ? (
                            <span>
                              {format(new Date(inv.last_price_update_at), "dd MMM yyyy")}
                            </span>
                          ) : (
                            <span>Manual price</span>
                          )}
                        </span>
                        <span className="italic">
                          {inv.currency === "USD"
                            ? `@ $${inv.current_nav_or_price}`
                            : `@ ₹${inv.current_nav_or_price}`}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Update Market Price Modal */}
      <UpdatePriceDialog
        investment={updatingInvestment}
        open={!!updatingInvestment}
        onOpenChange={(open) => !open && setUpdatingInvestment(null)}
      />
    </div>
  );
}


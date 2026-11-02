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
  Repeat,
  Play,
  Pause,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { Tables } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import dynamic from "next/dynamic";
import { MoneyDisplay } from "@/components/financial/money-display";
import { MetricCard } from "@/components/financial/metric-card";

const CreateInvestmentDialog = dynamic(
  () =>
    import("@/components/investments/create-investment-dialog").then(
      (m) => m.CreateInvestmentDialog
    ),
  { ssr: false }
);

const UpdatePriceDialog = dynamic(
  () =>
    import("@/components/investments/update-price-dialog").then(
      (m) => m.UpdatePriceDialog
    ),
  { ssr: false }
);

const CSVImportHoldingsDialog = dynamic(
  () =>
    import("@/components/investments/csv-import-holdings-dialog").then(
      (m) => m.CSVImportHoldingsDialog
    ),
  { ssr: false }
);

const CreateSipDialog = dynamic(
  () =>
    import("@/components/investments/create-sip-dialog").then(
      (m) => m.CreateSipDialog
    ),
  { ssr: false }
);

import {
  calculateInvestmentReturns,
  addMoney,
  subtractMoney,
  calculateXIRR,
  DEFAULT_USD_INR_RATE,
} from "@/lib/calculations/financial";
import {
  deleteInvestmentAction,
  processDueSipAction,
  toggleSipStatusAction,
  deleteSipAction,
} from "@/app/(dashboard)/investments/actions";

interface InvestmentPortfolioViewProps {
  investments: Tables<"investments">[];
  accounts: Tables<"accounts">[];
  sipSchedules?: Tables<"sip_schedules">[];
}

export function InvestmentPortfolioView({
  investments,
  accounts,
  sipSchedules = [],
}: InvestmentPortfolioViewProps) {
  const [activeTab, setActiveTab] = React.useState<string>("all");
  const [processingSipId, setProcessingSipId] = React.useState<string | null>(null);
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

  const handleProcessSip = async (sipId: string, sipName: string) => {
    setProcessingSipId(sipId);
    try {
      const res = await processDueSipAction(sipId);
      if (res.success) {
        toast.success(res.message || `Processed SIP for ${sipName}`);
      } else {
        toast.error(res.error || "Failed to process SIP");
      }
    } catch {
      toast.error("An error occurred while processing SIP");
    } finally {
      setProcessingSipId(null);
    }
  };

  const handleToggleSip = async (sipId: string, currentActive: boolean) => {
    const res = await toggleSipStatusAction(sipId, !currentActive);
    if (res.success) {
      toast.success(res.message || "SIP status updated");
    } else {
      toast.error(res.error || "Failed to update SIP status");
    }
  };

  const handleDeleteSip = async (sipId: string, sipName: string) => {
    if (!confirm(`Cancel and remove SIP schedule "${sipName}"?`)) return;
    const res = await deleteSipAction(sipId);
    if (res.success) {
      toast.success(res.message || "SIP schedule deleted");
    } else {
      toast.error(res.error || "Failed to delete SIP");
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
          <h2 className="text-xl font-bold tracking-tight text-foreground">Investment Portfolio</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <span>Stocks, Mutual Funds, ETFs, SGBs, Gold & Fixed Deposits</span>
            <span className="text-xs text-muted-foreground/60">• USD @ ₹{DEFAULT_USD_INR_RATE}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <CSVImportHoldingsDialog />
          <CreateSipDialog investments={investments} accounts={accounts} />
          <CreateInvestmentDialog accounts={accounts} />
        </div>
      </div>

      {/* KPI Cards using Leftovers palette */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Portfolio Valuation"
          amount={totalValuationINR}
          subtitle="Consolidated real-time valuation"
          icon={Coins}
          iconColor="#244B3C"
        />
        <MetricCard
          title="Total Invested Capital"
          amount={totalInvestedINR}
          subtitle="Net purchase cost basis"
          icon={Layers}
          iconColor="#8BA58C"
        />
        <MetricCard
          title="Unrealized Profit / Loss"
          amount={totalPnLINR}
          subtitle={isNetProfit ? "Net Capital Gains" : "Net Capital Loss"}
          icon={isNetProfit ? TrendingUp : TrendingDown}
          iconColor={isNetProfit ? "#39805B" : "#C77A65"}
          coloredAmount
        />
        <MetricCard
          title="Annualized XIRR"
          amount={portfolioXIRR !== null ? `${portfolioXIRR}%` : `${absoluteReturnPercent}%`}
          formatType="percent"
          subtitle={
            portfolioXIRR !== null
              ? `Annualized rate • Abs: ${absoluteReturnPercent}%`
              : isNetProfit
              ? "Positive portfolio return"
              : "Negative return"
          }
          icon={Sparkles}
          iconColor={isNetProfit ? "#39805B" : "#C77A65"}
          coloredAmount
        />
      </div>

      {/* Asset Allocation Breakdown Banner */}
      {assetAllocation.total > 0 && (
        <Card className="border border-border/80 bg-card rounded-xl shadow-xs p-4 space-y-3">
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
          <div className="h-2.5 w-full rounded-full bg-surface-secondary/80 overflow-hidden flex">
            {parseFloat(assetAllocation.equitiesPct) > 0 && (
              <div
                style={{ width: `${assetAllocation.equitiesPct}%` }}
                className="bg-[#244B3C] h-full transition-all"
                title={`Equities: ${assetAllocation.equitiesPct}%`}
              />
            )}
            {parseFloat(assetAllocation.mutualFundsPct) > 0 && (
              <div
                style={{ width: `${assetAllocation.mutualFundsPct}%` }}
                className="bg-[#8BA58C] h-full transition-all"
                title={`Mutual Funds: ${assetAllocation.mutualFundsPct}%`}
              />
            )}
            {parseFloat(assetAllocation.goldEtfPct) > 0 && (
              <div
                style={{ width: `${assetAllocation.goldEtfPct}%` }}
                className="bg-[#C39148] h-full transition-all"
                title={`Gold & SGBs: ${assetAllocation.goldEtfPct}%`}
              />
            )}
            {parseFloat(assetAllocation.fixedIncomePct) > 0 && (
              <div
                style={{ width: `${assetAllocation.fixedIncomePct}%` }}
                className="bg-[#737C73] h-full transition-all"
                title={`Deposits & PPF: ${assetAllocation.fixedIncomePct}%`}
              />
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 flex-wrap text-xs pt-0.5">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#244B3C] shrink-0" />
              <span className="text-muted-foreground">Equities:</span>
              <span className="font-semibold text-foreground">{assetAllocation.equitiesPct}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#8BA58C] shrink-0" />
              <span className="text-muted-foreground">Mutual Funds:</span>
              <span className="font-semibold text-foreground">{assetAllocation.mutualFundsPct}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#C39148] shrink-0" />
              <span className="text-muted-foreground">Gold & SGBs:</span>
              <span className="font-semibold text-foreground">{assetAllocation.goldEtfPct}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#737C73] shrink-0" />
              <span className="text-muted-foreground">Deposits & PPF:</span>
              <span className="font-semibold text-foreground">{assetAllocation.fixedIncomePct}%</span>
            </div>
          </div>
        </Card>
      )}

      {/* Automated Systematic Investment Plans (SIP) Section */}
      <Card className="border border-border/80 bg-surface rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Repeat className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">
              Automated SIP Schedules
            </h3>
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/10">
              {sipSchedules.filter((s) => s.is_active).length} Active
            </Badge>
          </div>
          <CreateSipDialog investments={investments} accounts={accounts} />
        </div>

        {sipSchedules.length === 0 ? (
          <div className="py-4 text-center text-xs text-muted-foreground border border-dashed border-border/70 rounded-xl bg-surface-secondary/20">
            No active SIP schedules. Click &ldquo;Schedule SIP&rdquo; to automate your recurring investments.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-surface-secondary/50 text-muted-foreground border-y border-border">
                <tr>
                  <th className="py-2 px-3 text-left font-semibold">SIP Name</th>
                  <th className="py-2 px-3 text-left font-semibold">Frequency</th>
                  <th className="py-2 px-3 text-right font-semibold">Amount</th>
                  <th className="py-2 px-3 text-left font-semibold">Next Due</th>
                  <th className="py-2 px-3 text-center font-semibold">Status</th>
                  <th className="py-2 px-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {sipSchedules.map((sip) => (
                  <tr key={sip.id} className="hover:bg-surface-secondary/30 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-foreground">
                      {sip.sip_name}
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground capitalize">
                      {sip.frequency} (Day {sip.deduction_day})
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                      ₹{parseFloat(String(sip.amount)).toLocaleString("en-IN")}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-muted-foreground">
                      {sip.next_due_date}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          sip.is_active
                            ? "border-success text-success bg-success/10"
                            : "border-muted-foreground text-muted-foreground"
                        }`}
                      >
                        {sip.is_active ? "Active" : "Paused"}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={processingSipId === sip.id || !sip.is_active}
                          onClick={() => handleProcessSip(sip.id, sip.sip_name)}
                          className="h-7 text-[11px] border-primary/30 text-primary hover:bg-primary/10 gap-1 rounded-lg"
                        >
                          {processingSipId === sip.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Play className="h-3 w-3" />
                          )}
                          <span>Run Now</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleSip(sip.id, sip.is_active)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          title={sip.is_active ? "Pause SIP" : "Resume SIP"}
                        >
                          {sip.is_active ? (
                            <Pause className="h-3.5 w-3.5" />
                          ) : (
                            <Play className="h-3.5 w-3.5 text-success" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteSip(sip.id, sip.sip_name)}
                          className="h-7 w-7 p-0 text-danger hover:text-danger hover:bg-danger/10"
                          title="Delete SIP"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Portfolio Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-6 h-auto p-1 gap-1 bg-surface-secondary/60">
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
            /* Section 11 Onboarding Empty State */
            <div className="rounded-2xl border border-dashed border-border p-8 sm:p-12 text-center bg-card">
              <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
                <Coins className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-foreground">Track Your Investment Portfolio</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md mx-auto leading-relaxed">
                Add your stocks, mutual funds or deposits to track your portfolio.
              </p>
              <div className="mt-3 p-3 rounded-lg bg-surface-secondary/40 border border-border/60 max-w-sm mx-auto text-left text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Example: </span>
                50 units of Nifty 50 ETF at ₹240 or ₹5,000/month SIP in flexi-cap fund.
              </div>
              <div className="flex justify-center gap-2 mt-5">
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
                  <Card key={inv.id} className="overflow-hidden border border-border/80 bg-card rounded-xl shadow-xs hover:border-primary/40 transition-colors">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 capitalize border-border/80">
                              {getAssetTypeLabel(inv.asset_type)}
                            </Badge>
                            {inv.currency === "USD" && (
                              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4 gap-1 bg-surface-secondary text-text-secondary">
                                <Globe className="h-2.5 w-2.5" />
                                USD ($)
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-base font-bold mt-1 text-foreground">
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
                            className="h-8 w-8 text-muted-foreground hover:text-danger"
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
                      <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-border/60 my-2 bg-surface-secondary/20 px-2 rounded-md">
                        <div>
                          <span className="text-muted-foreground block">Quantity</span>
                          <span className="font-mono font-semibold text-foreground">
                            {parseFloat(inv.total_quantity.toString())} units
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Avg Buy Price</span>
                          <span className="font-mono font-semibold text-foreground">
                            {inv.currency === "USD" ? "$" : "₹"}
                            {parseFloat(inv.average_buy_price.toString()).toLocaleString("en-IN")}
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
                            className="text-base font-bold text-foreground font-mono"
                          />
                        </div>

                        <div className="text-right">
                          <span className="text-[11px] text-muted-foreground block">
                            Returns (P&L)
                          </span>
                          <div
                            className={`font-mono text-sm font-bold flex items-center justify-end gap-1 ${
                              metrics.isProfit ? "text-success" : "text-danger"
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
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground/70 mt-3 pt-2 border-t border-border/60">
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

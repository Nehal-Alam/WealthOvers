"use client";

import * as React from "react";
import {
  Home,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Trash2,
  Calendar,
  Layers,
  ShieldCheck,
  Scale,
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

const CreateAssetDialog = dynamic(
  () =>
    import("@/components/assets/create-asset-dialog").then(
      (m) => m.CreateAssetDialog
    ),
  { ssr: false }
);

const CreateLiabilityDialog = dynamic(
  () =>
    import("@/components/assets/create-liability-dialog").then(
      (m) => m.CreateLiabilityDialog
    ),
  { ssr: false }
);

import { deleteAssetAction, deleteLiabilityAction } from "@/app/(dashboard)/assets/actions";
import { addMoney, subtractMoney } from "@/lib/calculations/financial";

interface AssetsLiabilitiesViewProps {
  assets: Tables<"assets">[];
  liabilities: Tables<"liabilities">[];
}

export function AssetsLiabilitiesView({
  assets,
  liabilities,
}: AssetsLiabilitiesViewProps) {
  const [activeTab, setActiveTab] = React.useState<string>("assets");

  // Aggregate Metrics & Equity Ratio
  const { totalAssetValuation, totalLiabilitiesAmount, netTangible, equityPercent, debtToAssetRatio } = React.useMemo(() => {
    let a = "0.0000";
    for (const item of assets) {
      a = addMoney(a, item.current_valuation);
    }
    let l = "0.0000";
    for (const item of liabilities) {
      l = addMoney(l, item.outstanding_amount);
    }
    const net = subtractMoney(a, l);
    const assetValNum = parseFloat(a);
    const liabNum = parseFloat(l);

    let eqPct = 100;
    let debtRatio = 0;
    if (assetValNum > 0) {
      debtRatio = Math.min(100, (liabNum / assetValNum) * 100);
      eqPct = Math.max(0, Math.min(100, 100 - debtRatio));
    }

    return {
      totalAssetValuation: a,
      totalLiabilitiesAmount: l,
      netTangible: net,
      equityPercent: eqPct.toFixed(1),
      debtToAssetRatio: debtRatio.toFixed(1),
    };
  }, [assets, liabilities]);

  const getCategoryBadgeClass = (category: string) => {
    const c = category.toLowerCase();
    if (c.includes("real estate") || c.includes("property") || c.includes("home")) {
      return "border-primary/30 text-primary dark:text-[#9BB99D] bg-primary/10";
    }
    if (c.includes("vehicle") || c.includes("car") || c.includes("bike")) {
      return "border-warning/30 text-warning dark:text-[#D6B16C] bg-warning/10";
    }
    if (c.includes("gold") || c.includes("jewelry") || c.includes("silver")) {
      return "border-warning/30 text-warning dark:text-[#D6B16C] bg-warning/10";
    }
    if (c.includes("electronic") || c.includes("gadget") || c.includes("tech")) {
      return "border-accent/30 text-accent bg-accent/10";
    }
    return "border-border/80 text-muted-foreground bg-surface-secondary/40";
  };

  const handleDeleteAsset = async (id: string, name: string) => {
    if (!confirm(`Delete asset "${name}"?`)) return;
    const res = await deleteAssetAction(id);
    if (res.success) {
      toast.success(res.message || "Asset deleted");
    } else {
      toast.error(res.error || "Failed to delete");
    }
  };

  const handleDeleteLiability = async (id: string, name: string) => {
    if (!confirm(`Delete liability "${name}"?`)) return;
    const res = await deleteLiabilityAction(id);
    if (res.success) {
      toast.success(res.message || "Liability deleted");
    } else {
      toast.error(res.error || "Failed to delete");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Fixed Assets & Liabilities</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track real estate properties, vehicles, jewelry, and non-bank liabilities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <CreateLiabilityDialog />
          <CreateAssetDialog />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Fixed Asset Valuations"
          amount={totalAssetValuation}
          subtitle={`${assets.length} registered properties / assets`}
          icon={Home}
          iconColor="#244B3C"
        />
        <MetricCard
          title="External Liabilities"
          amount={totalLiabilitiesAmount}
          subtitle={`${liabilities.length} registered external debts`}
          icon={AlertCircle}
          iconColor="#C77A65"
          coloredAmount={false}
        />
        <MetricCard
          title="Net Tangible Capital"
          amount={netTangible}
          subtitle="Fixed assets minus liabilities"
          icon={TrendingUp}
          iconColor="#39805B"
          coloredAmount
        />
      </div>

      {/* Tangible Equity & Leverage Health */}
      {(parseFloat(totalAssetValuation) > 0 || parseFloat(totalLiabilitiesAmount) > 0) && (
        <Card className="p-4 border border-border/80 bg-card rounded-xl shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Tangible Asset Solvency & Equity Ratio</span>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono font-medium">
              <span className="flex items-center gap-1.5 text-success">
                <span className="h-2 w-2 rounded-full bg-success" />
                Unencumbered Equity: {equityPercent}%
              </span>
              <span className="flex items-center gap-1.5 text-danger">
                <span className="h-2 w-2 rounded-full bg-danger" />
                Debt Leverage: {debtToAssetRatio}%
              </span>
            </div>
          </div>
          <div className="w-full bg-surface-secondary/80 rounded-full h-2 overflow-hidden flex">
            <div
              className="bg-success transition-all duration-300"
              style={{ width: `${equityPercent}%` }}
              title={`Equity: ${equityPercent}%`}
            />
            <div
              className="bg-danger transition-all duration-300"
              style={{ width: `${debtToAssetRatio}%` }}
              title={`Debt: ${debtToAssetRatio}%`}
            />
          </div>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-sm bg-surface-secondary/60">
          <TabsTrigger value="assets" className="text-xs py-1.5">Fixed Assets ({assets.length})</TabsTrigger>
          <TabsTrigger value="liabilities" className="text-xs py-1.5">
            Liabilities ({liabilities.length})
          </TabsTrigger>
        </TabsList>

        {/* Fixed Assets Tab */}
        <TabsContent value="assets" className="mt-6">
          {assets.length === 0 ? (
            /* Section 11 Onboarding Empty State */
            <div className="rounded-2xl border border-dashed border-border p-8 sm:p-12 text-center bg-card">
              <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
                <Home className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-foreground">No Fixed Assets Registered</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md mx-auto leading-relaxed">
                Add properties, vehicles, or physical assets to track tangible net worth.
              </p>
              <div className="mt-3 p-3 rounded-lg bg-surface-secondary/40 border border-border/60 max-w-sm mx-auto text-left text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Example: </span>
                2BHK Apartment in Bangalore valued at ₹75,00,000 or Honda City at ₹8,50,000.
              </div>
              <div className="flex justify-center gap-2 mt-5">
                <CreateAssetDialog />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {assets.map((ast) => {
                const cost = parseFloat(ast.purchase_price.toString());
                const val = parseFloat(ast.current_valuation.toString());
                const pnl = val - cost;
                const pnlPct = cost > 0 ? ((pnl / cost) * 100).toFixed(1) : "0.0";
                const isGain = pnl >= 0;

                return (
                  <Card key={ast.id} className="overflow-hidden border border-border/80 bg-card rounded-xl shadow-xs hover:border-primary/40 transition-colors">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Badge variant="outline" className={`text-[10px] py-0 px-2 h-4.5 font-medium ${getCategoryBadgeClass(ast.category)}`}>
                            {ast.category}
                          </Badge>
                          <CardTitle className="text-base font-bold mt-1 text-foreground">
                            {ast.name}
                          </CardTitle>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-danger"
                          onClick={() => handleDeleteAsset(ast.id, ast.name)}
                          aria-label="Delete asset"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 pt-2">
                      <div className="flex items-baseline justify-between py-2 border-t border-border/60">
                        <div>
                          <span className="text-xs text-muted-foreground block">
                            Current Valuation
                          </span>
                          <MoneyDisplay
                            amount={ast.current_valuation}
                            className="text-base font-bold text-foreground font-mono"
                          />
                        </div>

                        <div className="text-right">
                          <span className="text-xs text-muted-foreground block">
                            Purchase Price
                          </span>
                          <MoneyDisplay
                            amount={ast.purchase_price}
                            className="text-xs font-semibold text-muted-foreground font-mono"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-2 border-t border-border/60">
                        <span className="text-muted-foreground">Appreciation</span>
                        <span
                          className={`font-mono font-bold flex items-center gap-1 ${
                            isGain ? "text-success" : "text-danger"
                          }`}
                        >
                          {isGain ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {isGain ? "+" : ""}{pnlPct}%
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Liabilities Tab */}
        <TabsContent value="liabilities" className="mt-6">
          {liabilities.length === 0 ? (
            /* Section 11 Onboarding Empty State */
            <div className="rounded-2xl border border-dashed border-border p-8 sm:p-12 text-center bg-card">
              <div className="mx-auto h-12 w-12 rounded-full bg-danger/10 flex items-center justify-center text-danger mb-3">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-foreground">No External Liabilities Registered</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md mx-auto leading-relaxed">
                Record non-bank liabilities such as family loans, promissory notes, or debts.
              </p>
              <div className="mt-3 p-3 rounded-lg bg-surface-secondary/40 border border-border/60 max-w-sm mx-auto text-left text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Example: </span>
                Hand loan of ₹2,00,000 from relative for home renovation.
              </div>
              <div className="flex justify-center gap-2 mt-5">
                <CreateLiabilityDialog />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {liabilities.map((liab) => (
                <Card key={liab.id} className="overflow-hidden border border-border/80 bg-card rounded-xl shadow-xs hover:border-danger/40 transition-colors">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Badge variant="outline" className="text-[10px] py-0 px-2 h-4.5 font-medium border-danger/30 text-danger bg-danger/10">
                          {liab.category.replace(/_/g, " ")}
                        </Badge>
                        <CardTitle className="text-base font-bold mt-1 text-foreground">
                          {liab.name}
                        </CardTitle>
                        {liab.notes && (
                          <p className="text-xs text-muted-foreground">
                            {liab.notes}
                          </p>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-danger"
                        onClick={() => handleDeleteLiability(liab.id, liab.name)}
                        aria-label="Delete liability"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-2">
                    <div className="flex items-baseline justify-between py-2 border-t border-border/60">
                      <div>
                        <span className="text-xs text-muted-foreground block">
                          Outstanding Amount
                        </span>
                        <MoneyDisplay
                          amount={liab.outstanding_amount}
                          className="text-base font-bold text-danger font-mono"
                        />
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-muted-foreground block">Total Borrowed</span>
                        <MoneyDisplay
                          amount={liab.total_amount}
                          className="font-mono font-semibold text-xs text-muted-foreground"
                        />
                      </div>
                    </div>

                    {liab.due_date && (
                      <div className="flex items-center justify-between text-xs pt-2 border-t border-border/60 text-muted-foreground">
                        <span>Due Date</span>
                        <span className="font-mono text-foreground font-medium">
                          {format(new Date(liab.due_date), "dd MMM yyyy")}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

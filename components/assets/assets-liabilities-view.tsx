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
import { CreateAssetDialog } from "@/components/assets/create-asset-dialog";
import { CreateLiabilityDialog } from "@/components/assets/create-liability-dialog";
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

  // Aggregate Metrics
  const { totalAssetValuation, totalLiabilitiesAmount, netTangible } = React.useMemo(() => {
    let a = "0.0000";
    for (const item of assets) {
      a = addMoney(a, item.current_valuation);
    }
    let l = "0.0000";
    for (const item of liabilities) {
      l = addMoney(l, item.outstanding_amount);
    }
    const net = subtractMoney(a, l);
    return {
      totalAssetValuation: a,
      totalLiabilitiesAmount: l,
      netTangible: net,
    };
  }, [assets, liabilities]);

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
          <h2 className="text-xl font-bold tracking-tight">Fixed Assets & Liabilities</h2>
          <p className="text-sm text-muted-foreground">
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
          iconColor="#3B82F6"
        />
        <MetricCard
          title="External Liabilities"
          amount={totalLiabilitiesAmount}
          subtitle={`${liabilities.length} registered external debts`}
          icon={AlertCircle}
          iconColor="#EF4444"
          coloredAmount={false}
        />
        <MetricCard
          title="Net Tangible Capital"
          amount={netTangible}
          subtitle="Fixed assets minus liabilities"
          icon={TrendingUp}
          iconColor="#10B981"
          coloredAmount
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-sm">
          <TabsTrigger value="assets">Fixed Assets ({assets.length})</TabsTrigger>
          <TabsTrigger value="liabilities">
            Liabilities ({liabilities.length})
          </TabsTrigger>
        </TabsList>

        {/* Fixed Assets Tab */}
        <TabsContent value="assets" className="mt-6">
          {assets.length === 0 ? (
            <div className="rounded-xl border border-dashed p-12 text-center bg-card">
              <Home className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
              <h3 className="text-base font-semibold">No fixed assets registered</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Record apartments, vehicles, jewelry, or gold to track physical net worth.
              </p>
              <CreateAssetDialog />
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
                  <Card key={ast.id} className="overflow-hidden border shadow-sm">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">
                            {ast.category}
                          </Badge>
                          <CardTitle className="text-base font-semibold mt-1">
                            {ast.name}
                          </CardTitle>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteAsset(ast.id, ast.name)}
                          aria-label="Delete asset"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 pt-2">
                      <div className="flex items-baseline justify-between py-2 border-t">
                        <div>
                          <span className="text-xs text-muted-foreground block">
                            Current Valuation
                          </span>
                          <MoneyDisplay
                            amount={ast.current_valuation}
                            className="text-base font-bold text-foreground"
                          />
                        </div>

                        <div className="text-right">
                          <span className="text-xs text-muted-foreground block">
                            Purchase Price
                          </span>
                          <MoneyDisplay
                            amount={ast.purchase_price}
                            className="text-xs font-semibold text-muted-foreground"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-2 border-t">
                        <span className="text-muted-foreground">Appreciation</span>
                        <span
                          className={`font-mono font-bold flex items-center gap-1 ${
                            isGain ? "text-emerald-600" : "text-rose-600"
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
            <div className="rounded-xl border border-dashed p-12 text-center bg-card">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
              <h3 className="text-base font-semibold">No external liabilities registered</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Record private debts or informal borrowing obligations.
              </p>
              <CreateLiabilityDialog />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {liabilities.map((lia) => (
                <Card key={lia.id} className="overflow-hidden border shadow-sm">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">
                          {lia.category}
                        </Badge>
                        <CardTitle className="text-base font-semibold mt-1">
                          {lia.name}
                        </CardTitle>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteLiability(lia.id, lia.name)}
                        aria-label="Delete liability"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-2">
                    <div className="flex items-baseline justify-between py-2 border-t">
                      <div>
                        <span className="text-xs text-muted-foreground block">
                          Outstanding Amount
                        </span>
                        <MoneyDisplay
                          amount={lia.outstanding_amount}
                          className="text-base font-bold text-rose-600 dark:text-rose-400"
                        />
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-muted-foreground block">
                          Total Borrowed
                        </span>
                        <MoneyDisplay
                          amount={lia.total_amount}
                          className="text-xs font-semibold text-muted-foreground"
                        />
                      </div>
                    </div>

                    {lia.due_date && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1 pt-2 border-t">
                        <Calendar className="h-3 w-3" />
                        <span>Due: {format(new Date(lia.due_date), "dd MMM yyyy")}</span>
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


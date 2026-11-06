"use client";

import * as React from "react";
import {
  Sparkles,
  Calendar,
  AlertCircle,
  Play,
  Pause,
  Trash2,
  Clock,
  Layers,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { toast } from "sonner";
import Decimal from "decimal.js";

import { Tables } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/financial/metric-card";
import { MoneyDisplay } from "@/components/financial/money-display";
import { CreateSubscriptionDialog } from "@/components/subscriptions/create-subscription-dialog";
import {
  updateSubscriptionStatusAction,
  deleteSubscriptionAction,
} from "@/app/(dashboard)/subscriptions/actions";

interface SubscriptionsViewProps {
  subscriptions: (Tables<"subscriptions"> & {
    account?: { id: string; name: string; institution_name: string } | null;
    category?: { id: string; name: string; color: string; icon: string } | null;
  })[];
  accounts: Tables<"accounts">[];
  categories: Tables<"categories">[];
}

export function SubscriptionsView({
  subscriptions,
  accounts,
  categories,
}: SubscriptionsViewProps) {
  const [activeTab, setActiveTab] = React.useState<"all" | "active" | "paused" | "cancelled">("all");
  const [processingId, setProcessingId] = React.useState<string | null>(null);

  // Compute monthly normalized burn rate
  const metrics = React.useMemo(() => {
    let monthlyBurn = new Decimal(0);
    let annualCommitment = new Decimal(0);
    let activeCount = 0;
    let nextRenewal: { name: string; date: string; daysLeft: number } | null = null;
    const now = new Date();

    const sortedActive = [...subscriptions]
      .filter((s) => s.status === "active")
      .sort((a, b) => new Date(a.renewal_date).getTime() - new Date(b.renewal_date).getTime());

    if (sortedActive.length > 0) {
      const earliest = sortedActive[0];
      const days = differenceInDays(parseISO(earliest.renewal_date), now);
      nextRenewal = {
        name: earliest.name,
        date: earliest.renewal_date,
        daysLeft: days,
      };
    }

    for (const sub of subscriptions) {
      if (sub.status !== "active") continue;
      activeCount++;
      const cost = new Decimal(sub.cost || 0);

      switch (sub.billing_cycle) {
        case "daily":
          monthlyBurn = monthlyBurn.plus(cost.times(30));
          annualCommitment = annualCommitment.plus(cost.times(365));
          break;
        case "weekly":
          monthlyBurn = monthlyBurn.plus(cost.times(4.3333));
          annualCommitment = annualCommitment.plus(cost.times(52));
          break;
        case "monthly":
          monthlyBurn = monthlyBurn.plus(cost);
          annualCommitment = annualCommitment.plus(cost.times(12));
          break;
        case "quarterly":
          monthlyBurn = monthlyBurn.plus(cost.dividedBy(3));
          annualCommitment = annualCommitment.plus(cost.times(4));
          break;
        case "yearly":
          monthlyBurn = monthlyBurn.plus(cost.dividedBy(12));
          annualCommitment = annualCommitment.plus(cost);
          break;
      }
    }

    return {
      monthlyBurn: monthlyBurn.toFixed(2),
      annualCommitment: annualCommitment.toFixed(2),
      activeCount,
      nextRenewal,
    };
  }, [subscriptions]);

  const filteredSubscriptions = React.useMemo(() => {
    if (activeTab === "all") return subscriptions;
    return subscriptions.filter((s) => s.status === activeTab);
  }, [subscriptions, activeTab]);

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    setProcessingId(id);
    const newStatus = currentStatus === "active" ? "paused" : "active";
    try {
      const res = await updateSubscriptionStatusAction({
        id,
        status: newStatus as any,
      });
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.error || "Failed to update status");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove "${name}" from your subscriptions?`)) {
      return;
    }
    setProcessingId(id);
    try {
      const res = await deleteSubscriptionAction({ id });
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.error || "Failed to delete subscription");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Subscriptions & Memberships</span>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border border-border bg-muted/40 text-muted-foreground font-semibold">
              V2 Terminal
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor recurring SaaS, streaming, cloud services, and recurring commitments with cadence analysis.
          </p>
        </div>

        <CreateSubscriptionDialog
          accounts={accounts}
          categories={categories}
        />
      </div>

      {/* Bloomberg Terminal Telemetry KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <MetricCard
          title="Monthly Normalized Spend"
          amount={metrics.monthlyBurn}
          subtitle="Annualized to 30-day cadence"
          icon={TrendingUp}
          iconColor="amber"
        />

        <MetricCard
          title="Annual Commitment"
          amount={metrics.annualCommitment}
          subtitle="Total 12-month contractual run-rate"
          icon={Layers}
          iconColor="violet"
        />

        <MetricCard
          title="Active Subscriptions"
          amount={metrics.activeCount}
          subtitle={`${subscriptions.length - metrics.activeCount} paused / cancelled`}
          icon={Sparkles}
          formatType="count"
        />

        <Card className="border border-border/80 bg-card shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between space-x-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
                Next Upcoming Renewal
              </p>
              <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 bg-info/10 text-info">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2.5 sm:mt-3">
              {metrics.nextRenewal ? (
                <>
                  <div className="text-base sm:text-lg font-bold tracking-tight text-foreground truncate">
                    {metrics.nextRenewal.name}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                    <span className="font-mono text-positive font-medium">
                      {metrics.nextRenewal.daysLeft <= 0
                        ? "Due Today"
                        : `In ${metrics.nextRenewal.daysLeft} day${metrics.nextRenewal.daysLeft === 1 ? "" : "s"}`}
                    </span>
                    <span>•</span>
                    <span>{format(parseISO(metrics.nextRenewal.date), "dd MMM yyyy")}</span>
                  </div>
                </>
              ) : (
                <div className="text-xs text-muted-foreground pt-1">
                  No upcoming active renewals
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs & Terminal Data Grid */}
      <Card className="border border-border bg-card">
        <CardHeader className="p-4 border-b border-border/70 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            {(["all", "active", "paused", "cancelled"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer capitalize ${
                  activeTab === tab
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                {tab} ({tab === "all" ? subscriptions.length : subscriptions.filter((s) => s.status === tab).length})
              </button>
            ))}
          </div>

          <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline">
            {filteredSubscriptions.length} record{filteredSubscriptions.length === 1 ? "" : "s"}
          </span>
        </CardHeader>

        <CardContent className="p-0">
          {filteredSubscriptions.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="h-10 w-10 mx-auto rounded-full bg-muted/30 flex items-center justify-center text-muted-foreground">
                <Sparkles className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-foreground">No subscriptions found</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {activeTab === "all"
                  ? "Track Netflix, Amazon Prime, Spotify, gym memberships, and cloud services in one terminal."
                  : `No subscriptions currently marked as ${activeTab}.`}
              </p>
              {activeTab === "all" && (
                <div className="pt-2">
                  <CreateSubscriptionDialog
                    accounts={accounts}
                    categories={categories}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="py-2.5 px-4">Service</th>
                    <th className="py-2.5 px-3">Cadence</th>
                    <th className="py-2.5 px-3">Renewal Date</th>
                    <th className="py-2.5 px-3">Payment Source</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-4 text-right">Cost</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs">
                  {filteredSubscriptions.map((sub) => {
                    const daysLeft = differenceInDays(parseISO(sub.renewal_date), new Date());
                    const isDueSoon = sub.status === "active" && daysLeft <= (sub.cancellation_reminder_days || 3);

                    return (
                      <tr
                        key={sub.id}
                        className="hover:bg-muted/20 transition-colors"
                      >
                        <td className="py-3 px-4 font-semibold text-foreground">
                          {sub.name}
                        </td>
                        <td className="py-3 px-3">
                          <span className="capitalize font-mono text-[11px] text-muted-foreground">
                            {sub.billing_cycle}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5 font-mono text-[11px]">
                            <span>{format(parseISO(sub.renewal_date), "dd MMM yyyy")}</span>
                            {sub.status === "active" && (
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1 py-0 h-4 border ${
                                  isDueSoon
                                    ? "bg-danger/10 text-danger border-danger/30"
                                    : "bg-muted/40 text-muted-foreground border-border"
                                }`}
                              >
                                {daysLeft <= 0 ? "Due" : `${daysLeft}d`}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">
                          {sub.account?.name ? (
                            <span className="truncate block max-w-[140px]">
                              {sub.account.name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {sub.category?.name ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-muted/40 text-muted-foreground">
                              {sub.category.name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-foreground">
                          <MoneyDisplay amount={sub.cost} currency={sub.currency} />
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Badge
                            variant="outline"
                            className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 border ${
                              sub.status === "active"
                                ? "bg-positive/10 text-positive border-positive/30"
                                : sub.status === "paused"
                                ? "bg-warning/10 text-warning border-warning/30"
                                : "bg-muted text-muted-foreground border-border"
                            }`}
                          >
                            {sub.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {sub.status !== "cancelled" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => handleToggleStatus(sub.id, sub.status)}
                                disabled={processingId === sub.id}
                                title={sub.status === "active" ? "Pause subscription" : "Resume subscription"}
                              >
                                {sub.status === "active" ? (
                                  <Pause className="h-3.5 w-3.5" />
                                ) : (
                                  <Play className="h-3.5 w-3.5 text-positive" />
                                )}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-danger hover:bg-danger/10"
                              onClick={() => handleDelete(sub.id, sub.name)}
                              disabled={processingId === sub.id}
                              title="Delete subscription"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


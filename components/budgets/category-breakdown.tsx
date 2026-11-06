"use client";

import * as React from "react";
import {
  Layers,
  Search,
  LayoutGrid,
  List,
  ArrowUpRight,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Receipt,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { MoneyDisplay } from "@/components/financial/money-display";
import { Tables } from "@/types/database";
import {
  calculateBudgetUtilization,
  toDecimal,
} from "@/lib/calculations/financial";
import {
  CategoryDetailModal,
  CategoryDetailData,
} from "./category-detail-modal";

export interface CategoryBreakdownItem {
  category: Tables<"categories">;
  allocatedAmount?: string | number | null;
  spent: string | number;
  transactionCount: number;
  transactions: Array<{
    id: string;
    description: string;
    amount: number | string;
    transaction_date: string;
    account_name?: string;
  }>;
}

interface CategoryBreakdownProps {
  items: CategoryBreakdownItem[];
  totalBudgetCap?: string | number;
}

export function CategoryBreakdown({
  items,
  totalBudgetCap,
}: CategoryBreakdownProps) {
  const [search, setSearch] = React.useState("");
  const [viewMode, setViewMode] = React.useState<"table" | "grid">("table");
  const [selectedCategoryData, setSelectedCategoryData] =
    React.useState<CategoryDetailData | null>(null);

  const filteredItems = React.useMemo(() => {
    return items.filter((item) =>
      item.category.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [items, search]);

  const handleRowClick = (item: CategoryBreakdownItem) => {
    const util = item.allocatedAmount
      ? calculateBudgetUtilization(item.allocatedAmount, item.spent)
      : {
          remaining: totalBudgetCap
            ? toDecimal(totalBudgetCap).minus(toDecimal(item.spent)).toString()
            : "0",
          percentage: 0,
          isOverBudget: false,
        };

    setSelectedCategoryData({
      categoryId: item.category.id,
      categoryName: item.category.name,
      categoryColor: item.category.color || undefined,
      categoryIcon: item.category.icon || undefined,
      allocatedAmount: item.allocatedAmount,
      totalSpent: item.spent,
      remaining: item.allocatedAmount ? util.remaining : undefined,
      percentage: util.percentage,
      isOverBudget: util.isOverBudget,
      transactions: item.transactions,
    });
  };

  return (
    <div className="space-y-4">
      {/* Category Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary">
            Category Spending Envelopes & Budget Breakdown ({items.length})
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Box */}
          <div className="relative w-44 sm:w-56">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-text-secondary" />
            <Input
              type="text"
              placeholder="Search category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs bg-surface border-border rounded-lg"
            />
          </div>

          {/* Table / Grid Toggle */}
          <div className="flex items-center bg-surface-secondary rounded-lg p-0.5 border border-border/60">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode("table")}
              className={`h-7 w-7 rounded-md ${
                viewMode === "table"
                  ? "bg-surface text-primary shadow-2xs"
                  : "text-text-secondary hover:text-text-primary"
              }`}
              title="Table View"
            >
              <List className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode("grid")}
              className={`h-7 w-7 rounded-md ${
                viewMode === "grid"
                  ? "bg-surface text-primary shadow-2xs"
                  : "text-text-secondary hover:text-text-primary"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Breakdown View */}
      {filteredItems.length === 0 ? (
        <div className="p-8 text-center rounded-2xl border border-dashed border-border/80 bg-surface text-xs text-text-secondary">
          No categories match &ldquo;{search}&rdquo;.
        </div>
      ) : viewMode === "table" ? (
        /* Table View */
        <div className="rounded-2xl border border-border/80 bg-surface shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-secondary/60 border-b border-border/70 text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-3 text-right">Limit</th>
                  <th className="py-3 px-3 text-right">Spent</th>
                  <th className="py-3 px-3 text-right">Remaining</th>
                  <th className="py-3 px-4 min-w-[140px]">% Used</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Txns</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-sans">
                {filteredItems.map((item) => {
                  const hasAlloc = !!item.allocatedAmount;
                  const util = hasAlloc
                    ? calculateBudgetUtilization(item.allocatedAmount!, item.spent)
                    : null;
                  const pct = util ? util.percentage : 0;
                  const isOver = util ? util.isOverBudget : false;
                  const isWarning = pct >= 75 && !isOver;
                  const spentZero = toDecimal(item.spent).isZero();

                  let statusBadge = (
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 text-text-secondary border-border/70">
                      Inactive
                    </Badge>
                  );

                  if (isOver) {
                    statusBadge = (
                      <Badge className="text-[10px] py-0 px-1.5 h-4 bg-danger/15 text-danger border-danger/30 font-semibold">
                        Over Limit
                      </Badge>
                    );
                  } else if (isWarning) {
                    statusBadge = (
                      <Badge className="text-[10px] py-0 px-1.5 h-4 bg-warning/15 text-warning border-warning/30 font-semibold">
                        Near Limit
                      </Badge>
                    );
                  } else if (!spentZero) {
                    statusBadge = (
                      <Badge className="text-[10px] py-0 px-1.5 h-4 bg-success/15 text-success border-success/30 font-semibold">
                        On Track
                      </Badge>
                    );
                  }

                  return (
                    <tr
                      key={item.category.id}
                      onClick={() => handleRowClick(item)}
                      className="hover:bg-surface-secondary/40 cursor-pointer transition-colors"
                    >
                      {/* Category Name & Color */}
                      <td className="py-3 px-4 font-semibold text-text-primary">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{
                              backgroundColor:
                                item.category.color || "var(--primary)",
                            }}
                          />
                          <span className="truncate">{item.category.name}</span>
                        </div>
                      </td>

                      {/* Limit */}
                      <td className="py-3 px-3 text-right font-medium text-text-secondary font-mono tabular-nums">
                        {hasAlloc ? (
                          <MoneyDisplay amount={item.allocatedAmount!} />
                        ) : (
                          <span className="text-text-secondary/60">Overall</span>
                        )}
                      </td>

                      {/* Spent */}
                      <td className="py-3 px-3 text-right font-bold text-text-primary font-mono tabular-nums">
                        <MoneyDisplay amount={item.spent} />
                      </td>

                      {/* Remaining */}
                      <td className="py-3 px-3 text-right font-semibold font-mono tabular-nums">
                        {util ? (
                          <MoneyDisplay
                            amount={util.remaining}
                            className={isOver ? "text-danger" : "text-success"}
                          />
                        ) : (
                          <span className="text-text-secondary/60">—</span>
                        )}
                      </td>

                      {/* % Used & Progress Bar */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-mono tabular-nums">
                            <span
                              className={`font-bold ${
                                isOver
                                  ? "text-danger"
                                  : isWarning
                                  ? "text-warning"
                                  : !spentZero
                                  ? "text-success"
                                  : "text-text-secondary"
                              }`}
                            >
                              {hasAlloc ? `${pct}%` : `${toDecimal(item.spent).gt(0) ? "Active" : "0%"}`}
                            </span>
                          </div>
                          <Progress
                            value={hasAlloc ? Math.min(pct, 100) : spentZero ? 0 : 50}
                            indicatorClassName={
                              isOver
                                ? "bg-danger"
                                : isWarning
                                ? "bg-warning"
                                : !spentZero
                                ? "bg-success"
                                : "bg-text-secondary/30"
                            }
                            className="h-1.5 rounded-full bg-surface-secondary"
                          />
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">{statusBadge}</td>

                      {/* Transaction Count */}
                      <td className="py-3 px-3 text-center font-mono text-[11px] text-text-secondary">
                        {item.transactionCount}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(item);
                          }}
                          className="h-7 w-7 p-0 text-text-secondary hover:text-primary rounded-lg"
                        >
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid View (Cards) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredItems.map((item) => {
            const hasAlloc = !!item.allocatedAmount;
            const util = hasAlloc
              ? calculateBudgetUtilization(item.allocatedAmount!, item.spent)
              : null;
            const pct = util ? util.percentage : 0;
            const isOver = util ? util.isOverBudget : false;
            const isWarning = pct >= 75 && !isOver;

            return (
              <Card
                key={item.category.id}
                onClick={() => handleRowClick(item)}
                className="p-4 rounded-2xl border border-border/80 bg-surface hover:border-primary/40 hover:shadow-sm cursor-pointer transition-all space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="h-3.5 w-3.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: item.category.color || "var(--primary)",
                      }}
                    />
                    <div className="min-w-0">
                      <span className="font-bold text-xs text-text-primary block truncate">
                        {item.category.name}
                      </span>
                      <span className="text-[10px] text-text-secondary">
                        {item.transactionCount} transaction{item.transactionCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-mono font-bold ${
                      isOver
                        ? "text-danger"
                        : isWarning
                        ? "text-warning"
                        : "text-success"
                    }`}
                  >
                    {hasAlloc ? `${pct}%` : "—"}
                  </span>
                </div>

                <Progress
                  value={hasAlloc ? Math.min(pct, 100) : 0}
                  indicatorClassName={
                    isOver
                      ? "bg-danger"
                      : isWarning
                      ? "bg-warning"
                      : "bg-success"
                  }
                  className="h-1.5 rounded-full bg-surface-secondary"
                />

                <div className="flex items-center justify-between text-[11px] font-mono pt-0.5">
                  <div>
                    <span className="text-[10px] text-text-secondary block">Spent</span>
                    <MoneyDisplay amount={item.spent} className="font-bold text-text-primary" />
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-text-secondary block">Limit</span>
                    {hasAlloc ? (
                      <MoneyDisplay amount={item.allocatedAmount!} className="font-medium text-text-secondary" />
                    ) : (
                      <span className="text-text-secondary">Overall</span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Drilldown Modal */}
      <CategoryDetailModal
        data={selectedCategoryData}
        open={!!selectedCategoryData}
        onOpenChange={(open) => {
          if (!open) setSelectedCategoryData(null);
        }}
      />
    </div>
  );
}

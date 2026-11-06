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
  Trash2,
  Edit2,
  ArrowUpDown,
  Filter,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  allocationId?: string;
  category: Tables<"categories">;
  allocatedAmount: string | number;
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
  hasOverallBudget?: boolean;
  onAddCategoryBudget?: () => void;
  onEditAllocation?: (item: CategoryBreakdownItem) => void;
  onDeleteAllocation?: (allocationId: string) => void;
}

type SortField = "name" | "limit" | "spent" | "remaining" | "used";
type StatusFilter = "all" | "within" | "near" | "over";

export function CategoryBreakdown({
  items,
  hasOverallBudget = false,
  onAddCategoryBudget,
  onEditAllocation,
  onDeleteAllocation,
}: CategoryBreakdownProps) {
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [sortField, setSortField] = React.useState<SortField>("spent");
  const [sortAsc, setSortAsc] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<"table" | "grid">("table");
  const [selectedCategoryData, setSelectedCategoryData] =
    React.useState<CategoryDetailData | null>(null);

  // Filter and sort items
  const processedItems = React.useMemo(() => {
    return items
      .filter((item) => {
        // Search filter
        if (
          search &&
          !item.category.name.toLowerCase().includes(search.toLowerCase())
        ) {
          return false;
        }

        // Status filter
        const util = calculateBudgetUtilization(
          item.allocatedAmount,
          item.spent
        );
        if (statusFilter === "over" && !util.isOverBudget) return false;
        if (
          statusFilter === "near" &&
          (util.percentage < 75 || util.isOverBudget)
        )
          return false;
        if (statusFilter === "within" && (util.percentage >= 75 || util.isOverBudget))
          return false;

        return true;
      })
      .sort((a, b) => {
        const utilA = calculateBudgetUtilization(a.allocatedAmount, a.spent);
        const utilB = calculateBudgetUtilization(b.allocatedAmount, b.spent);

        let diff = 0;
        if (sortField === "name") {
          diff = a.category.name.localeCompare(b.category.name);
        } else if (sortField === "limit") {
          diff = toDecimal(a.allocatedAmount)
            .minus(toDecimal(b.allocatedAmount))
            .toNumber();
        } else if (sortField === "spent") {
          diff = toDecimal(a.spent).minus(toDecimal(b.spent)).toNumber();
        } else if (sortField === "remaining") {
          diff = toDecimal(utilA.remaining)
            .minus(toDecimal(utilB.remaining))
            .toNumber();
        } else if (sortField === "used") {
          diff = utilA.percentage - utilB.percentage;
        }

        return sortAsc ? diff : -diff;
      });
  }, [items, search, statusFilter, sortField, sortAsc]);

  const handleRowClick = (item: CategoryBreakdownItem) => {
    const util = calculateBudgetUtilization(item.allocatedAmount, item.spent);
    setSelectedCategoryData({
      categoryId: item.category.id,
      categoryName: item.category.name,
      categoryColor: item.category.color || undefined,
      categoryIcon: item.category.icon || undefined,
      allocatedAmount: item.allocatedAmount,
      totalSpent: item.spent,
      remaining: util.remaining,
      percentage: util.percentage,
      isOverBudget: util.isOverBudget,
      transactions: item.transactions,
    });
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // EMPTY STATES PER USER REQUIREMENT:
  // 1. Overall budget exists, but 0 category budgets created
  if (items.length === 0 && hasOverallBudget) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 p-8 sm:p-12 text-center bg-surface space-y-3">
        <div className="mx-auto h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <Layers className="h-5 w-5" />
        </div>
        <div className="max-w-md mx-auto space-y-1">
          <h3 className="text-base font-bold text-text-primary">
            No category budgets yet
          </h3>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            Allocate part of your overall budget to categories to track your spending in detail.
          </p>
        </div>
        {onAddCategoryBudget && (
          <div className="pt-2">
            <Button
              onClick={onAddCategoryBudget}
              className="bg-primary hover:bg-primary-hover text-surface rounded-xl text-xs font-semibold shadow-xs gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Category Budget</span>
            </Button>
          </div>
        )}
      </div>
    );
  }

  // 2. No budgets exist at all
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Category Section Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold tracking-tight text-text-primary">
            Category Spending Envelopes &amp; Limits ({items.length})
          </h3>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Search Box */}
          <div className="relative w-40 sm:w-48">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-text-secondary" />
            <Input
              type="text"
              placeholder="Search category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs bg-surface border-border rounded-lg"
            />
          </div>

          {/* Status Filter */}
          <Select
            value={statusFilter}
            onValueChange={(val: any) => setStatusFilter(val)}
          >
            <SelectTrigger className="h-8 text-xs bg-surface border-border w-32">
              <Filter className="h-3 w-3 text-text-secondary mr-1 shrink-0" />
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent className="bg-surface text-text-primary border-border">
              <SelectItem value="all" className="text-xs">All Status</SelectItem>
              <SelectItem value="within" className="text-xs">Within Budget</SelectItem>
              <SelectItem value="near" className="text-xs">Near Limit</SelectItem>
              <SelectItem value="over" className="text-xs">Over Limit</SelectItem>
            </SelectContent>
          </Select>

          {/* Table / Grid View Switcher */}
          <div className="flex items-center bg-surface-secondary rounded-lg p-0.5 border border-border/60">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode("table")}
              className={`h-7 w-7 rounded-md ${
                viewMode === "table"
                  ? "bg-surface text-primary shadow-2xs font-bold"
                  : "text-text-secondary hover:text-text-primary"
              }`}
              title="Table View"
              aria-label="Table View"
            >
              <List className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode("grid")}
              className={`h-7 w-7 rounded-md ${
                viewMode === "grid"
                  ? "bg-surface text-primary shadow-2xs font-bold"
                  : "text-text-secondary hover:text-text-primary"
              }`}
              title="Grid View"
              aria-label="Grid View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Add Category Allocation button */}
          {onAddCategoryBudget && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAddCategoryBudget}
              className="h-8 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10 rounded-lg shrink-0 font-medium"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Envelope</span>
            </Button>
          )}
        </div>
      </div>

      {/* Breakdown View */}
      {processedItems.length === 0 ? (
        <div className="p-8 text-center rounded-2xl border border-dashed border-border/80 bg-surface text-xs text-text-secondary">
          No allocated categories match current search or status filter.
        </div>
      ) : viewMode === "table" ? (
        /* Table View */
        <div className="rounded-2xl border border-border/80 bg-surface shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-secondary/60 border-b border-border/70 text-[11px] font-semibold text-text-secondary uppercase tracking-wider select-none">
                <tr>
                  <th
                    onClick={() => toggleSort("name")}
                    className="py-3 px-4 cursor-pointer hover:text-text-primary transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>Category</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort("limit")}
                    className="py-3 px-3 text-right cursor-pointer hover:text-text-primary transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Budget Limit</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort("spent")}
                    className="py-3 px-3 text-right cursor-pointer hover:text-text-primary transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Spent</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort("remaining")}
                    className="py-3 px-3 text-right cursor-pointer hover:text-text-primary transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Remaining</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort("used")}
                    className="py-3 px-4 min-w-[140px] cursor-pointer hover:text-text-primary transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span>Used</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Transactions</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-sans">
                {processedItems.map((item) => {
                  const util = calculateBudgetUtilization(
                    item.allocatedAmount,
                    item.spent
                  );
                  const isOver = util.isOverBudget;
                  const isWarning = util.percentage >= 75 && !isOver;
                  const spentZero = toDecimal(item.spent).isZero();

                  let statusBadge = (
                    <Badge className="text-[10px] py-0 px-1.5 h-4 bg-success/15 text-success border-success/30 font-semibold">
                      Within Budget
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
                  }

                  return (
                    <tr
                      key={item.category.id}
                      onClick={() => handleRowClick(item)}
                      className="hover:bg-surface-secondary/40 cursor-pointer transition-colors"
                    >
                      {/* Category Name & Color */}
                      <td className="py-3.5 px-4 font-semibold text-text-primary">
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
                      <td className="py-3.5 px-3 text-right font-medium text-text-secondary font-mono tabular-nums">
                        <MoneyDisplay amount={item.allocatedAmount} />
                      </td>

                      {/* Spent */}
                      <td className="py-3.5 px-3 text-right font-bold text-text-primary font-mono tabular-nums">
                        <MoneyDisplay amount={item.spent} />
                      </td>

                      {/* Remaining */}
                      <td className="py-3.5 px-3 text-right font-semibold font-mono tabular-nums">
                        <MoneyDisplay
                          amount={util.remaining}
                          className={isOver ? "text-danger" : "text-success"}
                        />
                      </td>

                      {/* Used & Progress Bar */}
                      <td className="py-3.5 px-4">
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
                              {util.percentage}%
                            </span>
                          </div>
                          <Progress
                            value={Math.min(util.percentage, 100)}
                            indicatorClassName={
                              isOver
                                ? "bg-danger"
                                : isWarning
                                ? "bg-warning"
                                : "bg-success"
                            }
                            className="h-1.5 rounded-full bg-surface-secondary"
                          />
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center">{statusBadge}</td>

                      {/* Transaction Count */}
                      <td className="py-3.5 px-3 text-center font-mono text-[11px] text-text-secondary">
                        {item.transactionCount}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {onEditAllocation && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditAllocation(item);
                              }}
                              className="h-7 w-7 text-text-secondary hover:text-text-primary rounded-lg"
                              title="Edit Allocation"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          )}
                          {onDeleteAllocation && item.allocationId && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteAllocation(item.allocationId!);
                              }}
                              className="h-7 w-7 text-text-secondary hover:text-danger rounded-lg"
                              title="Delete Allocation"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowClick(item);
                            }}
                            className="h-7 w-7 text-text-secondary hover:text-primary rounded-lg"
                            title="View Transactions"
                          >
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
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
          {processedItems.map((item) => {
            const util = calculateBudgetUtilization(
              item.allocatedAmount,
              item.spent
            );
            const isOver = util.isOverBudget;
            const isWarning = util.percentage >= 75 && !isOver;

            return (
              <Card
                key={item.category.id}
                onClick={() => handleRowClick(item)}
                className="p-4 rounded-2xl border border-border/80 bg-surface hover:border-primary/40 hover:shadow-xs cursor-pointer transition-all space-y-3"
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
                    {util.percentage}%
                  </span>
                </div>

                <Progress
                  value={Math.min(util.percentage, 100)}
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
                    <MoneyDisplay amount={item.allocatedAmount} className="font-medium text-text-secondary" />
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

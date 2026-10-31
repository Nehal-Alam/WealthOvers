"use client";

import * as React from "react";
import { Sparkles, Trash2, ArrowRight, ShieldCheck, Play } from "lucide-react";
import { toast } from "sonner";

import { Tables } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateRuleDialog } from "./create-rule-dialog";
import {
  deleteCategorizationRuleAction,
  applyCategorizationRulesToTransactionsAction,
} from "@/app/(dashboard)/categories/actions";

interface CategoryWithSubcategories extends Tables<"categories"> {
  subcategories: Tables<"subcategories">[];
}

interface CategorizationRulesViewProps {
  rules: Tables<"categorization_rules">[];
  categories: CategoryWithSubcategories[];
}

export function CategorizationRulesView({ rules, categories }: CategorizationRulesViewProps) {
  const [isApplying, setIsApplying] = React.useState(false);

  const getCategoryName = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    return cat ? cat.name : "Unknown Category";
  };

  const getSubcategoryName = (catId: string, subcatId: string | null) => {
    if (!subcatId) return null;
    const cat = categories.find((c) => c.id === catId);
    const subcat = cat?.subcategories.find((s) => s.id === subcatId);
    return subcat ? subcat.name : null;
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      const res = await deleteCategorizationRuleAction(ruleId);
      if (res.success) {
        toast.success(res.message || "Rule deleted");
      } else {
        toast.error(res.error || "Failed to delete rule");
      }
    } catch {
      toast.error("Failed to delete rule");
    }
  };

  const handleApplyRules = async () => {
    setIsApplying(true);
    try {
      const res = await applyCategorizationRulesToTransactionsAction();
      if (res.success) {
        toast.success(res.message || "Rules applied successfully");
      } else {
        toast.error(res.error || "Failed to apply rules");
      }
    } catch {
      toast.error("An error occurred while applying rules");
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            Automatic Categorization Rules
          </CardTitle>
          <CardDescription>
            Rules are evaluated in priority order to auto-tag imported and synced transactions.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleApplyRules}
            disabled={isApplying || rules.length === 0}
            className="gap-2"
          >
            <Play className="h-3.5 w-3.5" />
            {isApplying ? "Applying..." : "Run Rules on Uncategorized"}
          </Button>
          <CreateRuleDialog categories={categories} />
        </div>
      </CardHeader>
      <CardContent>
        {rules.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium">No Categorization Rules Defined</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Create rules like &quot;Swiggy&quot; → Food & Dining or &quot;Salary&quot; → Monthly Income to automatically classify transactions.
            </p>
            <div className="mt-4">
              <CreateRuleDialog categories={categories} />
            </div>
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Priority</TableHead>
                  <TableHead>Keyword Pattern</TableHead>
                  <TableHead>Field</TableHead>
                  <TableHead>Target Category</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => {
                  const catName = getCategoryName(rule.target_category_id);
                  const subcatName = getSubcategoryName(
                    rule.target_category_id,
                    rule.target_subcategory_id
                  );

                  return (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {rule.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium font-mono text-sm">
                        {rule.keyword_pattern}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize text-xs">
                          {rule.match_field}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm">
                          <span className="font-medium">{catName}</span>
                          {subcatName && (
                            <>
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">{subcatName}</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteRule(rule.id)}
                          aria-label="Delete categorization rule"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


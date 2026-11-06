"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  PlusCircle,
  Loader2,
  PiggyBank,
  Plus,
  Trash2,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Sliders,
  Layers,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { startOfMonth, endOfMonth, format } from "date-fns";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  createBudgetSchema,
  CreateBudgetInput,
  budgetTypeValues,
} from "@/lib/validations/budgets";
import { createBudgetAction } from "@/app/(dashboard)/budgets/actions";
import { Tables } from "@/types/database";
import { toDecimal, addMoney } from "@/lib/calculations/financial";

interface CreateBudgetDialogProps {
  categories: Tables<"categories">[];
  accounts?: Tables<"accounts">[];
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

const templates = [
  { id: "custom", label: "Custom (Blank)", amount: "" },
  { id: "personal", label: "Personal Monthly", amount: "50000" },
  { id: "student", label: "Student Budget", amount: "20000" },
  { id: "family", label: "Family Household", amount: "120000" },
  { id: "rule_50_30_20", label: "50/30/20 Rule", amount: "75000" },
  { id: "minimalist", label: "Minimalist Essentials", amount: "30000" },
];

export function CreateBudgetDialog({
  categories,
  accounts = [],
  trigger,
  onSuccess,
}: CreateBudgetDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [currentStep, setCurrentStep] = React.useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [selectedTemplate, setSelectedTemplate] = React.useState("custom");

  const expenseCategories = React.useMemo(
    () => categories.filter((c) => c.type === "expense" || !c.type),
    [categories]
  );

  const now = new Date();
  const defaultStart = format(startOfMonth(now), "yyyy-MM-dd");
  const defaultEnd = format(endOfMonth(now), "yyyy-MM-dd");

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    trigger: validateStep,
    formState: { errors },
  } = useForm<CreateBudgetInput>({
    resolver: zodResolver(createBudgetSchema) as any,
    defaultValues: {
      name: `${format(now, "MMMM yyyy")} Budget`,
      total_amount: "",
      period_type: "monthly",
      budget_type: "overall_monthly",
      start_date: defaultStart,
      end_date: defaultEnd,
      rollover_enabled: false,
      rollover_mode: "none",
      rollover_limit: "",
      alert_threshold_percent: 85,
      alert_thresholds: [50, 75, 90, 100],
      allocations: [],
      notes: "",
      status: "active",
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "allocations",
  });

  const totalAmount = watch("total_amount");
  const budgetType = watch("budget_type");
  const rolloverEnabled = watch("rollover_enabled");
  const rolloverMode = watch("rollover_mode");
  const alertThresholds = watch("alert_thresholds") || [50, 75, 90, 100];
  const rawAllocations = watch("allocations");

  // Live sum of category allocations
  const totalAllocated = React.useMemo(() => {
    let sum = "0.0000";
    const list = rawAllocations || [];
    for (const alloc of list) {
      if (alloc.allocated_amount) {
        sum = addMoney(sum, alloc.allocated_amount);
      }
    }
    return toDecimal(sum).toFixed(2);
  }, [rawAllocations]);

  const totalBudgetDec = toDecimal(totalAmount || "0");
  const allocatedDec = toDecimal(totalAllocated);
  const isOverAllocated = allocatedDec.gt(totalBudgetDec) && totalBudgetDec.gt(0);
  const unallocatedAmount = totalBudgetDec.gt(allocatedDec)
    ? totalBudgetDec.minus(allocatedDec).toFixed(2)
    : "0.00";

  // Template prefill only (Templates are NEVER saved automatically!)
  const handleApplyTemplate = (tplId: string) => {
    setSelectedTemplate(tplId);
    const tpl = templates.find((t) => t.id === tplId);
    if (!tpl || !tpl.amount) return;

    setValue("total_amount", tpl.amount);

    if (expenseCategories.length > 0) {
      const budgetNum = parseFloat(tpl.amount);
      if (tplId === "personal") {
        const allocs = expenseCategories.slice(0, 4).map((c, idx) => ({
          category_id: c.id,
          allocated_amount: (budgetNum * (idx === 0 ? 0.35 : idx === 1 ? 0.25 : 0.2)).toFixed(2),
        }));
        replace(allocs);
      } else if (tplId === "student") {
        const allocs = expenseCategories.slice(0, 3).map((c, idx) => ({
          category_id: c.id,
          allocated_amount: (budgetNum * (idx === 0 ? 0.45 : idx === 1 ? 0.3 : 0.25)).toFixed(2),
        }));
        replace(allocs);
      } else if (tplId === "family") {
        const allocs = expenseCategories.slice(0, 5).map((c) => ({
          category_id: c.id,
          allocated_amount: (budgetNum * 0.2).toFixed(2),
        }));
        replace(allocs);
      }
    }
    toast.info(`Prefilled form using "${tpl.label}" template. Click "Save Budget" when ready.`);
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      const valid = await validateStep(["name", "total_amount", "start_date", "end_date"]);
      if (valid) setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2);
    }
  };

  const onSubmit = async (data: CreateBudgetInput) => {
    setIsSubmitting(true);
    try {
      const res = await createBudgetAction(data);
      if (res.success) {
        toast.success(res.message || "Budget created successfully!");
        reset();
        setCurrentStep(1);
        setOpen(false);
        onSuccess?.();
      } else {
        toast.error(res.error || "Failed to create budget");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        setOpen(val);
        if (!val) {
          setCurrentStep(1);
        }
      }}
    >
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2 bg-primary hover:bg-primary-hover text-surface rounded-xl shadow-xs transition-colors">
            <PlusCircle className="h-4 w-4" />
            <span>Create Budget</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px] bg-surface text-text-primary border-border p-6 rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-primary" />
            <span>Create Spending Budget</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-text-secondary">
            Step {currentStep} of 3: {currentStep === 1 ? "Basic Details" : currentStep === 2 ? "Category Allocation" : "Preferences & Alerts"}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator Tabs */}
        <div className="grid grid-cols-3 gap-2 py-2 border-b border-border/70 my-1">
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentStep === 1
                ? "bg-primary text-surface shadow-2xs font-bold"
                : "bg-surface-secondary text-text-secondary hover:text-text-primary"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>1. Details</span>
          </button>
          <button
            type="button"
            onClick={async () => {
              const valid = await validateStep(["name", "total_amount"]);
              if (valid) setCurrentStep(2);
            }}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentStep === 2
                ? "bg-primary text-surface shadow-2xs font-bold"
                : "bg-surface-secondary text-text-secondary hover:text-text-primary"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>2. Categories</span>
          </button>
          <button
            type="button"
            onClick={async () => {
              const valid = await validateStep(["name", "total_amount"]);
              if (valid) setCurrentStep(3);
            }}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentStep === 3
                ? "bg-primary text-surface shadow-2xs font-bold"
                : "bg-surface-secondary text-text-secondary hover:text-text-primary"
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>3. Preferences</span>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* STEP 1: BASIC DETAILS */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              {/* Template selection pill */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span>Optional Starter Template</span>
                  </Label>
                  <span className="text-[10px] text-text-secondary">Prefills form only</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleApplyTemplate(tpl.id)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        selectedTemplate === tpl.id
                          ? "bg-primary text-surface border-primary font-semibold shadow-2xs"
                          : "bg-surface-secondary text-text-secondary border-border/70 hover:text-text-primary"
                      }`}
                    >
                      {tpl.label} {tpl.amount ? `(₹${parseInt(tpl.amount) / 1000}k)` : ""}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget Name */}
              <div className="space-y-1.5">
                <Label htmlFor="bgt-name" className="text-xs font-medium text-text-secondary">
                  Budget Title <span className="text-danger">*</span>
                </Label>
                <Input
                  id="bgt-name"
                  placeholder="e.g. November 2026 Household Budget"
                  {...register("name")}
                  className="h-9 text-xs bg-surface border-border text-text-primary"
                />
                {errors.name && (
                  <p className="text-xs text-danger">{errors.name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Budget Type */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-text-secondary">
                    Budget Type <span className="text-danger">*</span>
                  </Label>
                  <Select
                    defaultValue="overall_monthly"
                    onValueChange={(val: any) => setValue("budget_type", val)}
                  >
                    <SelectTrigger className="h-9 text-xs bg-surface border-border">
                      <SelectValue placeholder="Budget Type" />
                    </SelectTrigger>
                    <SelectContent className="bg-surface text-text-primary border-border">
                      <SelectItem value="overall_monthly">Overall Monthly</SelectItem>
                      <SelectItem value="category">Category Budget</SelectItem>
                      <SelectItem value="multi_category">Multi-category Budget</SelectItem>
                      <SelectItem value="weekly">Weekly Budget</SelectItem>
                      <SelectItem value="custom_range">Custom Period Budget</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Total Budget Amount */}
                <div className="space-y-1.5">
                  <Label htmlFor="bgt-amt" className="text-xs font-medium text-text-secondary">
                    Total Amount (₹) <span className="text-danger">*</span>
                  </Label>
                  <Input
                    id="bgt-amt"
                    type="number"
                    step="0.01"
                    placeholder="50000.00"
                    {...register("total_amount")}
                    className="h-9 text-xs font-semibold tabular-nums bg-surface border-border"
                  />
                  {errors.total_amount && (
                    <p className="text-xs text-danger">{errors.total_amount.message}</p>
                  )}
                </div>
              </div>

              {/* Period Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="bgt-start" className="text-xs font-medium text-text-secondary">
                    Start Date <span className="text-danger">*</span>
                  </Label>
                  <Input id="bgt-start" type="date" {...register("start_date")} className="h-9 text-xs bg-surface border-border" />
                  {errors.start_date && (
                    <p className="text-xs text-danger">{errors.start_date.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bgt-end" className="text-xs font-medium text-text-secondary">
                    End Date <span className="text-danger">*</span>
                  </Label>
                  <Input id="bgt-end" type="date" {...register("end_date")} className="h-9 text-xs bg-surface border-border" />
                  {errors.end_date && (
                    <p className="text-xs text-danger">{errors.end_date.message}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CATEGORY ALLOCATION */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-surface-secondary/60 border border-border/70 text-center font-mono">
                <div>
                  <span className="text-[10px] text-text-secondary uppercase tracking-wider block font-sans">
                    Overall Budget
                  </span>
                  <span className="text-xs font-bold text-text-primary">
                    ₹{totalAmount ? parseFloat(totalAmount).toLocaleString("en-IN") : "0"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-text-secondary uppercase tracking-wider block font-sans">
                    Allocated
                  </span>
                  <span className="text-xs font-bold text-primary">
                    ₹{parseFloat(totalAllocated).toLocaleString("en-IN")}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-text-secondary uppercase tracking-wider block font-sans">
                    Unallocated
                  </span>
                  <span className={`text-xs font-bold ${isOverAllocated ? "text-danger" : "text-success"}`}>
                    ₹{parseFloat(unallocatedAmount).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Warning if over-allocated */}
              {isOverAllocated && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl border border-warning/30 bg-warning/10 text-warning text-xs">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    Allocated category envelopes (₹{parseFloat(totalAllocated).toLocaleString("en-IN")}) exceed the overall budget limit (₹{parseFloat(totalAmount).toLocaleString("en-IN")}).
                  </span>
                </div>
              )}

              {/* Envelopes list */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-text-primary">
                    Category Spending Envelopes {budgetType === "overall_monthly" && "(Optional)"}
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1 rounded-lg border-border text-text-secondary hover:text-text-primary"
                    onClick={() => {
                      if (expenseCategories.length > 0) {
                        append({
                          category_id: expenseCategories[0].id,
                          allocated_amount: "5000.00",
                        });
                      }
                    }}
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Category Limit</span>
                  </Button>
                </div>

                {fields.length === 0 ? (
                  <div className="p-6 text-center rounded-xl border border-dashed border-border/80 bg-surface-secondary/20 text-xs text-text-secondary space-y-1">
                    <p className="font-medium text-text-primary">No category envelopes added yet</p>
                    <p className="text-[11px]">
                      {budgetType === "overall_monthly"
                        ? "Category allocation is optional for overall budgets. You can save with or without sub-envelopes."
                        : "Click 'Add Category Limit' above to assign envelope limits to specific categories."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {fields.map((field, idx) => (
                      <div key={field.id} className="flex items-center gap-2">
                        <div className="flex-1">
                          <Select
                            defaultValue={field.category_id}
                            onValueChange={(val) =>
                              setValue(`allocations.${idx}.category_id`, val)
                            }
                          >
                            <SelectTrigger className="h-8 text-xs bg-surface border-border">
                              <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent className="bg-surface text-text-primary border-border">
                              {expenseCategories.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="w-32">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Limit"
                            className="h-8 text-xs font-semibold tabular-nums bg-surface border-border"
                            {...register(`allocations.${idx}.allocated_amount`)}
                          />
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-text-secondary hover:text-danger rounded-lg shrink-0"
                          onClick={() => remove(idx)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: PREFERENCES */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              {/* Rollover Settings */}
              <div className="rounded-xl border border-border p-3.5 bg-surface-secondary/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-medium text-text-primary flex items-center gap-1.5">
                      <RotateCcw className="h-3.5 w-3.5 text-primary" />
                      <span>Envelope Rollover</span>
                    </Label>
                    <p className="text-[11px] text-text-secondary">
                      Automatically roll unspent funds into the next monthly cycle.
                    </p>
                  </div>
                  <Switch
                    checked={rolloverEnabled}
                    onCheckedChange={(val) => {
                      setValue("rollover_enabled", val);
                      setValue("rollover_mode", val ? "full" : "none");
                    }}
                  />
                </div>

                {rolloverEnabled && (
                  <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-border/50">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-text-secondary">Rollover Mode</Label>
                      <Select
                        defaultValue={rolloverMode || "full"}
                        onValueChange={(val: any) => setValue("rollover_mode", val)}
                      >
                        <SelectTrigger className="h-8 text-xs bg-surface border-border">
                          <SelectValue placeholder="Mode" />
                        </SelectTrigger>
                        <SelectContent className="bg-surface text-text-primary border-border">
                          <SelectItem value="full">Full Unspent</SelectItem>
                          <SelectItem value="partial">50% Savings</SelectItem>
                          <SelectItem value="capped">Capped Limit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {rolloverMode === "capped" && (
                      <div className="space-y-1">
                        <Label className="text-[11px] text-text-secondary">Max Cap (₹)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="10000.00"
                          {...register("rollover_limit")}
                          className="h-8 text-xs bg-surface border-border"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Alert Thresholds */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-text-secondary">
                  Alert Trigger Thresholds
                </Label>
                <div className="flex items-center gap-2">
                  {[50, 75, 90, 100].map((th) => (
                    <Badge
                      key={th}
                      variant="outline"
                      className="text-xs px-2.5 py-1 bg-surface border-border/80 text-text-primary font-mono cursor-default"
                    >
                      {th}%
                    </Badge>
                  ))}
                  <span className="text-[11px] text-text-secondary">
                    (In-app notifications when spend reaches thresholds)
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="bgt-notes" className="text-xs font-medium text-text-secondary">
                  Notes / Financial Strategy (Optional)
                </Label>
                <Textarea
                  id="bgt-notes"
                  placeholder="Monthly savings targets, discretionary guardrails..."
                  {...register("notes")}
                  className="text-xs bg-surface border-border resize-none h-16"
                />
              </div>
            </div>
          )}

          {/* Dialog Navigation & Footer Controls */}
          <DialogFooter className="pt-3 border-t border-border/70 flex flex-col sm:flex-row justify-between gap-2">
            <div>
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={isSubmitting}
                  className="border-border text-text-secondary hover:text-text-primary rounded-xl gap-1 text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Back</span>
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
                className="border-border text-text-secondary hover:text-text-primary rounded-xl text-xs"
              >
                Cancel
              </Button>

              {currentStep < 3 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="bg-primary hover:bg-primary-hover text-surface font-semibold rounded-xl text-xs shadow-xs gap-1"
                >
                  <span>Next Step</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary hover:bg-primary-hover text-surface font-semibold rounded-xl text-xs shadow-xs transition-colors"
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <span>Save Budget</span>
                </Button>
              )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

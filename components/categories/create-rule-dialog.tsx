"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createCategorizationRuleSchema,
  CreateCategorizationRuleInput,
} from "@/lib/validations/rules";
import { createCategorizationRuleAction } from "@/app/(dashboard)/categories/actions";
import { Tables } from "@/types/database";

interface CategoryWithSubcategories extends Tables<"categories"> {
  subcategories: Tables<"subcategories">[];
}

interface CreateRuleDialogProps {
  categories: CategoryWithSubcategories[];
  trigger?: React.ReactNode;
}

export function CreateRuleDialog({ categories, trigger }: CreateRuleDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateCategorizationRuleInput>({
    resolver: zodResolver(createCategorizationRuleSchema),
    defaultValues: {
      keyword_pattern: "",
      match_field: "description",
      target_category_id: categories[0]?.id || "",
      target_subcategory_id: null,
      priority: 10,
    },
  });

  const selectedCategoryId = watch("target_category_id");
  const selectedMatchField = watch("match_field");

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const availableSubcategories = selectedCategory?.subcategories || [];

  const onSubmit = async (data: CreateCategorizationRuleInput) => {
    setIsSubmitting(true);
    try {
      const res = await createCategorizationRuleAction(data);
      if (res.success) {
        toast.success(res.message || "Rule created successfully");
        reset();
        setOpen(false);
      } else {
        toast.error(res.error || "Failed to create rule");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Rule
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Create Categorization Rule</DialogTitle>
          <DialogDescription>
            Automatically classify bank statement and synced transactions by matching keywords.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Keyword / Pattern */}
          <div className="space-y-1.5">
            <Label htmlFor="keyword_pattern">Keyword / Match Pattern</Label>
            <Input
              id="keyword_pattern"
              placeholder="e.g. Swiggy, Netflix, Uber, Salary"
              {...register("keyword_pattern")}
            />
            <p className="text-xs text-muted-foreground">
              Matches case-insensitively. Regex like &quot;swiggy|zomato&quot; is supported.
            </p>
            {errors.keyword_pattern && (
              <p className="text-xs text-destructive">{errors.keyword_pattern.message}</p>
            )}
          </div>

          {/* Match Field */}
          <div className="space-y-1.5">
            <Label htmlFor="match_field">Search Field</Label>
            <Select
              value={selectedMatchField}
              onValueChange={(val: any) => setValue("match_field", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select field" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="description">Narration / Description</SelectItem>
                <SelectItem value="merchant">Merchant Name</SelectItem>
                <SelectItem value="reference">Reference / UTR / Chq No</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Target Category */}
          <div className="space-y-1.5">
            <Label htmlFor="target_category_id">Target Category</Label>
            <Select
              value={selectedCategoryId}
              onValueChange={(val) => {
                setValue("target_category_id", val);
                setValue("target_subcategory_id", null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.target_category_id && (
              <p className="text-xs text-destructive">{errors.target_category_id.message}</p>
            )}
          </div>

          {/* Target Subcategory */}
          {availableSubcategories.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="target_subcategory_id">Target Subcategory (Optional)</Label>
              <Select
                value={watch("target_subcategory_id") || "none"}
                onValueChange={(val) =>
                  setValue("target_subcategory_id", val === "none" ? null : val)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="No subcategory" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {availableSubcategories.map((sc) => (
                    <SelectItem key={sc.id} value={sc.id}>
                      {sc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Priority */}
          <div className="space-y-1.5">
            <Label htmlFor="priority">Rule Priority (0 - 100)</Label>
            <Input
              id="priority"
              type="number"
              min="0"
              max="100"
              {...register("priority")}
            />
            <p className="text-xs text-muted-foreground">
              Higher priority rules take precedence when multiple rules match.
            </p>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Create Rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


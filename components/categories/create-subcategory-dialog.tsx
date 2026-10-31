"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createSubcategorySchema,
  CreateSubcategoryInput,
} from "@/lib/validations/categories";
import { createSubcategoryAction } from "@/app/(dashboard)/categories/actions";
import { Tables } from "@/types/database";

interface CreateSubcategoryDialogProps {
  parentCategory: Tables<"categories"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateSubcategoryDialog({
  parentCategory,
  open,
  onOpenChange,
}: CreateSubcategoryDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateSubcategoryInput>({
    resolver: zodResolver(createSubcategorySchema),
    defaultValues: {
      category_id: parentCategory?.id || "",
      name: "",
    },
  });

  React.useEffect(() => {
    if (parentCategory) {
      reset({
        category_id: parentCategory.id,
        name: "",
      });
    }
  }, [parentCategory, reset]);

  const onSubmit = async (data: CreateSubcategoryInput) => {
    setIsSubmitting(true);
    try {
      const res = await createSubcategoryAction(data);
      if (res.success) {
        toast.success(res.message || "Subcategory created");
        reset();
        onOpenChange(false);
      } else {
        toast.error(res.error || "Failed to create subcategory");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!parentCategory) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Subcategory</DialogTitle>
          <DialogDescription>
            Add a subcategory under <span className="font-semibold text-foreground">{parentCategory.name}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="subcat-name">Subcategory Name</Label>
            <Input
              id="subcat-name"
              placeholder="e.g. Restaurants, Coffee, Utilities"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Subcategory
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

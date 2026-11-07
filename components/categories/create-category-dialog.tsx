"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FolderPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createCategorySchema,
  CreateCategoryInput,
  CategoryTypeValue,
} from "@/lib/validations/categories";
import { createCategoryAction } from "@/app/(dashboard)/categories/actions";

const COLOR_PRESETS = [
  "#376FE5", // Blue
  "#16865B", // Emerald
  "#D94D5C", // Red
  "#B77B19", // Amber
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#64748B", // Slate
];

interface CreateCategoryDialogProps {
  defaultType?: CategoryTypeValue;
  trigger?: React.ReactNode;
}

export function CreateCategoryDialog({
  defaultType = "expense",
  trigger,
}: CreateCategoryDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateCategoryInput>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      name: "",
      type: defaultType,
      icon: "Folder",
      color: "#376FE5",
      description: "",
    },
  });

  const selectedColor = watch("color");
  const selectedType = watch("type");

  React.useEffect(() => {
    setValue("type", defaultType);
  }, [defaultType, setValue]);

  const onSubmit = async (data: CreateCategoryInput) => {
    setIsSubmitting(true);
    try {
      const res = await createCategoryAction(data);
      if (res.success) {
        toast.success(res.message || "Category created");
        reset();
        setOpen(false);
      } else {
        toast.error(res.error || "Failed to create category");
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
            <FolderPlus className="h-4 w-4" />
            <span>Add Category</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Create New Category</DialogTitle>
            <DialogDescription>
              Add a custom category to accurately classify your finances.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 text-xs">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Category Name</Label>
              <Input
                id="cat-name"
                placeholder="e.g. Health & Wellness"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <Label htmlFor="cat-type">Type</Label>
              <Select
                value={selectedType}
                onValueChange={(val: CategoryTypeValue) => setValue("type", val)}
              >
                <SelectTrigger id="cat-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="investment">Investment</SelectItem>
                  <SelectItem value="loan">Loan</SelectItem>
                  <SelectItem value="debt">Debt</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-xs text-destructive">{errors.type.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="cat-desc">Description (Optional)</Label>
              <Input
                id="cat-desc"
                placeholder="Brief purpose or classification guidelines"
                {...register("description")}
              />
            </div>

            {/* Color Presets */}
            <div className="space-y-1.5">
              <Label>Color Tag</Label>
              <div className="flex items-center gap-2 flex-wrap pt-1">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setValue("color", color)}
                    className={`h-7 w-7 rounded-full transition-transform ${
                      selectedColor === color
                        ? "ring-2 ring-primary ring-offset-2 scale-110"
                        : "opacity-80 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={`Select color ${color}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Category
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

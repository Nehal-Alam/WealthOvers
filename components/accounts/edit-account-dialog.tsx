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
import { Switch } from "@/components/ui/switch";
import {
  updateAccountSchema,
  UpdateAccountInput,
} from "@/lib/validations/accounts";
import { updateAccountAction } from "@/app/(dashboard)/accounts/actions";
import { Tables } from "@/types/database";

const COLOR_PRESETS = [
  "#3B82F6",
  "#10B981",
  "#6366F1",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#06B6D4",
  "#14B8A6",
];

interface EditAccountDialogProps {
  account: Tables<"accounts"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditAccountDialog({
  account,
  open,
  onOpenChange,
}: EditAccountDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<UpdateAccountInput>({
    resolver: zodResolver(updateAccountSchema),
    defaultValues: {
      id: account?.id || "",
      name: account?.name || "",
      institution_name: account?.institution_name || "",
      account_number_masked: account?.account_number_masked || "",
      color: account?.color || "#3B82F6",
      icon: account?.icon || "Landmark",
      is_archived: account?.is_archived || false,
    },
  });

  React.useEffect(() => {
    if (account) {
      reset({
        id: account.id,
        name: account.name,
        institution_name: account.institution_name,
        account_number_masked: account.account_number_masked || "",
        color: account.color,
        icon: account.icon,
        is_archived: account.is_archived,
      });
    }
  }, [account, reset]);

  const selectedColor = watch("color");
  const isArchived = watch("is_archived");

  const onSubmit = async (data: UpdateAccountInput) => {
    setIsSubmitting(true);
    try {
      const res = await updateAccountAction(data);
      if (res.success) {
        toast.success(res.message || "Account updated");
        onOpenChange(false);
      } else {
        toast.error(res.error || "Failed to update account");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!account) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit Account</DialogTitle>
          <DialogDescription>
            Modify account configuration or archive status.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-acc-name">Account Name</Label>
            <Input id="edit-acc-name" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-acc-inst">Institution</Label>
              <Input id="edit-acc-inst" {...register("institution_name")} />
              {errors.institution_name && (
                <p className="text-xs text-destructive">
                  {errors.institution_name.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-acc-num">Masked Number</Label>
              <Input id="edit-acc-num" {...register("account_number_masked")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Accent Color</Label>
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setValue("color", color)}
                  className={`h-7 w-7 rounded-full transition-transform ${
                    selectedColor === color
                      ? "ring-2 ring-primary ring-offset-2 scale-110"
                      : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
          </div>

          {/* Archive Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label className="text-sm">Archive Account</Label>
              <p className="text-xs text-muted-foreground">
                Hide from active selection while preserving transaction history.
              </p>
            </div>
            <Switch
              checked={isArchived}
              onCheckedChange={(val) => setValue("is_archived", val)}
            />
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
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


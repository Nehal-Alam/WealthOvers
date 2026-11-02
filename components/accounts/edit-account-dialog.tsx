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
  "#244B3C", // Leftovers Forest Green
  "#8BA58C", // Leftovers Sage
  "#39805B", // Leftovers Success Green
  "#C77A65", // Leftovers Terracotta
  "#C39148", // Leftovers Amber
  "#3B82F6", // Classic Blue
  "#6366F1", // Indigo
  "#8B5CF6", // Purple
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
      color: account?.color || "#244B3C",
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
      <DialogContent className="sm:max-w-[480px] bg-surface text-text-primary border-border p-5 rounded-2xl shadow-xl">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-bold tracking-tight text-text-primary">
            Edit Account
          </DialogTitle>
          <DialogDescription className="text-xs text-text-secondary">
            Modify account configuration or archive status.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-acc-name" className="text-xs font-medium text-text-secondary">
              Account Name
            </Label>
            <Input
              id="edit-acc-name"
              {...register("name")}
              className="h-9 text-xs bg-surface border-border text-text-primary"
            />
            {errors.name && (
              <p className="text-xs text-danger">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-acc-inst" className="text-xs font-medium text-text-secondary">
                Institution
              </Label>
              <Input
                id="edit-acc-inst"
                {...register("institution_name")}
                className="h-9 text-xs bg-surface border-border text-text-primary"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-acc-num" className="text-xs font-medium text-text-secondary">
                Masked Account No.
              </Label>
              <Input
                id="edit-acc-num"
                {...register("account_number_masked")}
                className="h-9 text-xs bg-surface border-border text-text-primary font-mono"
              />
            </div>
          </div>

          {/* Color Preset */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-text-secondary">Accent Color</Label>
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
          <div className="flex items-center justify-between rounded-xl border border-border p-3 bg-surface-secondary/40">
            <div className="space-y-0.5">
              <Label htmlFor="edit-archive-toggle" className="text-xs font-medium cursor-pointer text-text-primary">
                Archive Account
              </Label>
              <p className="text-[11px] text-text-secondary">
                Archived accounts are hidden from primary dashboards but retain complete transaction history.
              </p>
            </div>
            <Switch
              id="edit-archive-toggle"
              checked={isArchived}
              onCheckedChange={(val) => setValue("is_archived", val)}
            />
          </div>

          <DialogFooter className="pt-4 flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="border-border text-text-secondary hover:text-text-primary rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary-hover text-surface font-semibold rounded-xl shadow-xs transition-colors"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

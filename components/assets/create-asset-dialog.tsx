"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle, Loader2, Home } from "lucide-react";
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
import { createAssetSchema, CreateAssetInput } from "@/lib/validations/assets";
import { createAssetAction } from "@/app/(dashboard)/assets/actions";

interface CreateAssetDialogProps {
  trigger?: React.ReactNode;
}

export function CreateAssetDialog({ trigger }: CreateAssetDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateAssetInput>({
    resolver: zodResolver(createAssetSchema),
    defaultValues: {
      name: "",
      category: "Real Estate",
      purchase_price: "",
      current_valuation: "",
      purchase_date: "",
      notes: "",
    },
  });

  const onSubmit = async (data: CreateAssetInput) => {
    setIsSubmitting(true);
    try {
      const res = await createAssetAction(data);
      if (res.success) {
        toast.success(res.message || "Asset added");
        reset();
        setOpen(false);
      } else {
        toast.error(res.error || "Failed to add asset");
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
          <Button className="gap-2">
            <PlusCircle className="h-4 w-4" />
            <span>Add Asset</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Home className="h-4 w-4 text-primary" />
            <span>Add Fixed Asset</span>
          </DialogTitle>
          <DialogDescription>
            Record real estate, vehicles, jewelry, or tangible physical assets.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="asset-name">Asset Name</Label>
            <Input
              id="asset-name"
              placeholder="e.g. 3BHK Apartment, Honda City, Gold Sovereign"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select
              defaultValue="Real Estate"
              onValueChange={(val) => setValue("category", val)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Real Estate">Real Estate & Land</SelectItem>
                <SelectItem value="Vehicle">Vehicle / Automobile</SelectItem>
                <SelectItem value="Jewelry">Jewelry & Precious Metals</SelectItem>
                <SelectItem value="Electronics">Electronics & Hardware</SelectItem>
                <SelectItem value="Art & Collectible">Art & Collectible</SelectItem>
                <SelectItem value="Other">Other Fixed Asset</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="asset-cost">Purchase Price (INR)</Label>
              <Input
                id="asset-cost"
                type="number"
                step="0.01"
                placeholder="5000000.00"
                {...register("purchase_price")}
              />
              {errors.purchase_price && (
                <p className="text-xs text-destructive">
                  {errors.purchase_price.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="asset-val">Current Valuation</Label>
              <Input
                id="asset-val"
                type="number"
                step="0.01"
                placeholder="6200000.00"
                {...register("current_valuation")}
              />
              {errors.current_valuation && (
                <p className="text-xs text-destructive">
                  {errors.current_valuation.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="asset-date">Purchase Date (Optional)</Label>
            <Input id="asset-date" type="date" {...register("purchase_date")} />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Asset
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle, Loader2, Coins } from "lucide-react";
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
  createInvestmentSchema,
  CreateInvestmentInput,
  investmentTypeValues,
} from "@/lib/validations/investments";
import { createInvestmentAction } from "@/app/(dashboard)/investments/actions";
import { Tables } from "@/types/database";

interface CreateInvestmentDialogProps {
  accounts: Tables<"accounts">[];
  defaultAssetType?: (typeof investmentTypeValues)[number];
  trigger?: React.ReactNode;
}

export function CreateInvestmentDialog({
  accounts,
  defaultAssetType = "stock_in",
  trigger,
}: CreateInvestmentDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateInvestmentInput>({
    resolver: zodResolver(createInvestmentSchema),
    defaultValues: {
      account_id: accounts[0]?.id || null,
      name: "",
      symbol: "",
      asset_type: defaultAssetType,
      broker_name: "Zerodha / Groww",
      currency: defaultAssetType === "stock_us" ? "USD" : "INR",
      total_quantity: "1",
      average_buy_price: "",
      current_nav_or_price: "",
      notes: "",
    },
  });

  const selectedAssetType = watch("asset_type");
  const selectedCurrency = watch("currency");

  React.useEffect(() => {
    if (selectedAssetType === "stock_us") {
      setValue("currency", "USD");
    } else if (selectedCurrency === "USD") {
      setValue("currency", "INR");
    }
  }, [selectedAssetType, selectedCurrency, setValue]);

  const onSubmit = async (data: CreateInvestmentInput) => {
    setIsSubmitting(true);
    try {
      const res = await createInvestmentAction(data);
      if (res.success) {
        toast.success(res.message || "Asset added to portfolio");
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            <span>Add Investment Holding</span>
          </DialogTitle>
          <DialogDescription>
            Record stocks, mutual funds, gold, fixed deposits, or retirement assets.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Asset Type */}
          <div className="space-y-1.5">
            <Label>Asset Class</Label>
            <Select
              value={selectedAssetType}
              onValueChange={(val: any) => setValue("asset_type", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select asset class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stock_in">Indian Stock (NSE / BSE)</SelectItem>
                <SelectItem value="stock_us">US Stock (NYSE / NASDAQ)</SelectItem>
                <SelectItem value="mutual_fund">Mutual Fund (SIP / Lumpsum)</SelectItem>
                <SelectItem value="etf">Exchange Traded Fund (ETF)</SelectItem>
                <SelectItem value="sovereign_gold_bond">Sovereign Gold Bond (SGB)</SelectItem>
                <SelectItem value="gold_physical">Physical Gold</SelectItem>
                <SelectItem value="gold_digital">Digital Gold</SelectItem>
                <SelectItem value="fixed_deposit">Fixed Deposit (FD)</SelectItem>
                <SelectItem value="recurring_deposit">Recurring Deposit (RD)</SelectItem>
                <SelectItem value="ppf">Public Provident Fund (PPF)</SelectItem>
                <SelectItem value="epf">Employees&apos; Provident Fund (EPF)</SelectItem>
                <SelectItem value="nps">National Pension System (NPS)</SelectItem>
                <SelectItem value="crypto">Cryptocurrency</SelectItem>
                <SelectItem value="other">Other Asset</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Name & Symbol */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="inv-name">Asset Name</Label>
              <Input
                id="inv-name"
                placeholder="e.g. Reliance, Apple, Parag Parikh"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inv-symbol">Ticker / Symbol</Label>
              <Input
                id="inv-symbol"
                placeholder="e.g. RELIANCE, AAPL, INF209K01157"
                {...register("symbol")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Broker / Platform */}
            <div className="space-y-1.5">
              <Label htmlFor="inv-broker">Broker / Platform</Label>
              <Input
                id="inv-broker"
                placeholder="e.g. Zerodha, Groww, IndMoney"
                {...register("broker_name")}
              />
            </div>

            {/* Currency */}
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select
                value={selectedCurrency}
                onValueChange={(val) => setValue("currency", val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">INR (₹)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quantity, Buy Price, Current Price */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="space-y-1.5">
              <Label htmlFor="inv-qty">Units / Qty</Label>
              <Input
                id="inv-qty"
                type="number"
                step="0.000001"
                placeholder="10"
                {...register("total_quantity")}
              />
              {errors.total_quantity && (
                <p className="text-xs text-destructive">
                  {errors.total_quantity.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inv-buy">Avg Buy Price</Label>
              <Input
                id="inv-buy"
                type="number"
                step="0.01"
                placeholder="100.00"
                {...register("average_buy_price")}
              />
              {errors.average_buy_price && (
                <p className="text-xs text-destructive">
                  {errors.average_buy_price.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inv-cur">Current Price</Label>
              <Input
                id="inv-cur"
                type="number"
                step="0.01"
                placeholder="120.00"
                {...register("current_nav_or_price")}
              />
              {errors.current_nav_or_price && (
                <p className="text-xs text-destructive">
                  {errors.current_nav_or_price.message}
                </p>
              )}
            </div>
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
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Asset
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import React from "react";
import Link from "next/link";
import { Wallet, ShieldCheck, ArrowUpRight, TrendingUp } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full flex flex-col lg:grid lg:grid-cols-2 bg-background">
      {/* Left Branding Showcase (Visible on Large Screens) */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-muted/40 border-r relative overflow-hidden">
        {/* Subtle Decorative Gradient Orb */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="flex items-center space-x-3 z-10">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-md shadow-primary/25">
            <Wallet className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">
            WealthOvers
          </span>
        </div>

        {/* Hero Narrative */}
        <div className="space-y-6 max-w-lg z-10 my-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary text-xs font-medium">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Next-Generation Wealth Management</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground leading-[1.15]">
            Master your money. <br />
            Accelerate your financial freedom.
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            Multi-account banking, precision budgeting, automated statement imports,
            investment tracking with real-time XIRR analytics, and Android transaction synchronization.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="p-4 rounded-xl border bg-card/60 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-1">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Zero-Trust Privacy
              </div>
              <p className="text-xs text-muted-foreground">
                Row-level database security. Your financial records are isolated exclusively to you.
              </p>
            </div>
            <div className="p-4 rounded-xl border bg-card/60 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-1">
                <ArrowUpRight className="h-4 w-4 text-primary" />
                High-Precision Math
              </div>
              <p className="text-xs text-muted-foreground">
                Arbitrary-precision decimal arithmetic. Zero floating-point rounding errors.
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground z-10 border-t pt-6">
          <span>&copy; {new Date().getFullYear()} WealthOvers Inc.</span>
          <span>Bank-Grade Security</span>
        </div>
      </div>

      {/* Right Content Form Area */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-12">
        {/* Top bar with Mobile Logo & Theme Toggle */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-2 lg:hidden">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
              <Wallet className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">
              WealthOvers
            </span>
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>

        {/* Dynamic Auth Form Container */}
        <div className="w-full max-w-md mx-auto my-auto py-8">
          {children}
        </div>

        {/* Mobile Footer */}
        <div className="text-center text-xs text-muted-foreground">
          Protected by Supabase Auth with Row Level Security
        </div>
      </div>
    </div>
  );
}


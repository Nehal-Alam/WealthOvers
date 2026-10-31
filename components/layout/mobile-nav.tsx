"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  Landmark,
  Coins,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mobileNavItems = [
  { title: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { title: "Transactions", href: "/transactions", icon: Receipt },
  { title: "Accounts", href: "/accounts", icon: Landmark },
  { title: "Investments", href: "/investments", icon: Coins },
  { title: "Settings", href: "/settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 h-16 border-t bg-card/90 backdrop-blur-lg flex items-center justify-around px-2 pb-safe">
      {mobileNavItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center w-14 py-1 gap-1 text-[10px] font-medium transition-colors rounded-lg",
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon
              className={cn(
                "h-5 w-5 transition-transform",
                isActive && "scale-110 text-primary"
              )}
            />
            <span className="truncate">{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}


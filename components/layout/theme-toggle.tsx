"use client";

import * as React from "react";
import { Moon, Sun, Laptop, Check } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateThemePreferenceAction } from "@/app/(dashboard)/settings/actions";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleSelect = (mode: "light" | "dark" | "system") => {
    setTheme(mode);
    // Persist to user settings non-blockingly
    updateThemePreferenceAction(mode).catch(() => {
      // Ignore background persistence errors on unauthenticated screens
    });
  };

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-lg text-muted-foreground"
        aria-label="Theme selector"
        disabled
      >
        <span className="sr-only">Toggle theme</span>
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
          aria-label={`Current theme is ${theme}. Change theme`}
          title={`Change appearance (${theme})`}
        >
          {isDark ? (
            <Moon className="h-4 w-4 transition-transform text-primary" />
          ) : (
            <Sun className="h-4 w-4 transition-transform text-primary" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem
          onClick={() => handleSelect("light")}
          className="flex items-center justify-between text-xs cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Sun className="h-3.5 w-3.5 text-primary" />
            Warm Light
          </span>
          {theme === "light" && <Check className="h-3 w-3 text-primary" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleSelect("dark")}
          className="flex items-center justify-between text-xs cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Moon className="h-3.5 w-3.5 text-primary" />
            Pine Dark
          </span>
          {theme === "dark" && <Check className="h-3 w-3 text-primary" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleSelect("system")}
          className="flex items-center justify-between text-xs cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Laptop className="h-3.5 w-3.5 text-primary" />
            System Auto
          </span>
          {theme === "system" && <Check className="h-3 w-3 text-primary" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

"use client";

import React, { useTransition } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Laptop, Check } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { updateThemePreferenceAction } from "@/app/(dashboard)/settings/actions";

interface ThemePreferenceCardProps {
  initialTheme?: string;
}

export function ThemePreferenceCard({
  initialTheme = "system",
}: ThemePreferenceCardProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [isPending, startTransition] = useTransition();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const activeTheme = mounted ? theme || initialTheme : initialTheme;

  const handleSelectTheme = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    startTransition(async () => {
      const res = await updateThemePreferenceAction(newTheme);
      if (res.success) {
        toast.success(
          `Theme set to ${newTheme === "system" ? "system default" : newTheme} mode`
        );
      } else {
        toast.error(res.error || "Failed to persist theme preference");
      }
    });
  };

  const options = [
    {
      id: "light",
      title: "Warm Light",
      subtitle: "Warm ivory canvas (#F7F7F0) with deep forest green accents",
      icon: Sun,
      previewBg: "#F7F7F0",
      previewSurface: "#FFFFFF",
      previewAccent: "#244B3C",
      previewBorder: "#E4E7DE",
    },
    {
      id: "dark",
      title: "Pine Dark",
      subtitle: "Deep pine night (#151C18) with pale sage green surfaces",
      icon: Moon,
      previewBg: "#151C18",
      previewSurface: "#1D2821",
      previewAccent: "#9BB99D",
      previewBorder: "#344439",
    },
    {
      id: "system",
      title: "System Match",
      subtitle: "Automatically synchronizes with your OS appearance preference",
      icon: Laptop,
      previewBg: "linear-gradient(135deg, #F7F7F0 50%, #151C18 50%)",
      previewSurface: "#FFFFFF",
      previewAccent: "#8BA58C",
      previewBorder: "#D1D8C8",
    },
  ];

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Sun className="h-4 w-4 text-primary" />
          Appearance & Theme
        </CardTitle>
        <CardDescription className="text-xs">
          Select your visual appearance preference, inspired by Leftovers warm minimalist palette
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          role="radiogroup"
          aria-label="Theme selection"
          className="grid grid-cols-1 md:grid-cols-3 gap-3"
        >
          {options.map((opt) => {
            const isSelected = activeTheme === opt.id;
            const Icon = opt.icon;

            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={isPending}
                onClick={() => handleSelectTheme(opt.id as "light" | "dark" | "system")}
                className={`relative flex flex-col items-start p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                    : "border-border hover:border-primary/40 bg-card hover:bg-muted/40"
                }`}
              >
                {/* Visual Swatch Preview */}
                <div
                  className="w-full h-12 rounded-lg border mb-3 p-1.5 flex flex-col justify-between"
                  style={{
                    background: opt.previewBg,
                    borderColor: opt.previewBorder,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="h-2 w-8 rounded-full"
                      style={{ background: opt.previewAccent }}
                    />
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ background: opt.previewAccent }}
                    />
                  </div>
                  <div
                    className="h-3.5 w-full rounded flex items-center px-1"
                    style={{
                      background: opt.previewSurface,
                      borderColor: opt.previewBorder,
                    }}
                  >
                    <div
                      className="h-1.5 w-12 rounded-full opacity-60"
                      style={{ background: opt.previewAccent }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm text-foreground">
                      {opt.title}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                  {opt.subtitle}
                </p>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}


"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";

export function PrivacyMaskToggle() {
  const { isPrivacyMode, togglePrivacyMode } = useUIStore();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        togglePrivacyMode();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePrivacyMode]);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg">
        <span className="sr-only">Toggle privacy mode</span>
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
      onClick={togglePrivacyMode}
      title={
        isPrivacyMode
          ? "Disable Privacy Mode (Show balances - ⌘⇧P)"
          : "Enable Privacy Mode (Mask balances - ⌘⇧P)"
      }
    >
      {isPrivacyMode ? (
        <EyeOff className="h-4 w-4 text-amber-500" />
      ) : (
        <Eye className="h-4 w-4" />
      )}
      <span className="sr-only">Toggle privacy mode</span>
    </Button>
  );
}

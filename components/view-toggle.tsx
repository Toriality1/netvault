"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Grid3x3, List } from "lucide-react";

interface ViewToggleProps {
  currentView: "grid" | "list";
}

export function ViewToggle({ currentView }: ViewToggleProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setView = (view: "grid" | "list") => {
    const params = new URLSearchParams(searchParams.toString());
    if (view === "grid") {
      params.delete("view");
    } else {
      params.set("view", view);
    }
    const queryString = params.toString();
    router.push(queryString ? `?${queryString}` : window.location.pathname);
  };

  return (
    <div className="flex items-center gap-1 rounded-lg border p-1">
      <Button
        variant={currentView === "grid" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => setView("grid")}
        className="h-8 w-8 p-0"
      >
        <Grid3x3 className="h-4 w-4" />
        <span className="sr-only">Grid view</span>
      </Button>
      <Button
        variant={currentView === "list" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => setView("list")}
        className="h-8 w-8 p-0"
      >
        <List className="h-4 w-4" />
        <span className="sr-only">List view</span>
      </Button>
    </div>
  );
}

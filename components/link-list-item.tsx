"use client";

import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";

interface LinkListItemProps {
  link: {
    id: string;
    url: string;
    title: string | null;
    description: string | null;
    icon: string | null;
  };
  isOwner: boolean;
}

export function LinkListItem({ link, isOwner }: LinkListItemProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm("Are you sure you want to delete this link?")) return;

    setIsDeleting(true);
    const supabase = createClient();

    try {
      const { error } = await supabase.from("links").delete().eq("id", link.id);
      if (error) throw error;
      router.refresh();
    } catch (error) {
      console.error("Error deleting link:", error);
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="group flex items-center gap-3 rounded-lg border bg-card px-4 py-3 transition-colors hover:bg-accent"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        {link.icon ? (
          <Image
            src={link.icon}
            alt=""
            width={20}
            height={20}
            className="h-5 w-5 flex-shrink-0 rounded"
            unoptimized
          />
        ) : (
          <div className="h-5 w-5 flex-shrink-0 rounded bg-muted" />
        )}
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {isHovered ? link.url : link.title || link.url}
        </span>
      </a>

      {isOwner && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          disabled={isDeleting}
          className="opacity-0 transition-opacity group-hover:opacity-100"
        >
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      )}
    </div>
  );
}

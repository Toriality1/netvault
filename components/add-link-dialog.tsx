"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface AddLinkDialogProps {
  folderId: string;
}

export function AddLinkDialog({ folderId }: AddLinkDialogProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleAdd = async () => {
    if (!url.trim()) return;

    setIsLoading(true);
    setError(null);

    console.log("[AddLinkDialog] Starting to add link", {
      timestamp: new Date().toISOString(),
      folderId,
      originalUrl: url.trim(),
    });

    const supabase = createClient();

    try {
      // Fetch metadata from API
      console.log("[AddLinkDialog] Fetching metadata from API");
      const metadataStart = Date.now();

      const response = await fetch("/api/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const metadataDuration = Date.now() - metadataStart;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[AddLinkDialog] Metadata fetch failed", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          duration: metadataDuration,
        });
        throw new Error(errorData.error || "Failed to fetch link metadata");
      }

      const metadata = await response.json();

      console.log("[AddLinkDialog] Metadata received", {
        hasTitle: !!metadata.title,
        hasDescription: !!metadata.description,
        hasIcon: !!metadata.icon,
        normalizedUrl: metadata.normalizedUrl,
        duration: metadataDuration,
      });

      // Use normalized URL from the API response
      const finalUrl = metadata.normalizedUrl || url.trim();

      // Insert link with metadata
      console.log("[AddLinkDialog] Inserting link into database");
      const insertStart = Date.now();

      const { data, error: dbError } = await supabase
        .from("links")
        .insert({
          folder_id: folderId,
          url: finalUrl,
          title: metadata.title || finalUrl,
          description: metadata.description || null,
          icon: metadata.icon || null,
        })
        .select();

      const insertDuration = Date.now() - insertStart;

      if (dbError) {
        console.error("[AddLinkDialog] Database insert failed", {
          error: dbError,
          folderId,
          url: finalUrl,
          duration: insertDuration,
        });
        throw dbError;
      }

      console.log("[AddLinkDialog] Link added successfully", {
        linkId: data?.[0]?.id,
        folderId,
        url: finalUrl,
        insertDuration,
      });

      setOpen(false);
      setUrl("");
      router.refresh();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to add link";

      console.error("[AddLinkDialog] Error adding link", {
        error:
          error instanceof Error
            ? {
                message: error.message,
                stack: error.stack,
                name: error.name,
              }
            : String(error),
        folderId,
        url: url.trim(),
      });

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
        if (!newOpen) {
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Link
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Link</DialogTitle>
          <DialogDescription>
            Enter a URL to add to this folder. We&apos;ll automatically fetch
            the metadata.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://example.com or just example"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isLoading) handleAdd();
              }}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!url.trim() || isLoading}>
            {isLoading ? "Adding..." : "Add Link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

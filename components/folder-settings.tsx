"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Settings, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface FolderSettingsProps {
  folder: {
    id: string
    name: string
    is_published: boolean
  }
}

export function FolderSettings({ folder }: FolderSettingsProps) {
  const [open, setOpen] = useState(false)
  const [isPublished, setIsPublished] = useState(folder.is_published)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleTogglePublish = async (checked: boolean) => {
    setIsUpdating(true)
    const supabase = createClient()

    try {
      const { error } = await supabase.from("folders").update({ is_published: checked }).eq("id", folder.id)

      if (error) throw error

      setIsPublished(checked)
      router.refresh()
    } catch (error) {
      console.error("Error updating folder:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${folder.name}"? This will also delete all links in this folder.`))
      return

    setIsDeleting(true)
    const supabase = createClient()

    try {
      const { error } = await supabase.from("folders").delete().eq("id", folder.id)

      if (error) throw error

      router.push("/dashboard")
      router.refresh()
    } catch (error) {
      console.error("Error deleting folder:", error)
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Folder Settings</DialogTitle>
          <DialogDescription>Manage settings for {folder.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="publish">Publish to Community</Label>
              <p className="text-sm text-muted-foreground">Make this folder visible to everyone</p>
            </div>
            <Switch id="publish" checked={isPublished} onCheckedChange={handleTogglePublish} disabled={isUpdating} />
          </div>
          <div className="border-t pt-6">
            <div className="space-y-2">
              <Label className="text-destructive">Danger Zone</Label>
              <p className="text-sm text-muted-foreground">
                Deleting this folder will permanently remove it and all its links.
              </p>
              <Button variant="destructive" onClick={handleDelete} disabled={isDeleting} className="w-full">
                <Trash2 className="mr-2 h-4 w-4" />
                {isDeleting ? "Deleting..." : "Delete Folder"}
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

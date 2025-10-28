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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

const EMOJI_OPTIONS = ["📁", "📚", "💼", "🎨", "🎮", "🎵", "🎬", "🍔", "✈️", "💡", "🔧", "🏠"]
const COLOR_OPTIONS = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#6366f1",
]

export function CreateFolderDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [emoji, setEmoji] = useState("📁")
  const [color, setColor] = useState("#3b82f6")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleCreate = async () => {
    if (!name.trim()) return

    setIsLoading(true)
    const supabase = createClient()

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { error } = await supabase.from("folders").insert({
        user_id: user.id,
        name: name.trim(),
        emoji,
        color,
        is_published: false,
      })

      if (error) throw error

      setOpen(false)
      setName("")
      setEmoji("📁")
      setColor("#3b82f6")
      router.refresh()
    } catch (error) {
      console.error("Error creating folder:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Folder
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
          <DialogDescription>Add a new folder to organize your bookmarks</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Folder Name</Label>
            <Input
              id="name"
              placeholder="My Awesome Links"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate()
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Emoji</Label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((emojiOption) => (
                <button
                  key={emojiOption}
                  type="button"
                  onClick={() => setEmoji(emojiOption)}
                  className={`rounded-md border-2 p-2 text-2xl transition-colors ${
                    emoji === emojiOption ? "border-primary" : "border-transparent hover:border-muted-foreground/20"
                  }`}
                >
                  {emojiOption}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((colorOption) => (
                <button
                  key={colorOption}
                  type="button"
                  onClick={() => setColor(colorOption)}
                  className={`h-10 w-10 rounded-md border-2 transition-all ${
                    color === colorOption ? "scale-110 border-foreground" : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: colorOption }}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || isLoading}>
            {isLoading ? "Creating..." : "Create Folder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

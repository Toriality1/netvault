"use client"

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Copy, ExternalLink } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState } from "react"

interface FolderCardProps {
  folder: {
    id: string
    name: string
    emoji: string
    color: string
    is_published: boolean
  }
  linkCount: number
  showClone?: boolean
}

export function FolderCard({ folder, linkCount, showClone = false }: FolderCardProps) {
  const router = useRouter()
  const [isCloning, setIsCloning] = useState(false)

  const handleClone = async () => {
    setIsCloning(true)
    const supabase = createClient()

    try {
      // Check if user is logged in
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      // Clone the folder
      const { data: newFolder, error: folderError } = await supabase
        .from("folders")
        .insert({
          user_id: user.id,
          name: `${folder.name} (Copy)`,
          emoji: folder.emoji,
          color: folder.color,
          is_published: false,
        })
        .select()
        .single()

      if (folderError) throw folderError

      // Clone the links
      const { data: links } = await supabase.from("links").select("*").eq("folder_id", folder.id)

      if (links && links.length > 0) {
        const newLinks = links.map((link) => ({
          folder_id: newFolder.id,
          url: link.url,
          title: link.title,
          description: link.description,
          icon: link.icon,
        }))

        await supabase.from("links").insert(newLinks)
      }

      router.push("/dashboard")
    } catch (error) {
      console.error("Error cloning folder:", error)
    } finally {
      setIsCloning(false)
    }
  }

  return (
    <Card className="flex flex-col transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="text-3xl" style={{ color: folder.color }}>
              {folder.emoji}
            </div>
            <h3 className="text-balance font-semibold leading-tight">{folder.name}</h3>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-3">
        <p className="text-sm text-muted-foreground">
          {linkCount} {linkCount === 1 ? "link" : "links"}
        </p>
      </CardContent>
      <CardFooter className="flex gap-2 pt-3">
        <Button variant="outline" size="sm" className="flex-1 bg-transparent" asChild>
          <Link href={`/folder/${folder.id}`}>
            <ExternalLink className="mr-2 h-4 w-4" />
            View
          </Link>
        </Button>
        {showClone && (
          <Button variant="secondary" size="sm" onClick={handleClone} disabled={isCloning}>
            <Copy className="mr-2 h-4 w-4" />
            {isCloning ? "Cloning..." : "Clone"}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

"use client"

import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ExternalLink, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import Image from "next/image"

interface LinkCardProps {
  link: {
    id: string
    url: string
    title: string | null
    description: string | null
    icon: string | null
  }
  isOwner: boolean
}

export function LinkCard({ link, isOwner }: LinkCardProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this link?")) return

    setIsDeleting(true)
    const supabase = createClient()

    try {
      const { error } = await supabase.from("links").delete().eq("id", link.id)

      if (error) throw error

      router.refresh()
    } catch (error) {
      console.error("Error deleting link:", error)
      setIsDeleting(false)
    }
  }

  return (
    <Card className="flex flex-col transition-shadow hover:shadow-md">
      <CardContent className="flex-1 pt-6">
        <div className="mb-3 flex items-start gap-3">
          {link.icon ? (
            <Image
              src={link.icon || "/placeholder.svg"}
              alt=""
              width={24}
              height={24}
              className="mt-1 h-6 w-6 flex-shrink-0 rounded"
              unoptimized
            />
          ) : (
            <div className="mt-1 h-6 w-6 flex-shrink-0 rounded bg-muted" />
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-balance font-semibold leading-tight">{link.title || link.url}</h3>
            {link.description && (
              <p className="mt-1 text-pretty text-sm text-muted-foreground line-clamp-2">{link.description}</p>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground truncate">{link.url}</p>
      </CardContent>
      <CardFooter className="flex gap-2 pt-3">
        <Button variant="outline" size="sm" className="flex-1 bg-transparent" asChild>
          <a href={link.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            Visit
          </a>
        </Button>
        {isOwner && (
          <Button variant="ghost" size="sm" onClick={handleDelete} disabled={isDeleting}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

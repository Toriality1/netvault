import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AddLinkDialog } from "@/components/add-link-dialog"
import { LinkCard } from "@/components/link-card"
import { LinkListItem } from "@/components/link-list-item"
import { FolderSettings } from "@/components/folder-settings"
import { ViewToggle } from "@/components/view-toggle"

export default async function FolderPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ view?: string }>
}) {
  const { id } = await params
  const { view } = await searchParams
  const viewMode = view === 'list' ? 'list' : 'grid'

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch folder details
  const { data: folder, error: folderError } = await supabase
    .from("folders")
    .select("*")
    .eq("id", id)
    .single()

  if (folderError || !folder) {
    notFound()
  }

  // Check if user owns this folder or if it's published
  const isOwner = user?.id === folder.user_id
  if (!isOwner && !folder.is_published) {
    redirect("/")
  }

  // Fetch links in this folder
  const { data: links } = await supabase
    .from("links")
    .select("*")
    .eq("folder_id", id)
    .order("created_at", { ascending: false })

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href={isOwner ? "/dashboard" : "/"}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <div className="text-2xl" style={{ color: folder.color }}>
                {folder.emoji}
              </div>
              <h1 className="text-xl font-semibold">{folder.name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ViewToggle currentView={viewMode} />
            {isOwner && (
              <>
                <AddLinkDialog folderId={folder.id} />
                <FolderSettings folder={folder} />
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {links && links.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {links.map((link) => (
                <LinkCard key={link.id} link={link} isOwner={isOwner} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {links.map((link) => (
                <LinkListItem key={link.id} link={link} isOwner={isOwner} />
              ))}
            </div>
          )
        ) : (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <div className="mx-auto mb-4 text-5xl">🔗</div>
            <h3 className="mb-2 text-lg font-semibold">No links yet</h3>
            <p className="mb-6 text-sm text-muted-foreground">
              {isOwner ? "Add your first link to this folder" : "This folder is empty"}
            </p>
            {isOwner && <AddLinkDialog folderId={folder.id} />}
          </div>
        )}
      </main>
    </div>
  )
}

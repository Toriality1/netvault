import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { FolderCard } from "@/components/folder-card"
import { CreateFolderDialog } from "@/components/create-folder-dialog"
import { SignOutButton } from "@/components/sign-out-button"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Fetch user's folders with link counts
  const { data: folders } = await supabase
    .from("folders")
    .select(
      `
      *,
      links (count)
    `,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="text-2xl">🔐</div>
              <h1 className="text-xl font-semibold">Vault</h1>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">My Folders</h2>
            <p className="mt-1 text-muted-foreground">Organize your bookmarks into collections</p>
          </div>
          <CreateFolderDialog />
        </div>

        {folders && folders.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {folders.map((folder) => (
              <FolderCard key={folder.id} folder={folder} linkCount={folder.links?.[0]?.count || 0} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <div className="mx-auto mb-4 text-5xl">📁</div>
            <h3 className="mb-2 text-lg font-semibold">No folders yet</h3>
            <p className="mb-6 text-sm text-muted-foreground">Create your first folder to start organizing bookmarks</p>
            <CreateFolderDialog />
          </div>
        )}
      </main>
    </div>
  )
}

import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { FolderCard } from "@/components/folder-card"

export default async function HomePage() {
  const supabase = await createClient()

  // Fetch published folders from the community
  const { data: publishedFolders } = await supabase
    .from("folders")
    .select(
      `
      *,
      links (count)
    `,
    )
    .eq("is_published", true)
    .order("created_at", { ascending: false })

  // Check if user is logged in
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="text-2xl">🔐</div>
            <h1 className="text-xl font-semibold">NetVault</h1>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <Button asChild>
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/auth/login">Login</Link>
                </Button>
                <Button asChild>
                  <Link href="/auth/sign-up">Sign up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="border-b bg-muted/30 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-balance text-4xl font-bold tracking-tight md:text-5xl">
            Organize and share your bookmarks
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-lg text-muted-foreground">
            Create beautiful collections of links with emojis and colors. Keep them private or share them with the
            world.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/auth/sign-up">Get Started</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#explore">Explore Folders</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Published Folders Section */}
      <section id="explore" className="py-16">
        <div className="container mx-auto px-4">
          <h3 className="mb-8 text-2xl font-semibold">Explore Community Folders</h3>
          {publishedFolders && publishedFolders.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {publishedFolders.map((folder) => (
                <FolderCard key={folder.id} folder={folder} linkCount={folder.links?.[0]?.count || 0} showClone />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <p className="text-muted-foreground">No published folders yet. Be the first to share your collection!</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

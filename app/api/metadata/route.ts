import { type NextRequest, NextResponse } from "next/server"

// Normalize and validate URL
function normalizeUrl(input: string): string {
  let url = input.trim()

  // Add https:// if no protocol specified
  if (!url.match(/^https?:\/\//i)) {
    url = `https://${url}`
  }

  // Check if URL has a TLD, if not and it looks like a domain, add .com
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname

    // If hostname has no dots (no TLD) and looks like a simple domain name
    if (!hostname.includes('.') && hostname.length > 0) {
      parsed.hostname = `${hostname}.com`
      url = parsed.toString()
    }
  } catch {
    // If parsing fails, try adding .com to the whole thing
    if (!url.includes('.')) {
      const domain = url.replace(/^https?:\/\//, '')
      url = `https://${domain}.com`
    }
  }

  return url
}

// Generate realistic browser headers
function getBrowserHeaders(url: string): HeadersInit {
  return {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "DNT": "1",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Cache-Control": "max-age=0",
    "Referer": new URL(url).origin,
  }
}

// Fetch with retry logic
async function fetchWithRetry(url: string, maxRetries = 2): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Metadata API] Fetch attempt ${attempt + 1}/${maxRetries + 1}`, { url })

      const response = await fetch(url, {
        headers: getBrowserHeaders(url),
        signal: AbortSignal.timeout(15000), // 15 second timeout
        redirect: "follow",
      })

      // If we get a response, return it (even if not ok, let caller handle)
      return response

    } catch (error) {
      lastError = error as Error
      console.warn(`[Metadata API] Fetch attempt ${attempt + 1} failed`, {
        url,
        error: error instanceof Error ? error.message : String(error)
      })

      // If not the last attempt, wait before retrying
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))) // Exponential backoff
      }
    }
  }

  throw lastError || new Error("Failed to fetch after retries")
}

// Generate fallback metadata when fetch fails
function generateFallbackMetadata(url: string, validUrl: URL) {
  const domain = validUrl.hostname.replace(/^www\./, '')
  const title = domain.split('.')[0]
    .split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')

  return {
    title: title || url,
    description: null,
    icon: `${validUrl.origin}/favicon.ico`,
    isFallback: true
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let normalizedUrl = ""

  try {
    const body = await request.json()
    const { url: rawUrl } = body

    console.log("[Metadata API] Request received", {
      timestamp: new Date().toISOString(),
      rawUrl,
      userAgent: request.headers.get("user-agent")
    })

    if (!rawUrl) {
      console.warn("[Metadata API] Missing URL in request body")
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    // Normalize URL
    normalizedUrl = normalizeUrl(rawUrl)
    console.log("[Metadata API] URL normalized", {
      original: rawUrl,
      normalized: normalizedUrl
    })

    // Validate URL format
    let validUrl: URL
    try {
      validUrl = new URL(normalizedUrl)
    } catch (error) {
      console.error("[Metadata API] Invalid URL format", {
        url: normalizedUrl,
        error: error instanceof Error ? error.message : String(error)
      })
      return NextResponse.json(
        { error: "Invalid URL format", normalizedUrl },
        { status: 400 }
      )
    }

    // Fetch the page HTML with retry logic
    console.log("[Metadata API] Fetching page", { url: normalizedUrl })
    const fetchStart = Date.now()

    let response: Response
    let useFallback = false

    try {
      response = await fetchWithRetry(normalizedUrl)

      const fetchDuration = Date.now() - fetchStart

      // Handle 403 and other blocking responses
      if (response.status === 403 || response.status === 429) {
        console.warn("[Metadata API] Site blocking request, using fallback", {
          url: normalizedUrl,
          status: response.status,
          statusText: response.statusText,
          duration: fetchDuration
        })
        useFallback = true
      } else if (!response.ok) {
        console.error("[Metadata API] Failed to fetch URL", {
          url: normalizedUrl,
          status: response.status,
          statusText: response.statusText,
          duration: fetchDuration
        })
        useFallback = true
      }

      if (!useFallback) {
        console.log("[Metadata API] Page fetched successfully", {
          url: normalizedUrl,
          status: response.status,
          contentType: response.headers.get("content-type"),
          duration: fetchDuration
        })
      }

    } catch (error) {
      const fetchDuration = Date.now() - fetchStart
      console.warn("[Metadata API] Fetch failed completely, using fallback", {
        url: normalizedUrl,
        error: error instanceof Error ? error.message : String(error),
        duration: fetchDuration
      })
      useFallback = true
    }

    let metadata

    if (useFallback) {
      // Use fallback metadata
      metadata = generateFallbackMetadata(normalizedUrl, validUrl)
      console.log("[Metadata API] Using fallback metadata", {
        url: normalizedUrl,
        metadata
      })
    } else {
      // Extract metadata from HTML
      const html = await response!.text()
      const htmlSize = html.length

      metadata = {
        title: extractMetaTag(html, "og:title") ||
               extractMetaTag(html, "twitter:title") ||
               extractTitle(html) ||
               normalizedUrl,
        description:
          extractMetaTag(html, "og:description") ||
          extractMetaTag(html, "twitter:description") ||
          extractMetaTag(html, "description") ||
          null,
        icon: extractIcon(html, validUrl) || null,
        isFallback: false
      }

      console.log("[Metadata API] Metadata extracted successfully", {
        url: normalizedUrl,
        hasTitle: !!metadata.title,
        hasDescription: !!metadata.description,
        hasIcon: !!metadata.icon,
        htmlSize
      })
    }

    const totalDuration = Date.now() - startTime

    console.log("[Metadata API] Request completed", {
      url: normalizedUrl,
      totalDuration,
      usedFallback: metadata.isFallback
    })

    return NextResponse.json({
      ...metadata,
      normalizedUrl // Return normalized URL so frontend can use it
    })

  } catch (error) {
    const totalDuration = Date.now() - startTime

    console.error("[Metadata API] Unexpected error", {
      url: normalizedUrl,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : String(error),
      duration: totalDuration
    })

    return NextResponse.json(
      { error: "Failed to fetch metadata" },
      { status: 500 }
    )
  }
}

function extractMetaTag(html: string, property: string): string | null {
  // Try Open Graph and Twitter Card meta tags
  const ogRegex = new RegExp(`<meta[^>]*property=["']og:${property}["'][^>]*content=["']([^"']*)["']`, "i")
  const twitterRegex = new RegExp(`<meta[^>]*name=["']twitter:${property}["'][^>]*content=["']([^"']*)["']`, "i")
  const nameRegex = new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']*)["']`, "i")

  // Also try reversed attribute order
  const ogRegexReverse = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:${property}["']`, "i")
  const twitterRegexReverse = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']twitter:${property}["']`, "i")
  const nameRegexReverse = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${property}["']`, "i")

  const ogMatch = html.match(ogRegex) || html.match(ogRegexReverse)
  const twitterMatch = html.match(twitterRegex) || html.match(twitterRegexReverse)
  const nameMatch = html.match(nameRegex) || html.match(nameRegexReverse)

  return ogMatch?.[1] || twitterMatch?.[1] || nameMatch?.[1] || null
}

function extractTitle(html: string): string | null {
  const titleRegex = /<title[^>]*>([^<]*)<\/title>/i
  const match = html.match(titleRegex)
  return match?.[1]?.trim() || null
}

function extractIcon(html: string, baseUrl: URL): string | null {
  // Try to find favicon in various formats
  const iconRegex = /<link[^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*href=["']([^"']*)["'][^>]*>/i
  const iconRegexReverse = /<link[^>]*href=["']([^"']*)["'][^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["']/i

  const match = html.match(iconRegex) || html.match(iconRegexReverse)
  let iconPath = match?.[1]

  if (!iconPath) {
    // Default to /favicon.ico
    iconPath = "/favicon.ico"
  }

  // Convert relative URLs to absolute
  try {
    const iconUrl = new URL(iconPath, baseUrl)
    return iconUrl.toString()
  } catch {
    return `${baseUrl.origin}/favicon.ico`
  }
}

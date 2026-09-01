# assets/

Drop image files here. The site works without them (it falls back gracefully),
but it looks best with the real photos in place.

| File            | Used on            | Recommended size            | Notes |
|-----------------|--------------------|-----------------------------|-------|
| `og-image.jpg`  | Link previews (WhatsApp, LinkedIn, etc.) | 1200 × 630 px, < 400 KB | Branded card with the wordmark + tagline. Referenced in every page's `<meta property="og:image">`. |
| `flora.jpg`     | About page — **optional** | 900 × 1125 px (4:5), < 300 KB | Add a real photo of Flora here and it will replace the "Flora" nameplate on the About page. To use it, put `<img src="assets/flora.jpg" alt="Flora">` back inside the `.portrait` block in `about.html`. Do **not** use an AI-generated portrait. |
| `logo.png`      | Optional — not currently used | height 80 px, transparent PNG | The nav uses a text lockup by default. Swap in an image only if you have a proper logo file. |

## Before going live

Search-and-replace the placeholder domain across the project:

```
https://florainkanalytics.com   ->   your real domain
```

It appears in `<link rel="canonical">`, the Open Graph tags, `robots.txt`,
`sitemap.xml`, and the JSON-LD blocks.

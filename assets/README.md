# assets/

Drop image files here. The site works without them (it falls back gracefully),
but it looks best with the real photos in place.

| File            | Used on            | Recommended size            | Notes |
|-----------------|--------------------|-----------------------------|-------|
| `flora.jpg`     | About page portrait | 900 × 1125 px (4:5), < 300 KB | Flora's photo. If missing, a monogram shows instead. |
| `og-image.jpg`  | Link previews (WhatsApp, LinkedIn, etc.) | 1200 × 630 px, < 400 KB | A branded image with the logo + tagline. Referenced in every page's `<meta property="og:image">`. |
| `logo.png`      | Optional — not currently used | height 80 px, transparent PNG | The nav uses a text lockup by default. Swap in an image only if you have a proper logo file. |

## Before going live

Search-and-replace the placeholder domain across the project:

```
https://florainkanalytics.com   ->   your real domain
```

It appears in `<link rel="canonical">`, the Open Graph tags, `robots.txt`,
`sitemap.xml`, and the JSON-LD blocks.

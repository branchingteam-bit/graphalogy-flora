# Flora Ink Analytics — website

Static multi-page site. No build step, no framework — plain HTML, one CSS file,
one JS file. Every page works if the CSS or JS fails to load.

```
index.html          Home
about.html          About Flora
services.html       Services (6 sections, deep-linkable: #analysis, #graphotherapy, …)
programs.html       Grapho-therapy programs (30 / 60 / 90 day + signature)
testimonials.html   Client testimonials
blog.html           Journal index (lists posts from posts/index.json)
blog-t-bar.html     First article
contact.html        Contact form + FAQ
404.html            Not-found page
admin.html          Hidden blog editor for Flora  (see "Blog editor" below)
api/publish.js      Serverless: creates/updates a post, commits it to this repo
api/posts.js        Serverless: lists editable posts
api/delete.js       Serverless: removes a post
posts/              Post sources + index.json
css/style.css       All styles (design tokens at the top)
js/main.js          Nav, animations, contact form, blog list
favicon.svg         Tab icon
assets/             Images — see assets/README.md
robots.txt, sitemap.xml, vercel.json
```

## Run it locally

Any static server works. For example:

```bash
npx serve .
```

Then open the printed URL.

## Before going live

1. **Set the real domain.** Replace `https://florainkanalytics.com` everywhere
   (canonical tags, Open Graph tags, `robots.txt`, `sitemap.xml`, JSON-LD).
2. **Images:** `assets/og-image.jpg` (link previews) is already in place. A photo
   of Flora is optional — see `assets/README.md`.
3. **Check the contact details** in the footer, `contact.html`, and every
   `wa.me/447789262008` link (currently the number from the original site).
4. **Contact form:** right now the form opens the visitor's email app with the
   message pre-filled (works with zero setup). To collect submissions properly,
   make a free form endpoint (e.g. Formspree) and paste it into `FORM_ENDPOINT`
   near the bottom of `js/main.js`.
5. **Blog editor:** the editor password is **`flora444flora`** (baked in — no
   setup). It only *publishes* once one env var (`GITHUB_TOKEN`) is set on
   Vercel — see below.

---

## Blog editor (so Flora can post, and Google still finds it)

The point of the blog is SEO, so a post has to become a **real page** that
Google can crawl — not something saved only in a browser. Here's how it works:

1. Flora opens **`/admin.html`** (not linked anywhere on the site) and enters a
   password.
2. She writes a post and clicks Publish.
3. `api/publish.js` (a Vercel serverless function) checks the password, turns the
   post into a full `blog-<slug>.html` page, and **commits it straight to this
   GitHub repo** along with an updated `sitemap.xml`.
4. Vercel sees the commit and redeploys automatically. ~30 seconds later the new
   article is a live, indexable page and it's in the sitemap. No manual `git push`.

Editing an existing post republishes it. Deleting removes the page and updates
the sitemap.

### Setup (one time, in the Vercel dashboard → Settings → Environment Variables)

| Name             | Needed? | Value                                                        |
|------------------|---------|-------------------------------------------------------------|
| `GITHUB_TOKEN`   | **yes, to publish** | a GitHub token with **Contents: Read and write** on this repo |
| `ADMIN_PASSWORD` | optional | override the editor password (default is `flora444flora`)   |
| `SITE_URL`       | optional | your live domain, e.g. `https://florainkanalytics.com`       |

The site, the pages, and the editor screen all work with **zero** env vars.
The **Publish** button is the only thing that needs `GITHUB_TOKEN` — without it
the editor loads and shows "GITHUB_TOKEN is not set" when you try to publish.
Redeploy once after adding it.

To make the `GITHUB_TOKEN`: GitHub → Settings → Developer settings →
**Fine-grained tokens** → *Generate new token* → repository access = only
`branchingteam-bit/graphalogy-flora` → Permissions → Repository → **Contents:
Read and write** → generate → paste the value into Vercel. Nothing else needs it.

### Security — read this

- The password `flora444flora` is baked into the code (in `api/*.js`). It keeps
  casual visitors out, but it's not a strong secret. To change it, set
  `ADMIN_PASSWORD` on Vercel — that overrides the baked-in default.
- `/admin.html` is unlinked and `noindex`, so visitors and leads won't stumble
  onto it — but "hidden" is not "protected". The password (checked server-side)
  is the real gate.
- For a proper second layer, turn on **Vercel → Settings → Deployment
  Protection** (or add Vercel Password Protection) and restrict it to
  `/admin.html` and `/api/*`.
- **Never commit the GitHub token.** It lives only as a Vercel env var. If a
  token is ever pasted into a file, a chat, or a screenshot, rotate it in GitHub
  immediately.

### Local note

The editor only works on the deployed Vercel site (it needs the serverless
functions). Locally, `/admin.html` will just say "server not reachable".

---

## Putting it on GitHub, then Vercel

GitHub is connected and every change so far is already pushed to
<https://github.com/branchingteam-bit/graphalogy-flora>.

### Connect Vercel (the one thing that needs you — ~5 clicks, one time)

1. Go to <https://vercel.com> and **Sign up / Log in with GitHub**.
2. Click **Add New… → Project**.
3. Find **`graphalogy-flora`** and click **Import**.
   (If it's not listed: **Adjust GitHub App Permissions** → give Vercel access to
   the repo, then come back.)
4. Don't change any settings — Framework Preset **Other**, Build Command and
   Output Directory both empty.
5. Click **Deploy**. ~20 seconds later you have a live URL like
   `graphalogy-flora.vercel.app`.

That's it. **Every `git push` to `main` now redeploys the site automatically.**

The blog editor at `/admin.html` (password `flora444flora`) will load right away.
To make its **Publish** button work, add one variable — see
[Blog editor → Setup](#setup-one-time-in-the-vercel-dashboard--settings--environment-variables).

### Point the real domain at it (when ready)

In the Vercel project: **Settings → Domains → Add**, type the domain, and Vercel
shows the exact DNS records to enter at the domain registrar. Then do the
find-and-replace from step 1 of "Before going live" and push.

---

Website by [Atlantic Bear](https://atlanticbear.com).

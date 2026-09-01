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
2. **Add images** to `assets/` — `flora.jpg` and `og-image.jpg`. See `assets/README.md`.
3. **Check the contact details** in the footer, `contact.html`, and every
   `wa.me/447789262008` link (currently the number from the original site).
4. **Contact form:** right now the form opens the visitor's email app with the
   message pre-filled (works with zero setup). To collect submissions properly,
   make a free form endpoint (e.g. Formspree) and paste it into `FORM_ENDPOINT`
   near the bottom of `js/main.js`.
5. **Blog editor:** set the two Vercel environment variables below and change the
   password off `222`.

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

| Name             | Value                                                        |
|------------------|-------------------------------------------------------------|
| `GITHUB_TOKEN`   | a GitHub token with **Contents: Read and write** on this repo |
| `ADMIN_PASSWORD` | the real editor password (until you set this it is `222`)    |
| `SITE_URL`       | your live domain, e.g. `https://florainkanalytics.com` (optional) |

Redeploy once after adding them.

To make the `GITHUB_TOKEN`: GitHub → Settings → Developer settings →
**Fine-grained tokens** → *Generate new token* → repository access = only
`branchingteam-bit/graphalogy-flora` → Permissions → Repository → **Contents:
Read and write** → generate → paste the value into Vercel. Nothing else needs it.

### Security — read this

- **`222` is a placeholder, not real security.** A 3-digit password can be
  guessed in seconds. Set `ADMIN_PASSWORD` to a real one before the site gets
  meaningful traffic.
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

This folder is **already connected to GitHub**:
<https://github.com/branchingteam-bit/graphalogy-flora>

So GitHub is done. You just need to push the new work, then link Vercel.

### 1. Push the redesign

Open Terminal in this folder and run:

```bash
git add -A
git commit -m "Redesigned multi-page site"
git push
```

If GitHub asks you to sign in, use a **Personal Access Token** as the password
(GitHub → Settings → Developer settings → Personal access tokens → Fine-grained
tokens → generate one with "Contents: Read and write" for this repo). Or install
[GitHub CLI](https://cli.github.com) and run `gh auth login` once.

Refresh the GitHub page afterwards — the new files will be there.

> Starting a brand-new repo instead? `git init`, then
> `git remote add origin <url>`, `git branch -M main`, `git push -u origin main`.

### 2. Connect Vercel

1. Go to <https://vercel.com> and sign in **with GitHub**.
2. Click **Add New… → Project**.
3. Find `graphalogy-flora` in the list and click **Import**.
   (If Vercel can't see it: **Adjust GitHub App Permissions** and give it access
   to the repo.)
4. Vercel auto-detects it as a static site. You don't need to change anything:
   - Framework Preset: **Other**
   - Build Command: *(leave empty)*
   - Output Directory: *(leave empty — it serves the repo root)*
5. Click **Deploy**. About 20 seconds later you get a live URL like
   `graphalogy-flora.vercel.app`.

From now on, **every `git push` to `main` redeploys automatically.** Change a
file, commit, push — the live site updates itself.

### 3. Point the real domain at it (when ready)

In the Vercel project: **Settings → Domains → Add**, type the domain, and Vercel
shows the exact DNS records to enter at the domain registrar. Then do the
find-and-replace from step 1 of "Before going live" and push.

---

Website by [Atlantic Bear](https://atlanticbear.com).

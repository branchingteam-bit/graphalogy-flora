/* ============================================================
   POST /api/publish   - create or update a blog post
   ------------------------------------------------------------
   Body (JSON): { password, title, body, excerpt?, slug?, date? }

   What it does, in ONE git commit to the repo:
     - blog-<slug>.html      the published, indexable article page
     - posts/<slug>.json     the raw source (so it can be edited later)
     - posts/index.json      the list the blog page + sitemap read
     - sitemap.xml           regenerated so Google finds the new page

   Vercel redeploys automatically on that commit, so the new
   article is live and crawlable within ~30s. No manual push.

   Required environment variables (set in the Vercel dashboard):
     GITHUB_TOKEN    a GitHub token with "Contents: read and write"
                     on this repo   (NEVER commit this)
     ADMIN_PASSWORD  optional override; defaults to "flora444flora"
   Optional:
     GITHUB_REPO     default "branchingteam-bit/graphalogy-flora"
     GITHUB_BRANCH   default "main"
     SITE_URL        default "https://florainkanalytics.com"
   ============================================================ */

const REPO   = process.env.GITHUB_REPO   || 'branchingteam-bit/graphalogy-flora';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const SITE   = (process.env.SITE_URL    || 'https://florainkanalytics.com').replace(/\/$/, '');
const RESERVED = ['t-bar', 'index', 'my-story', 'services', 'testimonials', 'contact', 'blog', 'admin', '404'];

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'Use POST' });

  let payload = req.body;
  if (typeof payload === 'string') { try { payload = JSON.parse(payload); } catch (e) { payload = {}; } }
  payload = payload || {};

  const password = String(payload.password || '');
  if (password !== (process.env.ADMIN_PASSWORD || 'flora444flora')) {
    return json(res, 401, { error: 'Wrong password' });
  }
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return json(res, 500, { error: 'GITHUB_TOKEN is not set on the server. Add it in the Vercel project settings.' });
  }

  const title = String(payload.title || '').trim();
  const rawBody = String(payload.body || '').trim();
  if (!title || !rawBody) return json(res, 400, { error: 'Title and body are both required.' });

  let slug = String(payload.slug || '').trim().toLowerCase() || slugify(title);
  if (!/^[a-z0-9][a-z0-9-]{0,58}[a-z0-9]$/.test(slug)) {
    return json(res, 400, { error: 'Could not build a valid slug from that title. Add a manual slug (letters, numbers, hyphens).' });
  }
  if (RESERVED.indexOf(slug) !== -1) {
    return json(res, 400, { error: 'That slug is reserved. Choose a different title or slug.' });
  }

  const date = /^\d{4}-\d{2}-\d{2}$/.test(payload.date || '') ? payload.date : new Date().toISOString().slice(0, 10);
  const words = rawBody.split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.round(words / 200)) + ' min read';
  const excerpt = String(payload.excerpt || '').trim() || firstSentence(rawBody);

  const contentHtml = mdToHtml(rawBody);
  const pageHtml = renderPage({ title, contentHtml, excerpt, date, readingTime, slug });
  const sourceJson = JSON.stringify({ slug, title, body: rawBody, excerpt, date }, null, 2) + '\n';

  try {
    // current post list
    const listFile = await ghGetContent('posts/index.json', token);
    let list = { posts: [] };
    if (listFile) { try { list = JSON.parse(listFile); } catch (e) {} }
    if (!Array.isArray(list.posts)) list.posts = [];
    list.posts = list.posts.filter(p => p && p.slug !== slug);
    list.posts.push({ slug, title, excerpt, date, readingTime });
    list.posts.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const indexJson = JSON.stringify(list, null, 2) + '\n';

    const sitemap = renderSitemap(list.posts);

    await ghCommit(token, 'Blog: publish "' + title + '"', [
      { path: 'blog-' + slug + '.html', content: pageHtml },
      { path: 'posts/' + slug + '.json', content: sourceJson },
      { path: 'posts/index.json', content: indexJson },
      { path: 'sitemap.xml', content: sitemap }
    ]);

    return json(res, 200, { ok: true, slug, url: SITE + '/blog-' + slug });
  } catch (err) {
    return json(res, 502, { error: 'GitHub API error: ' + (err && err.message || String(err)) });
  }
};

/* ---------- helpers ---------- */

function json(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(obj));
}

function slugify(s) {
  return String(s).toLowerCase()
    .replace(/[’'"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function firstSentence(s) {
  const m = String(s).replace(/\s+/g, ' ').match(/^.*?[.!?](\s|$)/);
  return (m ? m[0] : String(s).slice(0, 160)).trim();
}

function inlineMd(s) {
  s = esc(s);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return s;
}

function mdToHtml(src) {
  return String(src).replace(/\r\n/g, '\n').split(/\n{2,}/).map(block => {
    const b = block.trim();
    if (!b) return '';
    if (/^###\s+/.test(b)) return '<h3>' + inlineMd(b.replace(/^###\s+/, '')) + '</h3>';
    if (/^##\s+/.test(b)) return '<h2>' + inlineMd(b.replace(/^##\s+/, '')) + '</h2>';
    if (/^>\s?/.test(b)) return '<blockquote>' + inlineMd(b.replace(/^>\s?/gm, '')) + '</blockquote>';
    if (/^[-*]\s+/.test(b)) {
      const items = b.split('\n').filter(l => /^[-*]\s+/.test(l))
        .map(l => '<li>' + inlineMd(l.replace(/^[-*]\s+/, '')) + '</li>').join('');
      return '<ul>' + items + '</ul>';
    }
    return '<p>' + inlineMd(b).replace(/\n/g, '<br>') + '</p>';
  }).filter(Boolean).join('\n          ');
}

function renderSitemap(posts) {
  const core = ['/', '/my-story', '/services', '/testimonials', '/blog', '/contact', '/blog-t-bar'];
  const urls = core.map(u => '  <url><loc>' + SITE + u + '</loc></url>')
    .concat(posts
      .filter(p => p.slug !== 't-bar')
      .map(p => '  <url><loc>' + SITE + '/blog-' + esc(p.slug) + '</loc><lastmod>' + esc(p.date) + '</lastmod></url>'));
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.join('\n') + '\n</urlset>\n';
}

function navFooter() {
  return `<header class="nav" id="nav">
    <div class="nav__inner">
      <a class="brand" href="/" aria-label="Flora Ink Analytics, home">
        <span class="brand__name">Flora Ink Analytics</span>
        <span class="brand__tag">Graphology</span>
      </a>
      <button class="nav__toggle" id="navToggle" aria-label="Open menu" aria-expanded="false" aria-controls="navLinks"><span></span></button>
      <nav class="nav__links" id="navLinks" aria-label="Primary">
        <a href="/my-story">My Story</a>
        <a href="/services">Services</a>
        <a href="/testimonials">Testimonials</a>
        <a class="btn" href="https://wa.me/447789262008" target="_blank" rel="noopener">Book your free handwriting analysis</a>
      </nav>
    </div>
  </header>`;
}

function footer() {
  return `<footer class="footer">
    <div class="wrap">
      <div class="footer__grid">
        <div>
          <span class="brand__name">Flora Ink Analytics</span>
          <p>Handwriting analysis and grapho-therapy with Flora.<br>Dubai, UAE, and online worldwide.</p>
          <a class="footer__wa" href="https://wa.me/447789262008" target="_blank" rel="noopener"><svg class="icon" aria-hidden="true"><use href="#i-wa"/></svg> WhatsApp Flora</a>
        </div>
        <div>
          <h4>Pages</h4>
          <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/my-story">My Story</a></li>
            <li><a href="/services">Services &amp; Programs</a></li>
            <li><a href="/testimonials">Testimonials</a></li>
            <li><a href="/blog">Journal</a></li>
            <li><a href="/contact">Contact</a></li>
          </ul>
        </div>
        <div>
          <h4>What Flora does</h4>
          <ul>
            <li><a href="/services#analysis">Handwriting analysis</a></li>
            <li><a href="/services#graphotherapy">Grapho-therapy</a></li>
            <li><a href="/services#signature">Signature analysis</a></li>
            <li><a href="/services#programs">30, 60 &amp; 90-day programs</a></li>
            <li><a href="/services#health">Health in Handwriting</a></li>
          </ul>
        </div>
        <div>
          <h4>Start here</h4>
          <p>Your first handwriting analysis is completely free.</p>
          <a class="btn" href="https://wa.me/447789262008" target="_blank" rel="noopener">Book your free handwriting analysis</a>
        </div>
      </div>
      <div class="footer__bottom">
        <span>&copy; <span id="year">2026</span> Flora Ink Analytics. All rights reserved.</span>
        <span>Website by <a href="https://atlanticbear.com" target="_blank" rel="noopener">Atlantic Bear</a></span>
      </div>
    </div>
  </footer>`;
}

function renderPage(p) {
  const t = esc(p.title);
  const d = esc(p.excerpt);
  const url = SITE + '/blog-' + p.slug;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${t} | Flora Ink Analytics</title>
  <meta name="description" content="${d}" />
  <link rel="canonical" href="${url}" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${t}" />
  <meta property="og:description" content="${d}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${SITE}/assets/og-image.jpg" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400;1,9..144,500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/css/style.css" />
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"Article","headline":${JSON.stringify(p.title)},"datePublished":"${p.date}","author":{"@type":"Person","name":"Flora"},"publisher":{"@type":"Organization","name":"Flora Ink Analytics"},"mainEntityOfPage":"${url}"}
  </script>
</head>
<body>
  <script>document.documentElement.className += ' js';</script>
  <a class="skip-link" href="#main">Skip to content</a>

  <svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">
    <symbol id="i-wa" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.6-1.2A9 9 0 1 0 12 3z"/><path d="M8.6 8.4c-.2 0-.5 0-.7.4-.3.4-.9 1-.9 2.3s1 2.7 1.1 2.9c.2.2 2 3 4.8 4.1 2.4.9 2.8.7 3.3.7.6 0 1.7-.7 2-1.4.2-.6.2-1.2.2-1.3-.1-.1-.3-.2-.6-.4l-2-1c-.3-.1-.5-.1-.7.1l-.7.9c-.1.2-.3.2-.5.1-.7-.3-1.5-.7-2.3-1.7-.6-.7-1-1.5-1.1-1.8-.1-.2 0-.4.1-.5l.5-.6c.1-.2.2-.3.3-.5 0-.2 0-.4-.1-.5l-.9-2c-.2-.6-.5-.5-.6-.5z" fill="currentColor" stroke="none"/></symbol>
    <symbol id="i-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13M13 6l6 6-6 6"/></symbol>
  </svg>

  ${navFooter()}

  <main id="main">
    <section class="page-head">
      <span class="eyebrow">The journal</span>
      <h1>${t}</h1>
      <p class="article-meta">${esc(p.date)} &middot; ${esc(p.readingTime)}</p>
    </section>

    <section class="bay">
      <div class="wrap">
        <article class="prose">
          <a class="back-link" href="/blog"><svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg> All notes</a>
          ${p.contentHtml}
          <div class="btn-row" style="margin-top:2rem">
            <a class="btn" href="https://wa.me/447789262008" target="_blank" rel="noopener"><svg class="icon" aria-hidden="true"><use href="#i-wa"/></svg> Book your free handwriting analysis</a>
          </div>
        </article>
      </div>
    </section>
  </main>

  ${footer()}

  <script src="/js/main.js"></script>
</body>
</html>
`;
}

/* ---------- GitHub API ---------- */

async function gh(path, token, opts) {
  const r = await fetch('https://api.github.com' + path, Object.assign({
    headers: {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'flora-ink-cms',
      'Content-Type': 'application/json'
    }
  }, opts || {}));
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  if (!r.ok) throw new Error((data && data.message) || ('HTTP ' + r.status));
  return data;
}

async function ghGetContent(filePath, token) {
  try {
    const d = await gh('/repos/' + REPO + '/contents/' + filePath + '?ref=' + BRANCH, token);
    if (d && d.content) return Buffer.from(d.content, 'base64').toString('utf8');
  } catch (e) {
    if (!/not found|404/i.test(e.message)) throw e;
  }
  return null;
}

async function ghCommit(token, message, files) {
  const ref = await gh('/repos/' + REPO + '/git/ref/heads/' + BRANCH, token);
  const baseSha = ref.object.sha;
  const baseCommit = await gh('/repos/' + REPO + '/git/commits/' + baseSha, token);

  const tree = await gh('/repos/' + REPO + '/git/trees', token, {
    method: 'POST',
    body: JSON.stringify({
      base_tree: baseCommit.tree.sha,
      tree: files.map(f => ({ path: f.path, mode: '100644', type: 'blob', content: f.content }))
    })
  });

  const commit = await gh('/repos/' + REPO + '/git/commits', token, {
    method: 'POST',
    body: JSON.stringify({ message: message, tree: tree.sha, parents: [baseSha] })
  });

  await gh('/repos/' + REPO + '/git/refs/heads/' + BRANCH, token, {
    method: 'PATCH',
    body: JSON.stringify({ sha: commit.sha, force: false })
  });
}

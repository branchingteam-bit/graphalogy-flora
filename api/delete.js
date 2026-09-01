/* ============================================================
   POST /api/delete   — remove a blog post
   Body (JSON): { password, slug }
   Deletes blog-<slug>.html + posts/<slug>.json and regenerates
   posts/index.json + sitemap.xml, in one commit.
   ============================================================ */

const REPO   = process.env.GITHUB_REPO   || 'branchingteam-bit/graphalogy-flora';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const SITE   = (process.env.SITE_URL    || 'https://florainkanalytics.com').replace(/\/$/, '');
const RESERVED = ['t-bar', 'index'];

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'Use POST' });

  let payload = req.body;
  if (typeof payload === 'string') { try { payload = JSON.parse(payload); } catch (e) { payload = {}; } }
  payload = payload || {};

  if (String(payload.password || '') !== (process.env.ADMIN_PASSWORD || 'flora444flora')) {
    return json(res, 401, { error: 'Wrong password' });
  }
  const token = process.env.GITHUB_TOKEN;
  if (!token) return json(res, 500, { error: 'GITHUB_TOKEN is not set on the server.' });

  const slug = String(payload.slug || '').trim().toLowerCase();
  if (!/^[a-z0-9-]{1,60}$/.test(slug)) return json(res, 400, { error: 'Bad slug.' });
  if (RESERVED.indexOf(slug) !== -1) return json(res, 400, { error: 'That post is protected and cannot be deleted here.' });

  try {
    const listFile = await ghGetContent('posts/index.json', token);
    let list = { posts: [] };
    if (listFile) { try { list = JSON.parse(listFile); } catch (e) {} }
    if (!Array.isArray(list.posts)) list.posts = [];
    list.posts = list.posts.filter(p => p && p.slug !== slug);

    const core = ['/', '/about.html', '/services.html', '/programs.html', '/testimonials.html', '/blog.html', '/contact.html'];
    const urls = core.map(u => '  <url><loc>' + SITE + u + '</loc></url>')
      .concat(list.posts.map(p => '  <url><loc>' + SITE + '/blog-' + p.slug + '.html</loc><lastmod>' + p.date + '</lastmod></url>'));
    const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.join('\n') + '\n</urlset>\n';

    const ref = await gh('/repos/' + REPO + '/git/ref/heads/' + BRANCH, token);
    const baseSha = ref.object.sha;
    const baseCommit = await gh('/repos/' + REPO + '/git/commits/' + baseSha, token);
    const tree = await gh('/repos/' + REPO + '/git/trees', token, {
      method: 'POST',
      body: JSON.stringify({
        base_tree: baseCommit.tree.sha,
        tree: [
          { path: 'blog-' + slug + '.html', mode: '100644', type: 'blob', sha: null },
          { path: 'posts/' + slug + '.json', mode: '100644', type: 'blob', sha: null },
          { path: 'posts/index.json', mode: '100644', type: 'blob', content: JSON.stringify(list, null, 2) + '\n' },
          { path: 'sitemap.xml', mode: '100644', type: 'blob', content: sitemap }
        ]
      })
    });
    const commit = await gh('/repos/' + REPO + '/git/commits', token, {
      method: 'POST', body: JSON.stringify({ message: 'Blog: delete "' + slug + '"', tree: tree.sha, parents: [baseSha] })
    });
    await gh('/repos/' + REPO + '/git/refs/heads/' + BRANCH, token, {
      method: 'PATCH', body: JSON.stringify({ sha: commit.sha, force: false })
    });
    return json(res, 200, { ok: true, slug });
  } catch (err) {
    return json(res, 502, { error: 'GitHub API error: ' + (err && err.message || String(err)) });
  }
};

function json(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(obj));
}

async function gh(path, token, opts) {
  const r = await fetch('https://api.github.com' + path, Object.assign({
    headers: {
      'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json',
      'User-Agent': 'flora-ink-cms', 'Content-Type': 'application/json'
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

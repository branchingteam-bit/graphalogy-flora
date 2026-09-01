/* ============================================================
   GET /api/posts   — list the editable blog posts (with source)
   Auth: header  x-admin-password: <password>   (or ?password=)
   Reads the source files that /api/publish wrote to posts/*.json
   from the current deployment.
   ============================================================ */

const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  const given = String(req.headers['x-admin-password'] || (req.query && req.query.password) || '');
  if (given !== (process.env.ADMIN_PASSWORD || 'flora444flora')) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Wrong password' }));
  }

  const dir = path.join(process.cwd(), 'posts');
  const out = [];
  try {
    fs.readdirSync(dir).forEach(name => {
      if (name === 'index.json' || !name.endsWith('.json')) return;
      try {
        const p = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
        if (p && p.slug) out.push({ slug: p.slug, title: p.title || '', body: p.body || '', excerpt: p.excerpt || '', date: p.date || '' });
      } catch (e) {}
    });
  } catch (e) {}

  out.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ posts: out }));
};

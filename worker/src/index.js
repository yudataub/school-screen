// School hallway screen: content server + admin site.
//   GET  /               the admin site (Hebrew), asks for the password
//   GET  /config.json    the screen's content (public, read by kol-toda.co.il/screen/)
//   GET  /images/<name>  an uploaded picture (public)
//   POST /api/login      check the password
//   PUT  /api/config     save the content           (Authorization: Bearer <password>)
//   POST /api/image      upload one picture, returns {src}
//   GET  /api/images     list of every uploaded picture
// Storage: KV namespace SCREEN ("config", "img:<name>", "bak:<time>" = previous versions, kept 60 days).
// Secret: ADMIN_PASSWORD.
import ADMIN from './admin.html';

const CORS = { 'access-control-allow-origin': '*' };
const json = (o, status = 200) => new Response(JSON.stringify(o), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...CORS } });
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg' };

export default {
  async fetch(req, env) {
    const p = new URL(req.url).pathname;
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: { ...CORS, 'access-control-allow-methods': 'GET,PUT,POST,OPTIONS',
        'access-control-allow-headers': 'authorization,content-type', 'access-control-max-age': '86400' } });
    }
    if (req.method === 'GET' || req.method === 'HEAD') {
      if (p === '/' || p === '/index.html') {
        return new Response(ADMIN, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store',
          'x-robots-tag': 'noindex, nofollow' } });
      }
      if (p === '/robots.txt') return new Response('User-agent: *\nDisallow: /\n', { headers: { 'content-type': 'text/plain' } });
      if (p === '/config.json') {
        const t = await env.SCREEN.get('config');
        if (!t) return json({ error: 'no config yet' }, 404);
        return new Response(t, { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...CORS } });
      }
      if (p.startsWith('/images/')) {
        let name;
        try { name = decodeURIComponent(p.slice(8)); } catch (e) { return json({ error: 'bad name' }, 400); }
        const r = await env.SCREEN.getWithMetadata('img:' + name, 'arrayBuffer');
        if (!r.value) return json({ error: 'not found' }, 404);
        return new Response(r.value, { headers: { 'content-type': (r.metadata && r.metadata.type) || 'image/jpeg',
          'cache-control': 'public, max-age=604800', 'x-content-type-options': 'nosniff',
          'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'", ...CORS } });
      }
      if (p !== '/api/images') return json({ error: 'not found' }, 404);
    }

    if (!p.startsWith('/api/')) return json({ error: 'not found' }, 404);
    const given = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (!env.ADMIN_PASSWORD || given !== env.ADMIN_PASSWORD) {
      await new Promise(r => setTimeout(r, 1000));          // slows guessing
      return json({ error: 'bad password' }, 401);
    }

    if (p === '/api/login' && req.method === 'POST') return json({ ok: true });

    if (p === '/api/images' && req.method === 'GET') {          // every picture ever uploaded, newest first
      const names = [];
      let cursor;
      do {
        const r = await env.SCREEN.list({ prefix: 'img:', cursor });
        r.keys.forEach(k => names.push(k.name.slice(4)));
        cursor = r.list_complete ? null : r.cursor;
      } while (cursor);
      names.sort().reverse();
      return json({ images: names.map(n => 'images/' + n) });
    }

    if (p === '/api/config' && req.method === 'PUT') {
      const text = await req.text();
      if (text.length > 300000) return json({ error: 'too big' }, 413);
      let c;
      try { c = JSON.parse(text); } catch (e) { return json({ error: 'not JSON' }, 400); }
      if (!c || typeof c !== 'object' || !Array.isArray(c.default) || !Array.isArray(c.breaks)) return json({ error: 'bad config' }, 400);
      const old = await env.SCREEN.get('config');
      if (old && old !== text) await env.SCREEN.put('bak:' + new Date().toISOString(), old, { expirationTtl: 60 * 60 * 24 * 60 });
      await env.SCREEN.put('config', text);
      return json({ ok: true });
    }

    if (p === '/api/image' && req.method === 'POST') {
      const type = (req.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
      if (!EXT[type]) return json({ error: 'not a picture' }, 415);
      const buf = await req.arrayBuffer();
      if (!buf.byteLength || buf.byteLength > 8 * 1024 * 1024) return json({ error: 'too big' }, 413);
      const rnd = [...crypto.getRandomValues(new Uint8Array(5))].map(b => b.toString(16).padStart(2, '0')).join('');
      const name = new Date().toISOString().slice(0, 10) + '-' + rnd + '.' + EXT[type];
      await env.SCREEN.put('img:' + name, buf, { metadata: { type } });
      return json({ ok: true, src: 'images/' + name });
    }
    return json({ error: 'not found' }, 404);
  }
};

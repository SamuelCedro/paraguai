const fs = require('node:fs');
const path = require('node:path');
const { getUser } = require('./_auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    return res.end();
  }
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Vary', 'Cookie');
  try {
    const user = await getUser(req, res);
    if (!user) {
      res.statusCode = 302;
      res.setHeader('Location', '/');
      return res.end();
    }
    const html = fs.readFileSync(path.join(process.cwd(), 'private', 'member.html'));
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(html);
  } catch {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.end('Área de membros temporariamente indisponível.');
  }
};

const https = require('node:https');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// Local web preview uses a same-origin proxy; native apps call the API directly.
config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  if (!req.url?.startsWith('/api/')) return middleware(req, res, next);
  const headers = { accept: 'application/json' };
  for (const key of ['authorization', 'content-type']) {
    if (req.headers[key]) headers[key] = req.headers[key];
  }
  const upstream = https.request({
    hostname: 'finance.peacee1.io.vn', path: req.url, method: req.method, headers,
  }, (response) => {
    res.writeHead(response.statusCode || 502, {
      'content-type': response.headers['content-type'] || 'application/json',
      'cache-control': 'no-store',
      ...(response.headers['x-next-cursor'] ? { 'x-next-cursor': response.headers['x-next-cursor'] } : {}),
    });
    response.pipe(res);
  });
  upstream.setTimeout(15000, () => upstream.destroy());
  upstream.on('error', () => {
    if (!res.headersSent) res.writeHead(502, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ message: 'Không kết nối được máy chủ Peacee1.' }));
  });
  req.pipe(upstream);
};
module.exports = config;

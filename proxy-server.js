/**
 * 本地代理服务器 —— 解决 Web 端 CORS 问题
 * 将浏览器请求转发到路由器，绕过浏览器的同源策略限制
 *
 * 启动: node proxy-server.js
 * 默认端口: 3001
 */
const http = require('http');
const url = require('url');

const PROXY_PORT = 3001;

const server = http.createServer((req, res) => {
  // 允许所有来源（开发环境）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // 预检请求直接返回
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 只处理 /proxy 路径
  const parsedUrl = url.parse(req.url, true);
  if (parsedUrl.pathname !== '/proxy') {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Only /proxy endpoint is supported' }));
    return;
  }

  // 从查询参数获取目标路由器和 stok
  const { host, stok } = parsedUrl.query;
  if (!host) {
    res.writeHead(400);
    res.end(JSON.stringify({ error: 'Missing "host" query parameter' }));
    return;
  }

  // 收集请求体
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    const targetPath = stok ? `/stok=${encodeURIComponent(stok)}` : '/';
    const targetUrl = `http://${host}${targetPath}`;

    const options = {
      hostname: host,
      port: 80,
      path: targetPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error('[Proxy] 路由器连接失败:', err.message);
      res.writeHead(502);
      res.end(JSON.stringify({ error: `无法连接到路由器 ${host}: ${err.message}` }));
    });

    proxyReq.setTimeout(5000, () => {
      proxyReq.destroy();
      res.writeHead(504);
      res.end(JSON.stringify({ error: '路由器响应超时' }));
    });

    proxyReq.write(body);
    proxyReq.end();
  });
});

server.listen(PROXY_PORT, () => {
  console.log(`[Proxy] 代理服务器已启动 → http://localhost:${PROXY_PORT}/proxy`);
  console.log(`[Proxy] 用法: POST http://localhost:${PROXY_PORT}/proxy?host=192.168.2.1[&stok=xxx]`);
});

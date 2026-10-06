/**
 * FlashMan - Cloudflare Worker SRM Proxy
 * 
 * Deploy this to Cloudflare Workers (free tier: 100k req/day).
 * This proxies requests to sp.srmist.edu.in from Cloudflare's edge
 * network — which SRM cannot block without breaking their own Cloudflare CDN.
 * 
 * Setup:
 *  1. Go to https://dash.cloudflare.com → Workers & Pages → Create Worker
 *  2. Paste this file's contents
 *  3. Deploy → note your worker URL (e.g. flashman-proxy.yourname.workers.dev)
 *  4. In Vercel dashboard → Project Settings → Environment Variables:
 *     Add: PROXY_BASE_URL = https://flashman-proxy.yourname.workers.dev
 */

const SRM_BASE = 'https://sp.srmist.edu.in';

const ALLOWED_PATHS = [
  '/srmiststudentportal/',
  '/srmiststudentportal/LoginServlet',
  '/srmiststudentportal/students/report/studentAttendanceDetails.jsp',
  '/srmiststudentportal/students/report/studentAttendanceDetailsInner.jsp',
  '/srmiststudentportal/students/report/studentProfile.jsp',
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }

    // Health check
    if (url.pathname === '/' || url.pathname === '/health') {
      return jsonResponse({ ok: true, worker: 'FlashMan SRM Proxy', timestamp: new Date().toISOString() });
    }

    // The target SRM path comes from the request path
    // e.g. GET /srmiststudentportal/ -> proxies to SRM
    const targetPath = url.pathname + url.search;

    // Security: only allow known SRM paths
    const allowed = ALLOWED_PATHS.some(p => targetPath.startsWith(p));
    if (!allowed) {
      return jsonResponse({ error: 'Path not allowed', path: targetPath }, 403);
    }

    const targetUrl = `${SRM_BASE}${targetPath}`;

    // Forward all original headers except Host and CF-specific ones
    const forwardHeaders = new Headers();
    for (const [key, value] of request.headers.entries()) {
      const lower = key.toLowerCase();
      if (lower === 'host' || lower === 'cf-connecting-ip' || lower === 'cf-ray' || lower === 'x-forwarded-for') continue;
      forwardHeaders.set(key, value);
    }
    forwardHeaders.set('Host', 'sp.srmist.edu.in');
    if (!forwardHeaders.get('User-Agent')) {
      forwardHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    }

    const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer();

    const srmResponse = await fetch(targetUrl, {
      method: request.method,
      headers: forwardHeaders,
      body,
      redirect: 'manual',
    });

    // Build response headers - forward SRM's headers
    const responseHeaders = new Headers();
    for (const [key, value] of srmResponse.headers.entries()) {
      const lower = key.toLowerCase();
      if (lower === 'transfer-encoding' || lower === 'content-encoding') continue;
      responseHeaders.set(key, value);
    }
    for (const [key, value] of Object.entries(corsHeaders())) {
      responseHeaders.set(key, value);
    }

    const responseBody = await srmResponse.arrayBuffer();
    return new Response(responseBody, {
      status: srmResponse.status,
      headers: responseHeaders
    });
  }
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Cookie, Authorization, X-Domain-Proof',
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() }
  });
}

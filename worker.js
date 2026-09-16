// ==================== CLOUDFLARE WORKER ====================
// Feedback Dashboard - Frontend hosted on Cloudflare (Assets)
// Backend: Express.js API Server

const API_URL = 'https://api-feedback.f1genz.dev/api/exec';
const ALLOWED_ORIGIN = 'https://feedback.f1genz.dev';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle R2 upload directly in worker
    if (url.pathname === '/api/upload-image' && request.method === 'POST') {
      return handleImageUpload(request, env);
    }
    // Check client IP for dev-only features (e.g. Copy for AI)
    if (url.pathname === '/api/my-ip') {
      const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '';
      const allowedIps = (env.ALLOWED_DEV_IPS || '118.68.211.157,42.112.134.179').split(',').map(s => s.trim());
      const isAllowed = allowedIps.includes(clientIp);
      return new Response(JSON.stringify({ success: true, ip: clientIp, isAllowed }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': ALLOWED_ORIGIN
        }
      });
    }


    if (url.pathname.startsWith('/api/')) {
      return handleApiRequest(request, url, env);
    }

    // Serve static assets (HTML/CSS/JS from /public directory)
    return env.ASSETS.fetch(request);
  }
}

async function handleImageUpload(request, env) {
  try {
    const { imageData } = await request.json();

    if (!imageData || !imageData.startsWith('data:image')) {
      return new Response(JSON.stringify({ success: false, message: 'Invalid image data' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const matches = imageData.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      return new Response(JSON.stringify({ success: false, message: 'Invalid image format' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const imageType = matches[1];
    const base64Data = matches[2];

    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const filename = `comments/${Date.now()}-${crypto.randomUUID()}.${imageType}`;

    await env.IMAGES.put(filename, bytes, {
      httpMetadata: {
        contentType: `image/${imageType}`
      }
    });

    const publicUrl = `https://images.f1genz.dev/${filename}`;

    return new Response(JSON.stringify({ success: true, url: publicUrl }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: error.message }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleApiRequest(request, url, env) {
  const action = url.pathname.replace('/api/', '');
  const params = url.searchParams;
  const isRawTelegramImage = action === 'telegram-image' && params.get('raw') === '1';

  if (!env.API_KEY) {
    return new Response(JSON.stringify({ success: false, message: 'API_KEY secret not configured on worker' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    let response;
    if (request.method === 'POST') {
      const body = await request.text();
      response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.API_KEY
        },
        body: JSON.stringify({ action, ...JSON.parse(body) }),
        redirect: 'follow'
      });
    } else {
      let apiUrl;

      if (action === 'telegram-image') {
        apiUrl = `${API_URL.replace('/exec', '')}/${action}?`;
        for (const [key, value] of params) {
          apiUrl += `${key}=${encodeURIComponent(value)}&`;
        }
        apiUrl = apiUrl.slice(0, -1);
      } else {
        apiUrl = `${API_URL}?action=${action}`;
        for (const [key, value] of params) {
          apiUrl += `&${key}=${encodeURIComponent(value)}`;
        }
      }

      response = await fetch(apiUrl, {
        redirect: 'follow',
        headers: {
          'Accept': isRawTelegramImage ? 'image/*' : 'application/json',
          'x-api-key': env.API_KEY
        }
      });
    }

    if (isRawTelegramImage) {
      const headers = new Headers(response.headers);
      headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      const prefix = body.slice(0, 200);
      return new Response(JSON.stringify({
        success: false,
        message: `Upstream error ${response.status}: ${prefix}`
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': ALLOWED_ORIGIN }
      });
    }

    const text = await response.text();
    try {
      JSON.parse(text);
    } catch (_) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Upstream response is not valid JSON'
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': ALLOWED_ORIGIN }
      });
    }

    return new Response(text, {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': ALLOWED_ORIGIN }
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: error.message }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

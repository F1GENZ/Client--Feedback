// ==================== CLOUDFLARE WORKER ====================
// Feedback Dashboard - Frontend hosted on Cloudflare (Assets)
// Backend: Express.js API Server

const API_URL = 'https://api-feedback.f1genz.dev/api/exec';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle R2 upload directly in worker
    if (url.pathname === '/api/upload-image' && request.method === 'POST') {
      return handleImageUpload(request, env);
    }

    if (url.pathname.startsWith('/api/')) {
      return handleApiRequest(request, url);
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

async function handleApiRequest(request, url) {
  const action = url.pathname.replace('/api/', '');
  const params = url.searchParams;

  try {
    let response;
    if (request.method === 'POST') {
      const body = await request.text();
      response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'd0042f16f1e0ba3a5d9e4d60bf46bdfbad50d8aa'
        },
        body: JSON.stringify({ action, ...JSON.parse(body) }),
        redirect: 'follow'
      });
    } else {
      // Build URL for GET requests
      let apiUrl;
      
      // Special handling for direct endpoints (not using action pattern)
      if (action === 'telegram-image') {
        apiUrl = `${API_URL.replace('/exec', '')}/${action}?`;
        for (const [key, value] of params) {
          apiUrl += `${key}=${encodeURIComponent(value)}&`;
        }
        apiUrl = apiUrl.slice(0, -1); // Remove trailing &
      } else {
        // Standard action-based endpoints
        apiUrl = `${API_URL}?action=${action}`;
        for (const [key, value] of params) {
          apiUrl += `&${key}=${encodeURIComponent(value)}`;
        }
      }
      
      response = await fetch(apiUrl, {
        redirect: 'follow',
        headers: {
          'Accept': 'application/json',
          'x-api-key': 'd0042f16f1e0ba3a5d9e4d60bf46bdfbad50d8aa'
        }
      });
    }

    const text = await response.text();
    if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
      return new Response(JSON.stringify({ success: false, message: 'API chưa deploy' }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    return new Response(text, {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: error.message }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

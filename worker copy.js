// ==================== CLOUDFLARE WORKER ====================
// Feedback Dashboard - Frontend hosted on Cloudflare
// Backend: Google Apps Script JSON API

// ⚠️ THAY URL NÀY BẰNG URL APPS SCRIPT CỦA BẠN (SAU KHI DEPLOY MỚI)
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

    return new Response(HTML_CONTENT, {
      headers: { 
        'Content-Type': 'text/html; charset=utf-8', 
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Build-Time': '2026-01-10T10:05:00'
      }
    });
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

// ==================== HTML CONTENT ====================
const HTML_CONTENT = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>📊 F1GENZ Dashboard</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #4f46e5; --primary-light: #6366f1; --success: #10b981;
      --warning: #f59e0b; --danger: #ef4444; --dark: #1f2937;
      --gray: #6b7280; --light: #f3f4f6; --white: #fff; --border: #e5e7eb;
      --shadow: 0 2px 4px rgba(0,0,0,0.1);
      --bg: #f8fafc; --card-bg: #fff; --sidebar-bg: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
    }
    .dark {
      --primary: #818cf8; --primary-light: #a5b4fc; --success: #34d399;
      --warning: #fbbf24; --danger: #f87171; --dark: #f9fafb;
      --gray: #d1d5db; --light: #374151; --white: #1f2937; --border: #6b7280;
      --shadow: 0 2px 8px rgba(0,0,0,0.5);
      --bg: #111827; --card-bg: #1f2937; --sidebar-bg: #111827;
      --table-hover: #374151; --text-muted: #9ca3af;
      --sidebar-text: #f9fafb; --stats-bg: rgba(255,255,255,0.05);
      --link-color: #60a5fa;
    }
    /* Scrollbar */
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
    .dark ::-webkit-scrollbar-thumb { background: #4b5563; }
    .dark ::-webkit-scrollbar-thumb:hover { background: #6b7280; }
    
    /* Placeholders */
    ::placeholder { color: #9ca3af; opacity: 1; }
    .dark ::placeholder { color: #6b7280; opacity: 1; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; font-size: 13px; color: var(--dark); background: var(--bg); min-height: 100vh; }
    
    /* Layout: Sidebar + Main */
    .layout { display: flex; min-height: 100vh; }
    
    /* Sidebar - Fixed left */
    .sidebar {
      width: 80px; background: var(--sidebar-bg);
      position: fixed; left: 0; top: 0; bottom: 0;
      display: flex; flex-direction: column; align-items: center;
      padding: 15px 8px; gap: 8px; z-index: 100;
      transition: transform 0.3s, background 0.3s;
    }
    .sidebar-header { text-align: center; padding: 0 0 10px; margin-bottom: 10px; }
    .sidebar-header h1 { font-size: 0.7rem; color: var(--sidebar-text, #fff); font-weight: 600; }
    
    .stat-card {
      background: var(--stats-bg, rgba(255,255,255,0.15)); padding: 8px 6px; border-radius: 8px;
      text-align: center; width: 100%;
      backdrop-filter: blur(4px);
      border: 1px solid transparent;
      transition: all 0.2s;
    }
    .stat-card:hover { transform: translateY(-2px); background: var(--stats-bg, rgba(255,255,255,0.25)); }
    .stat-card.active { border-color: rgba(255,255,255,0.5); background: var(--stats-bg, rgba(255,255,255,0.25)); }
    .stat-card .number { font-size: 1.2rem; font-weight: 700; color: var(--sidebar-text, #fff); }
    .stat-card .label { font-size: 0.55rem; color: var(--sidebar-text, rgba(255,255,255,0.8)); margin-top: 2px; }
    
    #statsGrid { display: flex; flex-direction: column; gap: 8px; width: 100%; }
    
    /* Main Content - offset by sidebar */
    .main { 
      flex: 1; padding: 15px; margin-left: 80px; 
      height: 100vh; overflow: hidden;
      display: flex; flex-direction: column;
      background: #f8fafc;
    }
    
    .card { background: var(--card-bg); border-radius: 10px; box-shadow: var(--shadow); flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .card-header { display: none; padding: 12px 15px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
    .card-header h3 { font-size: 0.9rem; font-weight: 600; }
    .card-body { padding: 15px; flex: 1; overflow: hidden; display: flex; flex-direction: column; }
    
    /* Filters */
    .filter-section { display: flex; align-items: flex-end; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; flex-shrink: 0; }
    .filter-group { flex: 1; min-width: 120px; } 
    .filter-group label { display: block; font-size: 0.7rem; font-weight: 500; color: var(--gray); margin-bottom: 4px; text-transform: uppercase; }
    .filter-group select, .filter-group input { width: 100%; padding: 8px 10px; border: 1px solid var(--border); border-radius: 6px; font-size: 12px; }

    /* Host Tabs */
    .host-tabs { display: flex; gap: 8px; margin-bottom: 12px; flex-shrink: 0; overflow-x: auto; padding-bottom: 4px; }
    .host-tab { padding: 5px; border: 1px solid var(--border); border-radius: 20px; font-size: 11px; font-weight: 500; cursor: pointer; background: transparent; color: var(--gray); white-space: nowrap; transition: all 0.2s; display: flex; align-items: center; }
    .host-tab:hover { border-color: var(--primary); color: var(--primary); }
    .host-tab.active { background: var(--primary); color: #fff; border-color: var(--primary); }
    .dark .host-tab.active { background: #4f46e5; border-color: #4f46e5; }
    .host-tab .count { background: rgba(0,0,0,0.1); padding: 3px 6px; border-radius: 10px; font-size: 11px; margin-left: 6px; }
    .host-tab.active .count { background: rgba(255,255,255,0.2); color: #fff; }
    
    /* Buttons */
    .btn { padding: 8px 12px; border: none; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 4px; }
    .btn-primary { background: var(--primary); color: var(--white); }
    .btn-success { background: var(--success); color: var(--white); }
    .btn-outline { background: var(--white); border: 1px solid var(--border); color: var(--dark); }
    .btn-sm { padding: 4px 8px; font-size: 10px; }
    
    /* Table */
    .table-container { flex: 1; overflow-y: auto; overflow-x: auto; }
    .feedback-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .feedback-table th, .feedback-table td { padding: 8px 10px; text-align: left; border-bottom: 1px solid var(--border); }
    .feedback-table th { font-size: 0.65rem; font-weight: 600; text-transform: uppercase; color: var(--gray); background: var(--light); position: sticky; top: 0; }
    .feedback-table tr:hover { background: var(--table-hover, #f9fafb); }
    .feedback-table .shop-name { font-weight: 600; color: var(--link-color, var(--primary)); font-size: 11px; }
    .feedback-table .note-text { max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--gray); font-size: 11px; }

    /* Stage Badge */
    /* Stage Badge - Improved Contrast */
    .stage-badge { padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; white-space: nowrap; }
    .stage-done { background: #2563eb; color: #fff; } /* Blue 600 */
    .stage-feedback { background: #dc2626; color: #fff; } /* Red 600 */
    .stage-pending { background: #4b5563; color: #fff; } /* Gray 600 */
    .stage-dabaokhach { background: #059669; color: #fff; } /* Emerald 600 */

    /* Host Tab Avatar */
    .host-tab img { width: 24px; height: 24px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }
    
    /* Stage Dropdown */
    .stage-dropdown { position: relative; display: inline-block; }
    .stage-dropdown-content { display: none; position: absolute; background: var(--white); min-width: 130px; box-shadow: var(--shadow); border-radius: 6px; z-index: 100; top: 100%; left: 0; }
    .stage-dropdown:hover .stage-dropdown-content { display: block; }
    .stage-dropdown-content a { padding: 6px 10px; display: block; color: var(--dark); text-decoration: none; font-size: 11px; }
    .stage-dropdown-content a:hover { background: var(--light); }
    
    /* Action Buttons */
    .action-btn { padding: 3px 6px; border: none; border-radius: 4px; font-size: 10px; cursor: pointer; transition: all 0.2s; }
    .action-btn.view { background: var(--primary); color: var(--white); }
    .action-btn.view:hover { background: var(--primary-light); }
    .action-btn.edit { background: #f59e0b; color: var(--white); }
    .action-btn.edit:hover { background: #d97706; }
    .action-btn.delete { background: #ef4444; color: var(--white); }
    .action-btn.delete:hover { background: #dc2626; }
    .action-btn.link { background: #6b7280; color: var(--white); }
    .action-btn.link:hover { background: #4b5563; }
    
    /* Modal */
    .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: none; justify-content: center; align-items: center; z-index: 1000; opacity: 0; transition: opacity 0.3s; }
    .modal-overlay.active { display: flex; opacity: 1; }
    .modal { background: var(--white); width: 95%; max-width: 900px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); display: flex; flex-direction: column; max-height: 90vh; overflow-y: auto; }
    .dark .modal { background: var(--sidebar-bg); border: 1px solid var(--border); }
    .modal-header { padding: 15px 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: inherit; z-index: 10; }
    .modal-close { background: none; border: none; font-size: 20px; cursor: pointer; color: var(--gray); display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; transition: background 0.2s; }
    .modal-close:hover { background: var(--light); color: var(--danger); }
    .modal-body { padding: 20px; }
    
    /* 2-Column Detail Layout */
    .modal-body-flex { display: flex; gap: 20px; height: 100%; }
    .modal-left { flex: 2; min-width: 0; }
    .modal-right { flex: 1.2; min-width: 0; border-left: 1px solid var(--border); padding-left: 20px; display: flex; flex-direction: column; }
    
    @media (max-width: 768px) {
      .modal-body-flex { flex-direction: column; }
      .modal-right { border-left: none; border-top: 1px solid var(--border); padding-left: 0; padding-top: 20px; }
    }
    
    .modal-footer { padding: 15px 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 10px; position: sticky; bottom: 0; background: inherit; z-index: 10; }
    .hidden { display: none !important; }
    /* View Mode Styles */
    .view-group { margin-bottom: 15px; }
    .view-label { font-size: 11px; color: var(--gray); font-weight: 500; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
    .view-value { font-size: 14px; color: var(--dark); line-height: 1.5; word-break: break-word; }
    .dark .view-value { color: var(--white); }
    .view-value a { color: var(--primary); text-decoration: none; }
    .view-value a:hover { text-decoration: underline; }
    .view-note { white-space: pre-wrap; background: var(--bg); padding: 10px; border-radius: 8px; font-family: monospace, sans-serif; font-size: 13px; }
    .dark .view-note { background: #1f2937; }
    /* Form */
    .form-group { margin-bottom: 12px; }
    .form-group label { display: block; font-size: 0.75rem; font-weight: 500; margin-bottom: 4px; }
    .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 8px 10px; border: 1px solid var(--border); border-radius: 6px; font-size: 12px; background: var(--card-bg); color: var(--dark); }
    .form-group textarea { min-height: 80px; resize: vertical; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    
    /* Utilities */
    .loading-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: var(--card-bg); opacity: 0.9; display: none; align-items: center; justify-content: center; z-index: 50; flex-direction: column; gap: 10px; }
    .loading-overlay.active { display: flex; }
    .spinner { display: inline-block; width: 32px; height: 32px; border: 3px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.6s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    
    .toast { position: fixed; bottom: 15px; right: 15px; padding: 10px 15px; background: var(--dark); color: var(--white); border-radius: 8px; display: none; z-index: 2000; font-size: 12px; }
    .toast.show { display: block; }
    .toast.success { background: var(--success); }
    .toast.error { background: var(--danger); }
    
    .pagination { display: flex; justify-content: center; gap: 6px; padding: 8px; flex-shrink: 0; }
    .pagination button { padding: 5px 10px; border: 1px solid var(--border); background: var(--white); border-radius: 6px; cursor: pointer; font-size: 11px; }
    .pagination button:hover { background: var(--primary); color: var(--white); }
    
    .refresh-info { text-align: center; padding: 10px 0; margin-top: auto; display: flex; flex-direction: column; align-items: center; gap: 5px; }
    .clock-container { position: relative; display: inline-block; }
    .refresh-btn { background: none; border: none; color: #fff; opacity: 0.7; cursor: pointer; font-size: 16px; padding: 6px; transition: all 0.2s; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-top: 5px; }
    .refresh-btn:hover { opacity: 1; background: rgba(255,255,255,0.1); }
    .refresh-btn:hover { opacity: 1; background: rgba(255,255,255,0.1); }
    .refresh-btn.spinning { cursor: not-allowed; opacity: 1; }
    .refresh-btn.spinning svg { animation: spin 1s linear infinite; }
    .clock-time { font-size: 0.9rem; font-weight: 700; color: var(--sidebar-text, #fff); letter-spacing: 0.5px; line-height: 1.2; }
    .clock-date { font-size: 0.7rem; color: rgba(255,255,255,0.6); margin-top: 2px; font-weight: 500; }

    /* Main Tabs Navigation */
    .main-tabs { display: flex; gap: 0; margin-bottom: 0; border-bottom: 2px solid var(--border); position: relative; padding-right: 40px; }
    .header-refresh { position: absolute; right: 0; top: 50%; transform: translateY(-50%); margin-top: 0; color: var(--gray); opacity: 1; }
    .header-refresh:hover { background: var(--light); color: var(--primary); }
    .dark .header-refresh:hover { background: var(--light); color: var(--white); }
    
    .tag-list { display: inline-flex; gap: 4px; margin-left: 8px; align-items: center; vertical-align: middle; }
    .tag-img { height: 16px; width: auto; object-fit: contain; display: block; }
    .tag-gap { height: 26px; margin-bottom: 2px; filter: drop-shadow(0 0 2px rgba(255, 77, 77, 0.6)); }

    .history-table { width: 100%; font-size: 12px; }
    .history-table th { position: sticky; top: 0; background: var(--white); z-index: 1; }
    .history-table td { padding: 8px 10px; vertical-align: top; }
    .history-table tr:nth-child(even) { background: var(--light); }
    .dark .history-table th { background: var(--dark); }
    .dark .history-table tr:nth-child(even) { background: rgba(255,255,255,0.03); }

    .bulk-action-bar { background: var(--primary); color: #fff; padding: 8px 12px; display: flex; align-items: center; justify-content: space-between; border-radius: 6px; margin-bottom: 10px; }
    .bulk-action-bar .bulk-actions { display: flex; gap: 6px; }
    .bulk-action-bar .btn { font-size: 11px; padding: 5px 10px; }
    .dark .bulk-action-bar { background: #6366f1; }
    .main-tab { padding: 10px 20px; border: none; background: transparent; font-size: 13px; font-weight: 600; cursor: pointer; color: var(--gray); border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.2s; }
    .main-tab:hover { color: var(--primary); }
    .main-tab.active { color: var(--primary); border-bottom-color: var(--primary); background: rgba(79, 70, 229, 0.05); }
    .tab-content { display: none; flex: 1; overflow: hidden; flex-direction: column; }
    .tab-content.active { display: flex; }

    /* Guides Table */
    .guides-container { flex: 1; overflow-y: auto; padding: 15px; }
    .guide-group { margin-bottom: 20px; }
    .guide-group-title { font-size: 13px; font-weight: 600; color: var(--dark); margin-bottom: 10px; padding: 6px 12px; background: var(--light); border-left: 3px solid var(--primary); border-radius: 0 4px 4px 0; display: inline-block; }
    .guides-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px; }
    .guide-card { background: var(--white); border: 1px solid var(--border); border-radius: 6px; padding: 10px 12px; transition: all 0.2s; display: flex; align-items: flex-start; gap: 10px; }
    .guide-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08); border-color: var(--primary); }
    .guide-icon { width: 32px; height: 32px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; background: var(--light); }
    .guide-info { flex: 1; min-width: 0; }
    .guide-title { font-weight: 600; color: var(--dark); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .guide-title-link { font-weight: 600; color: var(--primary); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-decoration: none; display: block; }
    .guide-title-link:hover { text-decoration: underline; }
    .guide-links { display: flex; gap: 6px; margin-top: 4px; }
    .guide-link { font-size: 10px; padding: 2px 6px; border-radius: 3px; text-decoration: none; font-weight: 500; cursor: pointer; background: var(--light); color: var(--dark); border: 1px solid var(--border); }
    .guide-link:hover { background: var(--primary); color: var(--white); border-color: var(--primary); }
    .guide-link.copied { background: var(--success); color: var(--white); border-color: var(--success); }
    .guide-actions { display: flex; gap: 2px; align-self: flex-start; }
    .guide-action-btn { padding: 3px 5px; border: none; border-radius: 3px; font-size: 11px; cursor: pointer; transition: all 0.2s; line-height: 1; background: var(--light); }
    .guide-action-btn:hover { background: var(--border); }

    /* Theme Toggle & Hamburger */
    .theme-toggle { width: 40px; height: 40px; border: none; border-radius: 50%; background: rgba(255,255,255,0.2); color: white; font-size: 18px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
    .theme-toggle:hover { background: rgba(255,255,255,0.3); transform: scale(1.1); }
    .hamburger-btn { display: none; width: 36px; height: 36px; border: none; border-radius: 6px; background: rgba(255,255,255,0.2); color: white; font-size: 20px; cursor: pointer; margin-bottom: 10px; }
    .sidebar-overlay { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 99; }
    .comment-item:last-child{ border-bottom: none !important; }
    /* Mobile Responsive */
    @media (max-width: 768px) {
      .sidebar { transform: translateX(-100%); width: 200px; }
      .sidebar.open { transform: translateX(0); }
      .hamburger-btn { display: flex; align-items: center; justify-content: center; position: fixed; top: 10px; left: 10px; z-index: 101; background: var(--primary); }
      .sidebar.open .hamburger-btn { position: static; background: rgba(255,255,255,0.2); }
      .sidebar-overlay.active { display: block; }
      .main { margin-left: 0; padding: 60px 10px 10px; }
      .filter-section { flex-direction: column; gap: 8px; }
      .filter-group { min-width: 100%; }
      .host-tabs { flex-wrap: nowrap; overflow-x: auto; }
      .feedback-table { display: block; }
      .feedback-table thead { display: none; }
      .feedback-table tbody { display: flex; flex-direction: column; gap: 10px; }
      .feedback-table tr { display: flex; flex-direction: column; background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 12px; }
      .feedback-table td { padding: 4px 0; border: none; display: flex; justify-content: space-between; }
      .feedback-table td::before { content: attr(data-label); font-weight: 600; color: var(--gray); font-size: 11px; }
      .feedback-table td:first-child { display: none; }
      .main-tabs { overflow-x: auto; }
      .main-tab { white-space: nowrap; padding: 8px 12px; font-size: 12px; }
      .guides-grid { grid-template-columns: 1fr; }
      .modal { width: 95%; max-width: none; margin: 10px; max-height: 90vh; }
    }
  </style>
</head>
<body>
  <div class="layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <button class="hamburger-btn" onclick="toggleSidebar()">☰</button>
      <div class="sidebar-header">
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 512 512"><g fill-rule="evenodd" clip-rule="evenodd"><path fill="#64b5f6" d="M42.27 9h427.46C488.029 9 503 23.971 503 42.27v427.46c0 18.298-14.971 33.27-33.27 33.27H42.27C23.971 503 9 488.029 9 469.73V42.27C9 23.971 23.971 9 42.27 9z"/><path fill="#e6f8ff" d="M49.57 128.861h412.862c3.3 0 6 2.7 6 6v327.57c0 3.3-2.7 6-6 6H49.57c-3.3 0-6-2.7-6-6v-327.57c0-3.3 2.7-6 6-6z"/><path fill="#004960" d="M9 94.292h494V42.27C503 23.971 488.029 9 469.73 9H42.27C23.971 9 9 23.971 9 42.27z"/><circle cx="149.785" cy="213.754" r="63.77" fill="#72d561"/><path fill="#ffda2d" d="M149.785 149.983v63.77l58.569 25.266c3.347-7.748 5.201-16.291 5.201-25.267 0-35.218-28.551-63.769-63.77-63.769z"/><path fill="#fc685b" d="m208.354 239.02-58.569-25.267-38.294 50.997c10.664 8.02 23.924 12.773 38.294 12.773 26.243 0 48.784-15.852 58.569-38.503z"/></g></svg>
        <h1>F1GENZ<br>Dashboard</h1>
      </div>
      <div id="statsGrid"></div>
      <div style="flex: 1;"></div>
      <button class="theme-toggle" onclick="toggleDarkMode()" title="Toggle Dark Mode">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 512 512"><g><g fill-rule="evenodd" clip-rule="evenodd"><path fill="#fbd307" d="M459.05 394.384C417.391 447.138 352.866 481 280.428 481 154.795 481 52.95 379.154 52.95 253.522 52.95 144.14 130.157 52.803 233.044 31c-30.593 38.74-48.857 87.667-48.857 140.863 0 125.633 101.845 227.478 227.478 227.478 16.252 0 32.099-1.717 47.385-4.957z" opacity="1" data-original="#fbd307" class=""></path><path fill="#f9c301" d="M459.05 394.384C417.391 447.138 352.866 481 280.428 481 154.795 481 52.95 379.154 52.95 253.522c0-65.737 27.894-124.947 72.48-166.472-30.094 38.568-48.029 87.086-48.029 139.798 0 125.633 101.845 227.478 227.478 227.478 59.293 0 113.282-22.692 153.771-59.857z" opacity="1" data-original="#f9c301"></path></g></g></svg>
      </button>
      <div class="refresh-info" id="refreshInfo"></div>
    </aside>
    <div class="sidebar-overlay" onclick="toggleSidebar()"></div>
    
    <!-- Main Content -->
    <main class="main">
      <div class="card">
        <!-- Main Tabs -->
        <div class="main-tabs">
          <button class="main-tab active" onclick="switchTab('feedback')">📋 Danh sách Feedback</button>
          <button class="main-tab" onclick="switchTab('guides')">📚 File Hướng Dẫn</button>
          <!-- <button class="main-tab" onclick="switchTab('history')">📜 Lịch sử</button> DISABLED -->
        </div>

        <!-- Feedback Tab Content -->
        <div id="feedbackTab" class="tab-content active">
          <div class="card-body">
            <!-- Host Tabs -->
            <div class="host-tabs" id="hostTabs"></div>

            <div class="filter-section">
              <div class="filter-group" style="flex: 2;">
                <label>Tìm kiếm</label>
                <input type="text" id="searchInput" placeholder="Shop, nội dung..." oninput="debounceFilter()">
              </div>
              <div class="filter-group">
                <label>Trạng thái</label>
                <select id="filterStage" onchange="applyFilter()"><option value="all">Tất cả</option></select>
              </div>
              <div class="filter-group">
                <label>Sắp xếp</label>
                <select id="sortOrder" onchange="applyFilter()">
                  <option value="time_desc">Thời gian mới nhất</option>
                  <option value="time_asc">Thời gian cũ nhất</option>
                </select>
              </div>
              <button class="btn btn-success" style="flex-shrink: 0; white-space: nowrap;" onclick="openCreateModal()">➕ Tạo mới</button>
            </div>
            
            <!-- Bulk Action Bar (Top) -->
            <div id="bulkActionBar" class="bulk-action-bar" style="display:none;">
              <span id="bulkSelectedCount" style="font-weight:600;">0 mục</span>
              <div class="bulk-actions">
                <button class="btn btn-success btn-sm" onclick="bulkMarkDone()">✅ Done</button>
                <button class="btn btn-danger btn-sm" onclick="bulkDeleteSelected()">🗑️ Xóa</button>
                <button class="btn btn-outline btn-sm" onclick="clearSelection()">❌ Bỏ chọn</button>
              </div>
            </div>

            <div class="table-container" style="position:relative;">
              <div id="loadingOverlay" class="loading-overlay">
                <span class="spinner"></span>
                <span style="color:var(--gray);font-size:12px;">Đang tải dữ liệu...</span>
              </div>
              <table class="feedback-table">
                <thead>
                  <tr>
                    <th style="width:30px;"><input type="checkbox" id="selectAllCheckbox" onclick="toggleSelectAll()" title="Chọn tất cả"></th>
                    <th>#</th>
                    <th>Shop</th>
                    <th>Host</th>
                    <th>Nội dung</th>
                    <th>Stage</th>
                    <th>Thời gian</th>
                    <th>Deadline</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody id="feedbackTableBody"></tbody>
              </table>
            </div>
            <div class="pagination" id="pagination"></div>
          </div>
        </div>

        <!-- Guides Tab Content -->
        <div id="guidesTab" class="tab-content">
          <div class="guides-header" style="padding: 12px 15px; display: flex; align-items: center; gap: 12px;">
            <div class="filter-group" style="margin: 0; flex: 1; max-width: 300px;">
              <input type="text" id="guideSearchInput" placeholder="🔍 Tìm kiếm hướng dẫn..." oninput="filterGuides()">
            </div>
            <button class="btn btn-success" onclick="openCreateGuideModal()">➕ Tạo mới</button>
          </div>
          <div class="guides-container" id="guidesContainer">
            <div style="text-align:center;padding:40px;color:var(--gray);">Đang tải...</div>
          </div>
        </div>

        <!-- History Tab Content -->
        <div id="historyTab" class="tab-content">
          <div class="card-body">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; padding: 0 5px;">
              <span style="font-size:13px; font-weight:600; color:var(--dark);">Lịch sử hoạt động gần đây</span>
              <button class="btn btn-outline btn-sm" onclick="refreshHistory()" id="historyRefreshBtn">🔄 Làm mới</button>
            </div>
            <div class="table-wrapper" style="max-height: calc(100vh - 220px); overflow-y: auto;">
              <table class="history-table">
                <thead>
                  <tr>
                    <th style="width: 140px;">Thời gian</th>
                    <th style="width: 130px;">Hành động</th>
                    <th>Nội dung</th>
                  </tr>
                </thead>
                <tbody id="historyTableBody"><tr><td colspan="3" style="text-align:center;padding:30px;color:var(--gray);">Click "Làm mới" để tải dữ liệu</td></tr></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>

  <!-- Modal Tạo mới -->
  <div class="modal-overlay" id="createModal">
    <div class="modal">
      <div class="modal-header">
        <h3>➕ Tạo mới Feedback</h3>
        <button class="modal-close" onclick="closeModal('createModal')">&times;</button>
      </div>
      <div class="modal-body" id="createModalBody">
        <div class="form-row">
          <div class="form-group">
            <label>Shop *</label>
            <input type="text" id="createShop" placeholder="myshop.haravan.com">
          </div>
          <div class="form-group">
            <label>Host *</label>
            <select id="createHost"><option value="">-- Chọn --</option></select>
          </div>
        </div>
        <div class="form-group">
          <label>Link</label>
          <input type="text" id="createLink" placeholder="https://...">
        </div>
        <div class="form-group">
          <label>Nội dung *</label>
          <textarea id="createNote" placeholder="Mô tả vấn đề..."></textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Stage</label>
            <select id="createStage">
              <option value="Feedback">Feedback</option>
              <option value="Đã báo khách">Đã báo khách</option>
              <option value="Pending">Pending</option>
              <option value="Done">Done</option>
            </select>
          </div>
          <div class="form-group">
            <label>Deadline</label>
            <input type="date" id="createDeadline">
          </div>
        </div>
        <div class="form-group">
          <label>Tags</label>
          <select id="createTags">
            <option value="">-- Chọn --</option>
            <option value="haravan">Haravan</option>
            <option value="gap">Gấp</option> 
            <option value="note">Note</option>
            <option value="baogia">Báo giá</option>
            <option value="sapo">Sapo</option>
          </select>
        </div>
      </div>
      <div class="modal-footer" id="createModalFooter">
        <button class="btn btn-outline" onclick="closeModal('createModal')">Hủy</button>
        <button class="btn btn-success" onclick="submitCreate()">➕ Tạo</button>
      </div>
    </div>
  </div>

  <!-- Modal Edit -->
  <div class="modal-overlay" id="editModal" onclick="closeModal('editModal')">
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-header">
        <h3>📋 Chi tiết Feedback</h3>
        <button class="modal-close" onclick="closeModal('editModal')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="modal-body-flex">
          <!-- LEFT COLUMN: FORM DATA -->
          <div class="modal-left">
            <input type="hidden" id="editRowNumber">
            
            <!-- FORM INPUTS (disabled by default, enabled when Edit clicked) -->
            <div id="editModeForm">
              <div class="form-row">
                <div class="form-group">
                  <label>Shop</label>
                  <input type="text" id="editShop">
                </div>
                <div class="form-group">
                  <label>Host</label>
                  <select id="editHost"></select>
                </div>
              </div>
              <div class="form-group">
                <label>Link</label>
                <input type="text" id="editLink">
              </div>
              <div class="form-group">
                <label>Nội dung</label>
                <textarea id="editNote" style="min-height: 120px;"></textarea>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Stage</label>
                  <select id="editStage">
                    <option value="Feedback">Feedback</option>
                    <option value="Đã báo khách">Đã báo khách</option>
                    <option value="Pending">Pending</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Deadline</label>
                  <input type="date" id="editDeadline">
                </div>
              </div>
              <div class="form-group">
                <label>Tags</label>
                <select id="editTags">
                  <option value="">-- Chọn --</option>
                  <option value="haravan">Haravan</option>
                  <option value="gap">Gấp</option>
                  <option value="note">Note</option>
                  <option value="baogia">Báo giá</option>
                  <option value="sapo">Sapo</option>
                </select>
              </div>
            </div>
          </div>

          <!-- RIGHT COLUMN: COMMENTS -->
          <div class="modal-right">
            <h4 style="margin: 0 0 15px 0; font-size: 14px; color: var(--gray);">💬 Comments</h4>
            <div id="commentsList" style="flex: 1; overflow-y: auto; min-height: 200px; max-height: 400px; padding-right: 5px;">
              <div style="text-align:center; color:var(--gray); padding:30px;">Đang tải...</div>
            </div>
            <div style="margin-top: 15px; border-top: 1px solid var(--border); padding-top: 15px;">
              <div id="commentImagePreview" style="display:none; margin-bottom:10px; position:relative;">
                <img id="commentPreviewImg" style="max-width:200px; border-radius:8px; border:1px solid var(--border);">
                <button onclick="removeCommentImage()" style="position:absolute; top:5px; right:5px; background:var(--danger); color:white; border:none; border-radius:50%; width:24px; height:24px; cursor:pointer; font-size:14px; line-height:1;">×</button>
              </div>
              <div style="display: flex; gap: 10px; align-items: flex-start;">
                <textarea id="newCommentText" placeholder="Viết bình luận (Ctrl+V để paste ảnh)..." style="flex:1; min-height:40px; resize:vertical; padding: 10px; border: 1px solid var(--border); border-radius: 8px; font-family: inherit; font-size: 13px; outline: none; transition: border-color 0.2s;" onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='var(--border)'"></textarea>
                <button class="btn btn-primary" style="padding: 0; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 8px; flex-shrink: 0;" onclick="addNewComment()" title="Gửi">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal('editModal')">Đóng</button>
        <div style="display:flex; gap:8px;">
          <button id="btnEnableEdit" class="btn btn-primary" onclick="enableEditMode()" style="background: #f59e0b;">✏️ Sửa</button>
          <button id="btnSaveEdit" class="btn btn-primary hidden" onclick="submitEdit()">💾 Lưu</button>
        </div>
      </div>
    </div>
  </div>



  <!-- Modal Tạo Guide -->
  <div class="modal-overlay" id="createGuideModal">
    <div class="modal">
      <div class="modal-header">
        <h3>➕ Tạo mới Hướng dẫn</h3>
        <button class="modal-close" onclick="closeModal('createGuideModal')">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Loại *</label>
          <select id="createGuideType">
            <option value="Hướng dẫn">Hướng dẫn</option>
            <option value="Tool">Tool</option>
            <option value="Web">Web</option>
          </select>
        </div>
        <div class="form-group">
          <label>Tên Template *</label>
          <input type="text" id="createGuideTemplate" placeholder="Tên hướng dẫn...">
        </div>
        <div class="form-group">
          <label>Link</label>
          <input type="text" id="createGuideLink" placeholder="https://...">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal('createGuideModal')">Hủy</button>
        <button class="btn btn-success" onclick="submitCreateGuide()">➕ Tạo</button>
      </div>
    </div>
  </div>

  <!-- Modal Edit Guide -->
  <div class="modal-overlay" id="editGuideModal">
    <div class="modal">
      <div class="modal-header">
        <h3>✏️ Chỉnh sửa Hướng dẫn</h3>
        <button class="modal-close" onclick="closeModal('editGuideModal')">&times;</button>
      </div>
      <div class="modal-body">
        <input type="hidden" id="editGuideRowNumber">
        <div class="form-group">
          <label>Loại *</label>
          <select id="editGuideType">
            <option value="Hướng dẫn">Hướng dẫn</option>
            <option value="Tool">Tool</option>
            <option value="Web">Web</option>
            <option value="Multilanguage F1GenZ">Multilanguage F1GenZ</option>
          </select>
        </div>
        <div class="form-group">
          <label>Tên Template *</label>
          <input type="text" id="editGuideTemplate" placeholder="Tên hướng dẫn...">
        </div>
        <div class="form-group">
          <label>Link</label>
          <input type="text" id="editGuideLink" placeholder="https://...">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal('editGuideModal')">Hủy</button>
        <button class="btn btn-primary" onclick="submitEditGuide()">💾 Lưu</button>
      </div>
    </div>
  </div>

  <div class="toast" id="toast"></div>

  <script>
    let allFeedback = [];
    let originalFeedback = []; // Keep original data for filtering
    let currentPage = 1;
    const itemsPerPage = 30;
    let cachedHosts = [];
    let selectedHost = 'all'; // Currently selected host tab

    // Host avatars mapping
    const hostAvatars = {
      'all': 'https://cdn.hstatic.net/files/1000405253/file/box.png',
      'Lâm': 'https://trello-members.s3.amazonaws.com/5fdac33c9d84bd6153dabe45/95d9bd3f1ad2bee3e0019f176c5b8fa2/170.png',
      'Quốc': 'https://trello-members.s3.amazonaws.com/5326f22338ed163a73d467cd/7df84f81127ecfad6ef02ec6c5b38b5d/170.png',
      'Taiz': 'https://trello-members.s3.amazonaws.com/60a1ea2661a4a01815d68adc/02fb035fdf550b489032362f2398092c/170.png',
      'Tuan': 'https://trello-members.s3.amazonaws.com/67b7d9d182d17521bcb34c74/9797bc53f79fbfa906e3b22ce54608ff/50.png',
      'Nghĩa': 'https://ui-avatars.com/api/?name=Ngh%C4%A9a&background=F30000&color=fff'
    };

    const iconSun = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 128 128" style="enable-background:new 0 0 512 512" xml:space="preserve" class="hovered-paths"><g><circle cx="64" cy="63.97" r="33.51" fill="#ffbc45" opacity="1" data-original="#ffbc45" class="hovered-path"></circle><path fill="#f9ae35" d="M78.97 34c2.26 4.51 3.53 9.59 3.53 14.97 0 18.5-15 33.51-33.51 33.51-5.38 0-10.47-1.28-14.97-3.53C39.53 89.93 50.88 97.48 64 97.48c18.5 0 33.51-15 33.51-33.51 0-13.12-7.55-24.47-18.54-29.97z" opacity="1" data-original="#f9ae35"></path><g fill="#ffbc45"><path d="M64 2c-1.1 0-2 .9-2 2v11.22c0 1.1.9 2 2 2s2-.9 2-2V4c0-1.1-.9-2-2-2zM64 110.73c-1.1 0-2 .9-2 2v11.22c0 1.1.9 2 2 2s2-.9 2-2v-11.22a2 2 0 0 0-2-2zM104.99 20.15l-7.93 7.93a2.004 2.004 0 0 0 1.41 3.42c.51 0 1.02-.2 1.41-.59l7.93-7.93c.78-.78.78-2.05 0-2.83s-2.04-.78-2.82 0zM28.11 97.03l-7.93 7.93a2.004 2.004 0 0 0 1.41 3.42c.51 0 1.02-.2 1.41-.59l7.93-7.93c.78-.78.78-2.05 0-2.83s-2.04-.78-2.82 0zM123.97 61.97h-11.22c-1.1 0-2 .9-2 2s.9 2 2 2h11.22a2 2 0 1 0 0-4zM15.25 61.97H4.03c-1.1 0-2 .9-2 2s.9 2 2 2h11.22c1.1 0 2-.9 2-2s-.9-2-2-2zM99.89 97.03c-.78-.78-2.05-.78-2.83 0s-.78 2.05 0 2.83l7.93 7.93c.39.39.9.59 1.41.59s1.02-.2 1.41-.59c.78-.78.78-2.05 0-2.83zM23.01 20.15c-.78-.78-2.05-.78-2.83 0s-.78 2.05 0 2.83l7.93 7.93c.39.39.9.59 1.41.59s1.02-.2 1.41-.59c.78-.78.78-2.05 0-2.83z" fill="#ffbc45" opacity="1" data-original="#ffbc45" class="hovered-path"></path></g></g></svg>';
    const iconMoon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 512 512"><g><g fill-rule="evenodd" clip-rule="evenodd"><path fill="#fbd307" d="M459.05 394.384C417.391 447.138 352.866 481 280.428 481 154.795 481 52.95 379.154 52.95 253.522 52.95 144.14 130.157 52.803 233.044 31c-30.593 38.74-48.857 87.667-48.857 140.863 0 125.633 101.845 227.478 227.478 227.478 16.252 0 32.099-1.717 47.385-4.957z" opacity="1" data-original="#fbd307" class=""></path><path fill="#f9c301" d="M459.05 394.384C417.391 447.138 352.866 481 280.428 481 154.795 481 52.95 379.154 52.95 253.522c0-65.737 27.894-124.947 72.48-166.472-30.094 38.568-48.029 87.086-48.029 139.798 0 125.633 101.845 227.478 227.478 227.478 59.293 0 113.282-22.692 153.771-59.857z" opacity="1" data-original="#f9c301"></path></g></g></svg>';

    // ==================== DARK MODE & SIDEBAR ====================
    function toggleDarkMode() {
      document.body.classList.toggle('dark');
      const isDark = document.body.classList.contains('dark');
      localStorage.setItem('darkMode', isDark ? 'true' : 'false');
      document.querySelector('.theme-toggle').innerHTML = isDark ? iconSun : iconMoon;
    }

    function toggleSidebar() {
      document.querySelector('.sidebar').classList.toggle('open');
      document.querySelector('.sidebar-overlay').classList.toggle('active');
    }

    // Initialize dark mode from localStorage
    if (localStorage.getItem('darkMode') === 'true') {
      document.body.classList.add('dark');
      document.querySelector('.theme-toggle').innerHTML = iconSun;
    }

    function startClock() {
      const el = document.getElementById('refreshInfo');
      const update = () => {
        const now = new Date();
        const d = now.getDate().toString().padStart(2, '0');
        const m = (now.getMonth() + 1).toString().padStart(2, '0');
        const y = now.getFullYear();
        const h = now.getHours().toString().padStart(2, '0');
        const min = now.getMinutes().toString().padStart(2, '0');
        const s = now.getSeconds().toString().padStart(2, '0');
        el.innerHTML = 
          '<div class="clock-container">' +
            '<div class="clock-time">' + h + ':' + min + ':' + s + '</div>' +
            '<div class="clock-date">' + d + '/' + m + '/' + y + '</div>' +
          '</div>';
      };
      update();
      setInterval(update, 1000);

      // Add Refresh Button to Main Header
      function addHeaderRefreshBtn() {
        const tabs = document.querySelector('.main-tabs');
        if (tabs && !document.getElementById('headerRefreshBtn')) {
           const btn = document.createElement('button');
           btn.id = 'headerRefreshBtn';
           btn.className = 'refresh-btn header-refresh';
           btn.title = 'Làm mới dữ liệu';
           btn.onclick = refreshDataSilent;
           btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>';
           tabs.appendChild(btn);
        }
      }
      addHeaderRefreshBtn();


      // Auto Refresh Interval (15s)
      setInterval(() => {
        // SAFEGUARD: Only refresh if NO modal is open
        if (!document.querySelector('.modal-overlay.active')) {
          refreshDataSilent();
        }
      }, 15000);
    }
    startClock();

    async function refreshDataSilent() {
      const btn = document.getElementById('headerRefreshBtn') || document.querySelector('.refresh-btn');
      if (btn) btn.classList.add('spinning');
      
      try {
        const data = await apiGet('getDashboardData');
        if (data.success) {
          originalFeedback = data.feedback;
          allFeedback = [...originalFeedback];
          
          // Update host tabs counts (only Feedback stage)
          const counts = {};
          const feedbackOnly = originalFeedback.filter(r => (r.stage || '').includes('Feedback'));
          feedbackOnly.forEach(r => { if (r.host) counts[r.host] = (counts[r.host] || 0) + 1; });
          document.querySelectorAll('.host-tab').forEach(tab => {
            const host = tab.dataset.host;
            const countEl = tab.querySelector('.count');
            if (countEl) countEl.textContent = host === 'all' ? feedbackOnly.length : (counts[host] || 0);
          });
          
          // Re-apply current filters but keep current page
          applyFilter(false, true);
        }
      } catch (e) {
        console.error('Auto-refresh failed', e);
      } finally {
        if (btn) btn.classList.remove('spinning');
      }
    }

    async function apiGet(action, params = {}) {
      const response = await fetch('/api/' + action + '?' + new URLSearchParams(params));
      return response.json();
    }

    async function apiPost(action, data = {}) {
      const response = await fetch('/api/' + action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return response.json();
    }

    // ==================== BULK ACTIONS ====================
    const selectedRows = new Set();

    function toggleSelectAll() {
      const checkbox = document.getElementById('selectAllCheckbox');
      const start = (currentPage - 1) * itemsPerPage;
      const rows = allFeedback.slice(start, start + itemsPerPage);
      
      if (checkbox.checked) {
        rows.forEach(r => selectedRows.add(r.rowNumber));
      } else {
        rows.forEach(r => selectedRows.delete(r.rowNumber));
      }
      
      // Update row checkboxes
      document.querySelectorAll('.row-checkbox').forEach(cb => {
        cb.checked = checkbox.checked;
      });
      
      updateBulkBar();
    }

    function toggleSelectRow(rowNumber) {
      if (selectedRows.has(rowNumber)) {
        selectedRows.delete(rowNumber);
      } else {
        selectedRows.add(rowNumber);
      }
      
      // Update "Select All" checkbox state
      const start = (currentPage - 1) * itemsPerPage;
      const rows = allFeedback.slice(start, start + itemsPerPage);
      const allSelected = rows.every(r => selectedRows.has(r.rowNumber));
      document.getElementById('selectAllCheckbox').checked = allSelected;
      
      updateBulkBar();
    }

    function updateBulkBar() {
      const bar = document.getElementById('bulkActionBar');
      const countEl = document.getElementById('bulkSelectedCount');
      
      if (selectedRows.size > 0) {
        bar.style.display = 'flex';
        countEl.textContent = selectedRows.size + ' m\u1ee5c \u0111\u01b0\u1ee3c ch\u1ecdn';
      } else {
        bar.style.display = 'none';
      }
    }

    async function bulkMarkDone() {
      if (selectedRows.size === 0) return;
      
      showToast('\u0110ang c\u1eadp nh\u1eadt ' + selectedRows.size + ' m\u1ee5c...');
      try {
        const result = await apiPost('bulkUpdateStage', {
          rowNumbers: Array.from(selectedRows),
          newStage: 'Done'
        });
        if (result.success) {
          showToast('\u2705 ' + result.message, 'success');
          clearSelection();
          loadDashboard();
        } else {
          showToast('L\u1ed7i: ' + result.message, 'error');
        }
      } catch (e) {
        showToast('L\u1ed7i: ' + e.message, 'error');
      }
    }

    async function bulkDeleteSelected() {
      if (selectedRows.size === 0) return;
      
      if (!confirm('X\u00f3a ' + selectedRows.size + ' m\u1ee5c \u0111\u00e3 ch\u1ecdn? H\u00e0nh \u0111\u1ed9ng n\u00e0y kh\u00f4ng th\u1ec3 ho\u00e0n t\u00e1c.')) return;
      
      showToast('\u0110ang x\u00f3a ' + selectedRows.size + ' m\u1ee5c...');
      try {
        const result = await apiPost('bulkDelete', {
          rowNumbers: Array.from(selectedRows)
        });
        if (result.success) {
          showToast('\u2705 ' + result.message, 'success');
          clearSelection();
          loadDashboard();
        } else {
          showToast('L\u1ed7i: ' + result.message, 'error');
        }
      } catch (e) {
        showToast('L\u1ed7i: ' + e.message, 'error');
      }
    }

    function clearSelection() {
      selectedRows.clear();
      document.getElementById('selectAllCheckbox').checked = false;
      document.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = false);
      updateBulkBar();
    }

    async function loadDashboard() {
      restoreState(); // Restore saved state on page load
      document.getElementById('loadingOverlay').classList.add('active');
      const tbody = document.getElementById('feedbackTableBody');
      if (allFeedback.length === 0) tbody.innerHTML = '';

      try {
        const result = await apiGet('getDashboardData');
        if (result && result.success) {
          // Sort by time (newest first) and store original
          originalFeedback = (result.feedback || []).sort((a, b) => parseDate(b.time) - parseDate(a.time));
          allFeedback = [...originalFeedback];

          // Calculate stats client-side for accuracy
          const stats = {
            done: originalFeedback.filter(r => (r.stage || '').includes('Done')).length,
            pending: originalFeedback.filter(r => (r.stage || '').includes('Feedback')).length,
            byStage: {}
          };
          originalFeedback.forEach(r => {
             const s = r.stage || 'Unknown';
             stats.byStage[s] = (stats.byStage[s] || 0) + 1;
          });

          renderStats(stats);
          renderFilterOptions(result.filterOptions);
          
          // Apply restored state after rendering filter options
          const savedState = localStorage.getItem('dashboardState');
          if (savedState) {
            const state = JSON.parse(savedState);
            if (state.stage && state.stage !== 'all') {
              const stageEl = document.getElementById('filterStage');
              if (stageEl) stageEl.value = state.stage;
            }
            if (state.search) {
              const searchEl = document.getElementById('searchInput');
              if (searchEl) searchEl.value = state.search;
            }
            if (state.sort) {
              const sortEl = document.getElementById('sortOrder');
              if (sortEl) sortEl.value = state.sort;
            }
          }
          
          renderTable();
          updateRefreshTime();
        } else {
          showToast('Lỗi: ' + (result?.message || 'Unknown'), 'error');
        }
      } catch (error) {
        showToast('Lỗi: ' + error.message, 'error');
      } finally {
        document.getElementById('loadingOverlay').classList.remove('active');
      }
    }

    function renderStats(stats) {
      const total = Object.values(stats.byStage || {}).reduce((a, b) => a + b, 0);
      document.getElementById('statsGrid').innerHTML = \`
        <div class="stat-card" style="background:rgba(255,255,255,0.2);">
          <div class="number">\${total}</div>
          <div class="label">Tất cả</div>
        </div>
        <div class="stat-card done">
          <div class="number">\${stats.done}</div>
          <div class="label">Done</div>
        </div>
        <div class="stat-card pending">
          <div class="number">\${stats.pending}</div>
          <div class="label">Feedback</div>
        </div>
        <div class="stat-card deadline">
          <div class="number">\${stats.byStage && stats.byStage['Pending'] || 0}</div>
          <div class="label">Pending</div>
        </div>
      \`;\n    }

    function renderFilterOptions(options, savedStage) {
      cachedHosts = options.hosts || [];
      const hostCounts = {};
      const feedbackOnly = originalFeedback.filter(r => (r.stage || '').includes('Feedback'));
      feedbackOnly.forEach(r => {
        if (r.host) hostCounts[r.host] = (hostCounts[r.host] || 0) + 1;
      });
      const totalCount = feedbackOnly.length;
      const allAvatar = '<img src="' + hostAvatars['all'] + '" alt="">';
      let tabsHtml = '<div class="host-tab ' + (selectedHost === 'all' ? 'active' : '') + '" onclick="selectHost(this.dataset.host)" data-host="all">' + allAvatar + 'Tất cả<span class="count">' + totalCount + '</span></div>';
      cachedHosts.forEach(h => {
        const count = hostCounts[h] || 0;
        const avatar = hostAvatars[h] ? '<img src="' + hostAvatars[h] + '" alt="">' : '';
        tabsHtml += '<div class="host-tab ' + (selectedHost === h ? 'active' : '') + '" onclick="selectHost(this.dataset.host)" data-host="' + h + '">' + avatar + h + '<span class="count">' + count + '</span></div>';
      });
      document.getElementById('hostTabs').innerHTML = tabsHtml;
      const stageSelect = document.getElementById('filterStage');
      const currentStage = savedStage || stageSelect.value;
      stageSelect.innerHTML = '<option value="all">Tất cả</option>';
      (options.stages || []).forEach(s => {
        stageSelect.innerHTML += '<option value="' + s + '" ' + (s === currentStage ? 'selected' : '') + '>' + s + '</option>';
      });
    }

    function selectHost(host) {
      selectedHost = host;
      // Update UI active state manually to avoid DOM re-rendering
      document.querySelectorAll('.host-tab').forEach(el => {
        el.classList.toggle('active', el.dataset.host === host);
      });
      applyFilter(false);
      saveState();
    }

    const TAG_LOGOS = {
      'sapo': 'https://cdn.hstatic.net/files/1000405253/file/sapo-logo.png',
      'haravan': 'https://cdn.hstatic.net/files/1000405253/file/svgviewer-png-output.png',
      'gap': 'https://cdn.hstatic.net/files/1000405253/file/hot-gif.gif',
      'note': 'https://cdn.hstatic.net/files/1000405253/file/sticky-note.png'
    };

    function renderTags(tagsStr) {
      if (!tagsStr) return '';
      return tagsStr.split(',').map(t => t.trim()).filter(Boolean).map(tag => {
        const lower = tag.toLowerCase();
        if (TAG_LOGOS[lower]) {
          return '<img src="' + TAG_LOGOS[lower] + '" class="tag-img tag-' + lower + '" title="' + tag + '">';
        }
        return ''; // Only show if logo exists, or use badge for text? User asked for images specifically.
      }).join('');
    }

    function formatVNTime(timeStr) {
      if (!timeStr) return '-';
      // Input format: "HH:mm:ss dd/MM/yyyy" hoặc "dd/MM/yyyy HH:mm:ss" hoặc "yyyy-MM-dd"
      try {
        // Check ISO format yyyy-MM-dd (deadline)
        if (/^\\d{4}-\\d{2}-\\d{2}$/.test(timeStr)) {
          const [yyyy, mm, dd] = timeStr.split('-');
          return dd + '/' + mm + '/' + yyyy;
        }
        
        // Try parse multiple formats
        if (timeStr.includes(' ')) {
          const [part1, part2] = timeStr.split(' ');
          if (part1.includes(':')) {
            // Format: HH:mm:ss dd/MM/yyyy
            const timePart = part1;
            const datePart = part2;
            const [dd, mm, yyyy] = datePart.split('/');
            const [hh, mi] = timePart.split(':');
            return hh + ':' + mi + ' ' + dd + '/' + mm + '/' + yyyy;
          } else if (part2.includes(':')) {
            // Format: dd/MM/yyyy HH:mm:ss
            const datePart = part1;
            const timePart = part2;
            const [dd, mm, yyyy] = datePart.split('/');
            const [hh, mi] = timePart.split(':');
            return hh + ':' + mi + ' ' + dd + '/' + mm + '/' + yyyy;
          }
        }
        return timeStr;
      } catch (e) {
        return timeStr;
      }
    }

    function renderTable() {
      const start = (currentPage - 1) * itemsPerPage;
      const rows = allFeedback.slice(start, start + itemsPerPage);
      
      if (rows.length === 0) {
        document.getElementById('feedbackTableBody').innerHTML = '<tr><td colspan="9" style="text-align:center;padding:30px;">Không có dữ liệu</td></tr>';
        document.getElementById('pagination').innerHTML = '';
        return;
      }
      
      document.getElementById('feedbackTableBody').innerHTML = rows.map((r, i) => \`
        <tr>
          <td><input type="checkbox" class="row-checkbox" data-row="\${r.rowNumber}" \${selectedRows.has(r.rowNumber) ? 'checked' : ''} onclick="toggleSelectRow(\${r.rowNumber})"></td>
          <td>\${start + i + 1}</td>
          <td class="shop-name">
            <a href="https://\${r.shop}/admin" target="_blank" style="color:var(--primary);text-decoration:none;">\${r.shop || '-'}</a>
            <div class="tag-list">\${renderTags(r.tags)}</div>
          </td>
          <td><strong>\${r.host || '-'}</strong></td>
          <td class="note-text" title="\${escapeHtml(r.note || r.message || '')}">
            <div style="display:flex; align-items:center; gap:4px;">
              <span style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">\${r.note || r.message || '-'}</span>
              <span style="flex-shrink:0; font-size:14px;">
                \${r.devNote ? '📝' : ''}\${(r.imageNote || r.imageId) ? '📷' : ''}
              </span>
            </div>
          </td>
          <td>
            <div class="stage-dropdown">
              <span class="stage-badge \${getStageClass(r.stage)}">\${r.stage || '-'}</span>
              <div class="stage-dropdown-content">
                <a href="#" onclick="quickUpdate(\${r.rowNumber}, 'Feedback'); return false;">🔄 Feedback</a>
                <a href="#" onclick="quickUpdate(\${r.rowNumber}, 'Đã báo khách'); return false;">📤 Đã báo</a>
                <a href="#" onclick="quickUpdate(\${r.rowNumber}, 'Done'); return false;">✅ Done</a>
                <a href="#" onclick="quickUpdate(\${r.rowNumber}, 'Pending'); return false;">⏳ Pending</a>
              </div>
            </div>
          </td>
          <td style="font-size:10px; white-space:nowrap;">\${formatVNTime(r.time)}</td>
          <td style="font-size:10px;">\${formatVNTime(r.deadline)}</td>
          <td style="white-space:nowrap;">
            <button class="action-btn view" onclick="viewDetail(\${r.rowNumber})">Xem</button>
            <button class="action-btn" style="background:#fee2e2;color:#dc2626;" onclick="deleteFeedback(\${r.rowNumber})">Xóa</button>
            \${r.link ? '<button class="action-btn" style="background:#fef3c7;color:#d97706;" onclick="window.open(\\'' + r.link + '\\', \\'_blank\\')">Link</button>' : ''}
          </td>
        </tr>
      \`).join('');
      
      renderPagination();
    }

    function renderPagination() {
      const total = Math.ceil(allFeedback.length / itemsPerPage);
      if (total <= 1) {
        document.getElementById('pagination').innerHTML = \`<span style="color:var(--gray);">Tổng: \${allFeedback.length}</span>\`;
        return;
      }
      document.getElementById('pagination').innerHTML = \`
        <span style="color:var(--gray);margin-right:8px;">\${currentPage}/\${total}</span>
        \${currentPage > 1 ? \`<button onclick="goToPage(\${currentPage-1})">←</button>\` : ''}
        \${currentPage < total ? \`<button onclick="goToPage(\${currentPage+1})">→</button>\` : ''}
      \`;
    }

    function goToPage(p) { currentPage = p; renderTable(); saveState(); }

    function applyFilter(reload = false, preservePage = false) {
      const search = document.getElementById('searchInput').value.toLowerCase().trim();
      const stage = document.getElementById('filterStage').value;
      const sort = document.getElementById('sortOrder').value;

      const processData = () => {
        // Always start from original data
        let f = [...originalFeedback];

        // Filter by stage first (before host filtering) to calculate counts
        let stageFiltered = f;
        if (stage !== 'all') stageFiltered = f.filter(r => r.stage === stage);
        
        // Update host counts based on stage filter
        const hostCounts = {};
        stageFiltered.forEach(r => {
          if (r.host) hostCounts[r.host] = (hostCounts[r.host] || 0) + 1;
        });
        const totalCount = stageFiltered.length;
        
        // Update host tab counts
        document.querySelectorAll('.host-tab').forEach(tab => {
          const host = tab.dataset.host;
          const countEl = tab.querySelector('.count');
          if (countEl) countEl.textContent = host === 'all' ? totalCount : (hostCounts[host] || 0);
        });

        // Now apply all filters
        if (selectedHost !== 'all') f = f.filter(r => r.host === selectedHost);
        if (stage !== 'all') f = f.filter(r => r.stage === stage);
        // Smart search: search in shop, note, host, tags
        if (search) {
          f = f.filter(r =>
            (r.shop && r.shop.toLowerCase().includes(search)) ||
            (r.note && r.note.toLowerCase().includes(search)) ||
            (r.host && r.host.toLowerCase().includes(search)) ||
            (r.tags && r.tags.toLowerCase().includes(search))
          );
        }

        // Sorting
        f.sort((a, b) => {
          if (sort === 'time_desc') return parseDate(b.time) - parseDate(a.time);
          if (sort === 'time_asc') return parseDate(a.time) - parseDate(b.time);
          return 0;
        });

        allFeedback = f;

        if (!preservePage) {
          currentPage = 1;
        } else {
          const maxPage = Math.ceil(allFeedback.length / itemsPerPage) || 1;
          if (currentPage > maxPage) currentPage = maxPage;
        }

        renderTable();
        saveState(); // Auto-save state after filter changes
      };

      if (reload) {
        loadDashboard().then(processData);
      } else {
        processData();
      }
    }

    // ==================== STATE PERSISTENCE ====================
    let currentTab = 'feedback';

    function saveState() {
      const state = {
        tab: currentTab,
        host: selectedHost,
        stage: document.getElementById('filterStage')?.value || 'all',
        search: document.getElementById('searchInput')?.value || '',
        sort: document.getElementById('sortOrder')?.value || 'time_desc',
        page: currentPage
      };
      localStorage.setItem('dashboardState', JSON.stringify(state));
    }

    function restoreState() {
      try {
        const saved = localStorage.getItem('dashboardState');
        if (!saved) return;
        
        const state = JSON.parse(saved);
        
        // Restore tab
        if (state.tab && state.tab !== 'feedback') {
          currentTab = state.tab;
          switchTab(state.tab);
        }
        
        // Restore host
        if (state.host) {
          selectedHost = state.host;
        }
        
        // Restore filters (will be applied after data loads)
        if (state.stage) {
          const stageEl = document.getElementById('filterStage');
          if (stageEl) stageEl.value = state.stage;
        }
        if (state.search) {
          const searchEl = document.getElementById('searchInput');
          if (searchEl) searchEl.value = state.search;
        }
        if (state.sort) {
          const sortEl = document.getElementById('sortOrder');
          if (sortEl) sortEl.value = state.sort;
        }
        
        // Restore page
        if (state.page) {
          currentPage = state.page;
        }
      } catch (e) {
        console.log('Failed to restore state:', e);
      }
    }

    function parseDate(str) {
      if (!str) return 0;
      const parts = str.split(' ')[1].split('/'); // HH:mm:ss dd/MM/yyyy
      return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
    }



    async function quickUpdate(row, stage) {
      showToast('Đang cập nhật...');
      try {
        const result = await apiPost('updateStage', { rowNumber: row, newStage: stage });
        if (result.success) { showToast('✅ OK', 'success'); applyFilter(true, true); }
        else showToast('Lỗi: ' + result.message, 'error');
      } catch (e) { showToast('Lỗi: ' + e.message, 'error'); }
    }

    async function deleteFeedback(rowNumber) {
      if (!confirm('Bạn có chắc muốn xóa feedback này?')) return;
      showToast('Đang xóa...');
      try {
        const result = await apiPost('deleteFeedback', { rowNumber });
        if (result.success) { showToast('✅ Đã xóa!', 'success'); loadDashboard(); }
        else showToast('Lỗi: ' + result.message, 'error');
      } catch (e) { showToast('Lỗi: ' + e.message, 'error'); }
    }



    function openCreateModal() {
      document.getElementById('createShop').value = '';
      document.getElementById('createLink').value = '';
      document.getElementById('createNote').value = '';
      document.getElementById('createDeadline').value = new Date().toISOString().split('T')[0];
      document.getElementById('createStage').value = 'Feedback';
      document.getElementById('createTags').value = '';
      
      const sel = document.getElementById('createHost');
      sel.innerHTML = '<option value="">-- Chọn --</option>';
      cachedHosts.forEach(h => sel.innerHTML += \`<option value="\${h}">\${h}</option>\`);
      
      document.getElementById('createModal').classList.add('active');
    }

    async function submitCreate() {
      const fb = {
        shop: document.getElementById('createShop').value.trim(),
        host: document.getElementById('createHost').value,
        note: document.getElementById('createNote').value.trim(),
        link: document.getElementById('createLink').value.trim(),
        stage: document.getElementById('createStage').value,
        deadline: document.getElementById('createDeadline').value,
        tags: document.getElementById('createTags').value
      };
      
      if (!fb.shop || !fb.host || !fb.note) { showToast('Điền đủ thông tin bắt buộc', 'error'); return; }
      
      showToast('Đang tạo...');
      try {
        const result = await apiPost('createFeedback', { feedback: fb });
        if (result.success) { showToast('✅ Tạo thành công!', 'success'); closeModal('createModal'); loadDashboard(); }
        else showToast('Lỗi: ' + result.message, 'error');
      } catch (e) { showToast('Lỗi: ' + e.message, 'error'); }
    }

    function openEditModal(rowNumber) {
      const item = allFeedback.find(r => r.rowNumber === rowNumber);
      if (!item) { showToast('Không tìm thấy', 'error'); return; }
      
      document.getElementById('editRowNumber').value = rowNumber;
      document.getElementById('editShop').value = item.shop || '';
      document.getElementById('editLink').value = item.link || '';
      document.getElementById('editNote').value = item.note || item.message || '';
      document.getElementById('editStage').value = item.stage || 'Feedback';
      document.getElementById('editDeadline').value = item.deadline || '';
      document.getElementById('editTags').value = item.tags || '';
      
      const sel = document.getElementById('editHost');
      sel.innerHTML = '';
      cachedHosts.forEach(h => sel.innerHTML += \`<option value="\${h}" \${h === item.host ? 'selected' : ''}>\${h}</option>\`);
      
      // Disable all inputs by default (View Mode)
      setFormDisabled(true);
      
      // RESET: Show Edit button, hide Save button
      var btnEdit = document.getElementById('btnEnableEdit');
      var btnSave = document.getElementById('btnSaveEdit');
      if (btnEdit) btnEdit.classList.remove('hidden');
      if (btnSave) btnSave.classList.add('hidden');
      
      // Update Title
      document.querySelector('#editModal h3').textContent = '� Chi tiết Feedback';
      
      // Load Comments
      currentCommentRow = rowNumber;
      currentCommentImage = null; // Reset image
      document.getElementById('commentsList').innerHTML = '<div style="text-align:center; color:var(--gray); padding:30px;">Đang tải...</div>';
      document.getElementById('newCommentText').value = '';
      document.getElementById('commentImagePreview').style.display = 'none';
      
      // Add paste event listener for images
      const textarea = document.getElementById('newCommentText');
      textarea.onpaste = handleCommentPaste;
      
      loadComments(rowNumber);
      
      document.getElementById('editModal').classList.add('active');
    }
    
    function enableEditMode() {
      setFormDisabled(false);
      var btnEdit = document.getElementById('btnEnableEdit');
      var btnSave = document.getElementById('btnSaveEdit');
      if (btnEdit) btnEdit.classList.add('hidden');
      if (btnSave) btnSave.classList.remove('hidden');
      document.querySelector('#editModal h3').textContent = '✏️ Chỉnh sửa Feedback';
    }
    
    function setFormDisabled(disabled) {
      const inputs = document.querySelectorAll('#editModeForm input, #editModeForm select, #editModeForm textarea');
      inputs.forEach(el => el.disabled = disabled);
    }
    
    function viewDetail(rowNumber) {
      openEditModal(rowNumber);
    }

    async function submitEdit() {
      const rowNumber = parseInt(document.getElementById('editRowNumber').value);
      const updates = {
        shop: document.getElementById('editShop').value.trim(),
        host: document.getElementById('editHost').value,
        note: document.getElementById('editNote').value.trim(),
        link: document.getElementById('editLink').value.trim(),
        stage: document.getElementById('editStage').value,
        deadline: document.getElementById('editDeadline').value,
        tags: document.getElementById('editTags').value
      };
      
      showToast('Đang lưu...');
      try {
        const result = await apiPost('updateFeedback', { rowNumber, updates });
        if (result.success) { 
          showToast('✅ Đã lưu!', 'success'); 
          closeModal('editModal'); 
          applyFilter(true, true); // Reload, re-apply filters, preserve page
        }
        else showToast('Lỗi: ' + result.message, 'error');
      } catch (e) { showToast('Lỗi: ' + e.message, 'error'); }
    }

    // ==================== COMMENTS ====================
    let currentCommentRow = null;
    let currentImageNote = ''; // Store Image_note ID

    async function loadComments(rowNumber) {
      // Get current feedback item to extract imageNote
      const item = allFeedback.find(r => r.rowNumber === rowNumber);
      currentImageNote = (item && (item.imageNote || item.imageId)) || '';
      
      try {
        const result = await apiPost('getComments', { rowNumber });
        if (result.success) {
          renderComments(result.comments || []);
        } else {
          document.getElementById('commentsList').innerHTML = '<div style="text-align:center; color:var(--danger); padding:20px;">Lỗi tải comments</div>';
        }
      } catch (e) {
        document.getElementById('commentsList').innerHTML = '<div style="text-align:center; color:var(--danger); padding:20px;">Lỗi: ' + e.message + '</div>';
      }
    }

    function renderComments(comments) {
      let html = '';
      
      // Show Image_note first if exists (Telegram file_id)
      if (currentImageNote) {
        html += '<div id="telegramImageContainer" style="padding:10px 0; border-bottom:1px solid var(--border);">' +
          '<div style="display:flex; align-items:center; justify-content:center; background:#f9fafb; border-radius:8px; overflow:hidden; cursor:pointer;">' +
            '<div style="color:var(--gray); padding:40px;">Đang tải ảnh...</div>' +
          '</div>' +
        '</div>';
      }
      
      // Show comments
      if (comments.length === 0) {
        html += '<div style="text-align:center; color:var(--gray); padding:30px;">Chưa có comment nào</div>';
      } else {
        html += comments.map(function(c, idx) {
          let commentText = c.text || '';
          let imageData = null;
          
          // Check if comment contains image (base64 or URL)
          if (commentText.includes('[IMAGE]')) {
            const parts = commentText.split('[IMAGE]');
            commentText = parts[0];
            imageData = parts[1];
          }
          
          const imgId = 'commentImg' + idx;
          
          return '<div class="comment-item" style="padding:10px 0; border-bottom:1px solid var(--border);">' +
            '<div style="display:flex; justify-content:space-between; font-size:11px; color:var(--gray); margin-bottom: 10px;">' +
              '<span style="color: #F30; font-weight: bold; display:flex; align-items:center; gap:.25rem;"><svg width="12" height="12" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"> <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /> </svg>' + (c.author || 'User') + '</span>' +
              '<div style="display:flex; gap:8px; align-items:center;">' +
                '<span>' + (c.time || '') + '</span>' +
                '<button onclick="deleteComment(' + idx + ')" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:14px; padding:0; line-height:1;" title="Xoa">\u00d7</button>' +
              '</div>' +
            '</div>' +
            (imageData ? '<div style="margin-bottom:8px;"><img id="' + imgId + '" src="' + escapeHtml(imageData) + '" style="max-width:200px; border-radius:8px; cursor:pointer;"></div>' : '') +
            '<div style="font-size:13px; white-space: pre-wrap; word-break: break-word;">' + escapeHtml(commentText) + '</div>' +
          '</div>';
        }).join('');
      }
      
      document.getElementById('commentsList').innerHTML = html;
      
      // Add click handlers for images
      if (comments.length > 0) {
        comments.forEach(function(c, idx) {
          if (c.text && c.text.includes('[IMAGE]')) {
            const imgEl = document.getElementById('commentImg' + idx);
            if (imgEl) {
              const imageUrl = c.text.split('[IMAGE]')[1];
              imgEl.onclick = function() { openImageLightbox(imageUrl); };
            }
          }
        });
      }
      
      // Load Telegram image asynchronously AFTER setting innerHTML
      if (currentImageNote) {
        loadTelegramImage(currentImageNote);
      }
    }

    async function loadTelegramImage(fileId) {
      const container = document.getElementById('telegramImageContainer');
      if (!container) return;
      
      // Show loading spinner
      container.innerHTML = 
        '<div style="display:flex; justify-content:center; align-items:center; padding:40px; background:#f9fafb; border-radius:8px;">' +
          '<span class="spinner"></span>' +
        '</div>';
      
      try {
        const result = await apiGet('telegram-image', { fileId: fileId });
        
        if (result.success && result.url) {
          container.innerHTML = '<img id="feedbackImage" src="' + result.url + '" style="max-width:200px; border-radius:8px; cursor:pointer;">';
          
          const img = document.getElementById('feedbackImage');
          if (img) {
            img.onclick = function() { openImageLightbox(result.url); };
          }
        } else {
          container.innerHTML = '<div style="color:var(--danger); padding:10px;">Khong the tai anh</div>';
        }
      } catch (e) {
        container.innerHTML = '<div style="color:var(--danger); padding:10px;">Loi: ' + e.message + '</div>';
      }
    }
    
    function openImageLightbox(imageUrl) {
      // Create lightbox overlay
      const overlay = document.createElement('div');
      overlay.id = 'imageLightbox';
      overlay.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.9); z-index:9999; display:flex; align-items:center; justify-content:center; cursor:zoom-out;';
      
      const img = document.createElement('img');
      img.src = imageUrl;
      img.style.cssText = 'max-width:90%; max-height:90vh; border-radius:8px; box-shadow:0 8px 32px rgba(0,0,0,0.5);';
      
      overlay.appendChild(img);
      overlay.onclick = function() {
        document.body.removeChild(overlay);
      };
      
      document.body.appendChild(overlay);
    }

    // Image paste handling
    let currentCommentImage = null;

    function handleCommentPaste(e) {
      const items = (e.clipboardData || e.originalEvent.clipboardData).items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();
          const blob = items[i].getAsFile();
          const reader = new FileReader();
          reader.onload = function(event) {
            currentCommentImage = event.target.result;
            document.getElementById('commentPreviewImg').src = currentCommentImage;
            document.getElementById('commentImagePreview').style.display = 'block';
          };
          reader.readAsDataURL(blob);
          break;
        }
      }
    }

    function removeCommentImage() {
      currentCommentImage = null;
      document.getElementById('commentImagePreview').style.display = 'none';
    }

    async function addNewComment() {
      if (!currentCommentRow) return;
      
      const text = document.getElementById('newCommentText').value.trim();
      let commentContent = text;
      
      // Upload image to R2 if pasted
      if (currentCommentImage) {
        showToast('Đang upload ảnh...');
        try {
          const uploadResult = await apiPost('upload-image', { imageData: currentCommentImage });
          if (uploadResult.success) {
            commentContent = text + '\\n[IMAGE]' + uploadResult.url;
          } else {
            showToast('Lỗi upload ảnh: ' + uploadResult.message, 'error');
            return;
          }
        } catch (e) {
          showToast('Lỗi upload ảnh: ' + e.message, 'error');
          return;
        }
      }
      
      if (!commentContent || commentContent === '\\n[IMAGE]') { 
        showToast('Nhập nội dung comment', 'error'); 
        return; 
      }
      
      showToast('Đang thêm...');
      try {
        const result = await apiPost('addComment', { rowNumber: currentCommentRow, commentText: commentContent });
        if (result.success) {
          showToast('✅ Đã thêm comment!', 'success');
          document.getElementById('newCommentText').value = '';
          removeCommentImage();
          renderComments(result.comments || []);
        } else {
          showToast('Lỗi: ' + result.message, 'error');
        }
      } catch (e) {
        showToast('Lỗi: ' + e.message, 'error');
      }
    }

    async function deleteComment(commentIndex) {
      if (!currentCommentRow) return;
      if (!confirm('Xóa comment này?')) return;

      showToast('Đang xóa...');
      try {
        const result = await apiPost('deleteComment', { rowNumber: currentCommentRow, commentIndex: commentIndex });
        if (result.success) {
          showToast('Đã xóa comment!', 'success');
          renderComments(result.comments || []);
        } else {
          showToast('Lỗi: ' + result.message, 'error');
        }
      } catch (e) {
        showToast('Lỗi: ' + e.message, 'error');
      }
    }


    function getStageClass(s) { if (!s) return ''; if (s.includes('Done')) return 'stage-done'; if (s.includes('Feedback')) return 'stage-feedback'; if (s.includes('Pending')) return 'stage-pending'; if (s.includes('báo')) return 'stage-dabaokhach'; return ''; }
    function escapeHtml(t) { if (!t) return ''; const d = document.createElement('div'); d.textContent = t; return d.innerHTML.replace(/"/g, '&quot;'); }
    function showToast(msg, type = '') { const t = document.getElementById('toast'); t.textContent = msg; t.className = 'toast show ' + type; setTimeout(() => t.classList.remove('show'), 2500); }
    
    function closeModal(modalId) {
      document.getElementById(modalId).classList.remove('active');
      
      // Reset edit/save buttons when closing editModal
      if (modalId === 'editModal') {
        var btnEdit = document.getElementById('btnEnableEdit');
        var btnSave = document.getElementById('btnSaveEdit');
        if (btnEdit) btnEdit.classList.remove('hidden');
        if (btnSave) btnSave.classList.add('hidden');
      }
    }
    
    function updateRefreshTime() { document.getElementById('refreshInfo').textContent = new Date().toLocaleString('vi-VN'); }
    function copyLink(link, btn) {
      navigator.clipboard.writeText(link).then(() => {
        const originalText = btn.innerHTML;
        btn.innerHTML = '✅ Copied!';
        btn.classList.add('copied');
        setTimeout(() => { btn.innerHTML = originalText; btn.classList.remove('copied'); }, 1500);
      }).catch(() => showToast('Không thể copy', 'error'));
    }

    let debounceTimer;
    function debounceFilter() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => applyFilter(false), 150); // Fast client-side filter
    }

    // ==================== GUIDES SECTION ====================
    let allGuides = [];
    let groupedGuides = {};
    let guidesLoaded = false;

    function switchTab(tab) {
      currentTab = tab; // Track current tab for state persistence
      document.querySelectorAll('.main-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      if (tab === 'feedback') {
        document.querySelector('.main-tab:nth-child(1)').classList.add('active');
        document.getElementById('feedbackTab').classList.add('active');
      } else if (tab === 'guides') {
        document.querySelector('.main-tab:nth-child(2)').classList.add('active');
        document.getElementById('guidesTab').classList.add('active');
        if (!guidesLoaded) loadGuides();
      } else if (tab === 'history') {
        document.querySelector('.main-tab:nth-child(3)').classList.add('active');
        document.getElementById('historyTab').classList.add('active');
        loadHistory();
      }
      saveState();
    }

    function refreshHistory() {
      historyLoaded = false;
      loadHistory();
    }

    let historyLoaded = false;
    let allHistory = [];

    async function loadHistory() {
      try {
        const result = await apiGet('getHistory');
        if (result && result.success) {
          allHistory = result.history || [];
          historyLoaded = true;
          renderHistory();
        } else {
          document.getElementById('historyTableBody').innerHTML = '<tr><td colspan="3" style="text-align:center;padding:30px;color:var(--danger);">Lỗi tải dữ liệu</td></tr>';
        }
      } catch (error) {
        document.getElementById('historyTableBody').innerHTML = '<tr><td colspan="3" style="text-align:center;padding:30px;color:var(--danger);">Lỗi: ' + error.message + '</td></tr>';
      }
    }

    function renderHistory() {
      if (allHistory.length === 0) {
        document.getElementById('historyTableBody').innerHTML = '<tr><td colspan="3" style="text-align:center;padding:30px;color:var(--gray);">Không có lịch sử</td></tr>';
        return;
      }
      document.getElementById('historyTableBody').innerHTML = allHistory.map(function(row) {
        return '<tr>' +
          '<td style="font-size: 11px;">' + (row.time || '-') + '</td>' +
          '<td><span class="stage-badge ' + getActionClass(row.action) + '">' + (row.action || '-') + '</span></td>' +
          '<td>' + (row.content || '-') + '</td>' +
        '</tr>';
      }).join('');
    }

    function getActionClass(action) {
      if (!action) return '';
      if (action.includes('CREATE')) return 'stage-done';
      if (action.includes('UPDATE')) return 'stage-feedback';
      if (action.includes('DELETE')) return 'stage-dabaokhach';
      return 'stage-pending';
    }

    async function loadGuides() {
      try {
        const result = await apiGet('getGuidesData');
        if (result && result.success) {
          allGuides = result.guides || [];
          groupedGuides = result.groupedGuides || {};
          guidesLoaded = true;
          renderGuides();
        } else {
          document.getElementById('guidesContainer').innerHTML = '<div style="text-align:center;padding:40px;color:var(--danger);">Lỗi tải dữ liệu</div>';
        }
      } catch (error) {
        document.getElementById('guidesContainer').innerHTML = '<div style="text-align:center;padding:40px;color:var(--danger);">Lỗi: ' + error.message + '</div>';
      }
    }

    function renderGuides(filteredData = null) {
      const data = filteredData || groupedGuides;
      const container = document.getElementById('guidesContainer');
      
      if (Object.keys(data).length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--gray);">Không có dữ liệu</div>';
        return;
      }

      const typeOrder = ['Hướng dẫn', 'Tool', 'Web', 'Multilanguage F1GenZ'];
      const typeIcons = {
        'Hướng dẫn': '📖',
        'Tool': '🔧',
        'Web': '🌐',
        'Multilanguage F1GenZ': '🌍'
      };

      let html = '';
      typeOrder.forEach(type => {
        if (!data[type] || data[type].length === 0) return;
        
        html += \`
          <div class="guide-group">
            <div class="guide-group-title">\${typeIcons[type] || '📄'} \${type} (\${data[type].length})</div>
            <div class="guides-grid">
        \`;
        
        data[type].forEach(guide => {
          html += \`
            <div class="guide-card">
              <div class="guide-info">
                \${guide.link ? \`<a href="\${guide.link}" target="_blank" class="guide-title-link" title="\${escapeHtml(guide.template)}">\${escapeHtml(guide.template)}</a>\` : \`<div class="guide-title" title="\${escapeHtml(guide.template)}">\${escapeHtml(guide.template)}</div>\`}
                <div class="guide-links">
                  \${guide.link ? \`<button class="guide-link copy" onclick="copyLink('\${guide.link}', this)">📋 Copy</button>\` : ''}
                </div>
              </div>
              <div class="guide-actions">
                <button class="guide-action-btn edit" onclick="openEditGuideModal(\${guide.rowNumber})">⚙️</button>
                <button class="guide-action-btn delete" onclick="deleteGuide(\${guide.rowNumber})">🗑️</button>
              </div>
            </div>
          \`;
        });
        
        html += '</div></div>';
      });

      // Handle any other types not in typeOrder
      Object.keys(data).forEach(type => {
        if (typeOrder.includes(type) || !data[type] || data[type].length === 0) return;
        
        html += \`
          <div class="guide-group">
            <div class="guide-group-title">📄 \${type} (\${data[type].length})</div>
            <div class="guides-grid">
        \`;
        
        data[type].forEach(guide => {
          html += \`
            <div class="guide-card">
              <div class="guide-icon">\${typeIcons[type] || '📄'}</div>
              <div class="guide-info">
                \${guide.link ? \`<a href="\${guide.link}" target="_blank" class="guide-title-link" title="\${escapeHtml(guide.template)}">\${escapeHtml(guide.template)}</a>\` : \`<div class="guide-title" title="\${escapeHtml(guide.template)}">\${escapeHtml(guide.template)}</div>\`}
                <div class="guide-links">
                  \${guide.link ? \`<button class="guide-link copy" onclick="copyLink('\${guide.link}', this)">📋 Copy</button>\` : ''}
                </div>
              </div>
              <div class="guide-actions">
                <button class="guide-action-btn edit" onclick="openEditGuideModal(\${guide.rowNumber})">⚙️</button>
                <button class="guide-action-btn delete" onclick="deleteGuide(\${guide.rowNumber})">🗑️</button>
              </div>
            </div>
          \`;
        });
        
        html += '</div></div>';
      });

      container.innerHTML = html;
    }

    function filterGuides() {
      const search = document.getElementById('guideSearchInput').value.toLowerCase().trim();
      
      if (!search) {
        renderGuides();
        return;
      }

      const filtered = {};
      Object.keys(groupedGuides).forEach(type => {
        const matches = groupedGuides[type].filter(g => 
          g.template.toLowerCase().includes(search) || 
          g.type.toLowerCase().includes(search)
        );
        if (matches.length > 0) filtered[type] = matches;
      });

      renderGuides(filtered);
    }

    // ==================== GUIDES CRUD ====================
    function openCreateGuideModal() {
      document.getElementById('createGuideType').value = 'Hướng dẫn';
      document.getElementById('createGuideTemplate').value = '';
      document.getElementById('createGuideLink').value = '';
      document.getElementById('createGuideModal').classList.add('active');
    }

    async function submitCreateGuide() {
      const guide = {
        type: document.getElementById('createGuideType').value,
        template: document.getElementById('createGuideTemplate').value.trim(),
        link: document.getElementById('createGuideLink').value.trim(),
        app: ''
      };
      
      if (!guide.template) { showToast('Điền tên template', 'error'); return; }
      
      showToast('Đang tạo...');
      try {
        const result = await apiPost('createGuide', { guide });
        if (result.success) { 
          showToast('✅ Tạo thành công!', 'success'); 
          closeModal('createGuideModal'); 
          guidesLoaded = false;
          loadGuides(); 
        } else showToast('Lỗi: ' + result.message, 'error');
      } catch (e) { showToast('Lỗi: ' + e.message, 'error'); }
    }

    function openEditGuideModal(rowNumber) {
      const guide = allGuides.find(g => g.rowNumber === rowNumber);
      if (!guide) { showToast('Không tìm thấy', 'error'); return; }
      
      document.getElementById('editGuideRowNumber').value = rowNumber;
      document.getElementById('editGuideType').value = guide.type || 'Hướng dẫn';
      document.getElementById('editGuideTemplate').value = guide.template || '';
      document.getElementById('editGuideLink').value = guide.link || '';
      document.getElementById('editGuideModal').classList.add('active');
    }

    async function submitEditGuide() {
      const rowNumber = parseInt(document.getElementById('editGuideRowNumber').value);
      const updates = {
        type: document.getElementById('editGuideType').value,
        template: document.getElementById('editGuideTemplate').value.trim(),
        link: document.getElementById('editGuideLink').value.trim(),
        app: ''
      };
      
      if (!updates.template) { showToast('Điền tên template', 'error'); return; }
      
      showToast('Đang lưu...');
      try {
        const result = await apiPost('updateGuide', { rowNumber, updates });
        if (result.success) { 
          showToast('✅ Đã lưu!', 'success'); 
          closeModal('editGuideModal'); 
          guidesLoaded = false;
          loadGuides(); 
        } else showToast('Lỗi: ' + result.message, 'error');
      } catch (e) { showToast('Lỗi: ' + e.message, 'error'); }
    }

    async function deleteGuide(rowNumber) {
      if (!confirm('Bạn có chắc muốn xóa hướng dẫn này?')) return;
      showToast('Đang xóa...');
      try {
        const result = await apiPost('deleteGuide', { rowNumber });
        if (result.success) { 
          showToast('✅ Đã xóa!', 'success'); 
          guidesLoaded = false;
          loadGuides(); 
        } else showToast('Lỗi: ' + result.message, 'error');
      } catch (e) { showToast('Lỗi: ' + e.message, 'error'); }
    }

    loadDashboard().then(() => {
      applyFilter();
    });
    document.getElementById('searchInput').addEventListener('keypress', e => { if (e.key === 'Enter') applyFilter(); });
    document.querySelectorAll('.modal-overlay').forEach(m => m.addEventListener('click', function(e) { if (e.target === this) this.classList.remove('active'); }));
    // Removed auto-refresh that was resetting filters
    // setInterval(loadDashboard, 5 * 60 * 1000);
  </script>
</body>
</html>`;

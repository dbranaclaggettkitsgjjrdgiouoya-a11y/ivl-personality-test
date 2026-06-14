/**
 * Cloudflare Pages Function - API 后端
 * 处理 /api/feedback 和 /api/completion 和 /api/stats
 * 数据存储在 Cloudflare KV (IVL_DATA)
 */

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/', '');

  // CORS 头
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    // 从 KV 加载数据
    const raw = await env.IVL_DATA.get('feedbacks') || '[]';
    const rawCompletions = await env.IVL_DATA.get('completions') || '[]';
    let feedbacks = JSON.parse(raw);
    let completions = JSON.parse(rawCompletions);

    // 路由分发
    if (request.method === 'GET' && path === 'feedback') {
      feedbacks.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return new Response(JSON.stringify(feedbacks), { headers });
    }

    if (request.method === 'POST' && path === 'feedback') {
      const body = await request.json();
      const fb = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        nickname: (body.nickname || '匿名用户').slice(0, 20),
        message: (body.message || '').slice(0, 500),
        typeName: body.typeName || '',
        matchPlayer: body.matchPlayer || '',
        timestamp: new Date().toISOString()
      };
      feedbacks.unshift(fb);
      feedbacks = feedbacks.slice(0, 500);
      await env.IVL_DATA.put('feedbacks', JSON.stringify(feedbacks));
      return new Response(JSON.stringify({ success: true, id: fb.id }), { status: 201, headers });
    }

    if (request.method === 'GET' && path === 'completions') {
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      const todayCount = completions.filter(d => (d.timestamp || '').startsWith(today)).length;
      const hourly = {};
      for (let h = 0; h < 24; h++) hourly[String(h).padStart(2, '0')] = 0;
      completions.filter(d => (d.timestamp || '').startsWith(today))
        .forEach(d => { const h = d.timestamp.slice(11, 13); if (hourly[h] !== undefined) hourly[h]++; });
      const daily = {};
      for (let i = 6; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate() - i); daily[d.toISOString().slice(0, 10)] = 0; }
      completions.forEach(d => { const day = (d.timestamp || '').slice(0, 10); if (daily[day] !== undefined) daily[day]++; });
      const playerDist = {};
      completions.forEach(d => { const p = d.matchPlayer || '未知'; playerDist[p] = (playerDist[p] || 0) + 1; });
      return new Response(JSON.stringify({ total: completions.length, todayCount, hourly, daily, playerDist }), { headers });
    }

    if (request.method === 'POST' && path === 'completion') {
      const body = await request.json();
      completions.push({
        timestamp: new Date().toISOString(),
        typeName: body.typeName || '',
        matchPlayer: body.matchPlayer || ''
      });
      completions = completions.slice(-2000);
      await env.IVL_DATA.put('completions', JSON.stringify(completions));
      return new Response(JSON.stringify({ success: true, total: completions.length }), { status: 201, headers });
    }

    if (request.method === 'POST' && path === 'feedback/clear') {
      await env.IVL_DATA.put('feedbacks', '[]');
      return new Response(JSON.stringify({ success: true }), { headers });
    }

    if (request.method === 'GET' && path === 'stats') {
      const today = new Date().toISOString().slice(0, 10);
      const todayCount = feedbacks.filter(f => (f.timestamp || '').startsWith(today)).length;
      const typeDist = {};
      feedbacks.forEach(f => { const t = f.typeName || '未知'; typeDist[t] = (typeDist[t] || 0) + 1; });
      return new Response(JSON.stringify({ total: feedbacks.length, today: todayCount, typeDistribution: typeDist, completionTotal: completions.length }), { headers });
    }

    return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}

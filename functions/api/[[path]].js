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

    // ---- 题目管理 ----
    if (request.method === 'GET' && path === 'questions') {
      const qraw = await env.IVL_DATA.get('questions');
      const questions = qraw ? JSON.parse(qraw) : getDefaultQuestions();
      return new Response(JSON.stringify(questions), { headers });
    }

    if (request.method === 'POST' && path === 'questions') {
      const body = await request.json();
      const questions = body.questions || body;
      await env.IVL_DATA.put('questions', JSON.stringify(questions));
      return new Response(JSON.stringify({ success: true, count: questions.length }), { status: 201, headers });
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

function getDefaultQuestions() {
  return [
    {"id":1,"title":"当队伍陷入绝境，而你必须四抓，你会？","options":[{"key":"A","text":"相信版本强势，版本就是一切！","scores":{}},{"key":"B","text":"相信绝活，不要小看我和TA的羁绊啊！","scores":{"aggression":1}}]},
    {"id":2,"title":"你更认可？","options":[{"key":"A","text":"年少成名，老将不死！","scores":{"achievement":1}},{"key":"B","text":"青春风暴，未来可期！","scores":{"achievement":0}}]},
    {"id":3,"title":"你认为什么更能证明你的实力？","options":[{"key":"A","text":"客观数据，六边形战士！","scores":{}},{"key":"B","text":"荣誉大于一切！","scores":{"tactical":1}}]},
    {"id":4,"title":"当你被遛了2分钟，才把求生挂上椅，你更倾向于？","options":[{"key":"A","text":"守椅或者打拦截，先保平再说","scores":{}},{"key":"B","text":"直接出去管密码机，只要我击倒得够快，就不用守椅","scores":{"aggression":1}}]},
    {"id":5,"title":"你更喜欢哪个季节？","options":[{"key":"A","text":"春天","scores":{}},{"key":"B","text":"夏天","scores":{}},{"key":"C","text":"秋天","scores":{}},{"key":"D","text":"随便","scores":{"flexibility":1}}]},
    {"id":6,"title":"你更擅长哪类监管？","options":[{"key":"A","text":"追击类","scores":{}},{"key":"B","text":"控场类","scores":{"tactical":1}},{"key":"C","text":"无所谓","scores":{"tactical":0.5}}]},
    {"id":7,"title":"你更倾向于？","options":[{"key":"A","text":"极致的手法","scores":{}},{"key":"B","text":"无懈的思路","scores":{"tactical":1}},{"key":"C","text":"两者兼有","scores":{"tactical":0.5}}]},
    {"id":8,"title":"在别人眼里，你是？","options":[{"key":"A","text":"天赋型选手","scores":{"selfCognition":1}},{"key":"B","text":"努力型选手","scores":{"selfCognition":0}},{"key":"C","text":"天赋与努力并存","scores":{"selfCognition":0.5}}]},
    {"id":9,"title":"现在有一波很难打出来的操作，但是打出来就赢，你会？","options":[{"key":"A","text":"不管了，直接冲！","scores":{"aggression":1}},{"key":"B","text":"算了，稳扎稳打","scores":{}}]},
    {"id":10,"title":"赛前喊话，你属于哪种类型？","options":[{"key":"A","text":"谦虚型","scores":{"preMatch":0}},{"key":"B","text":"玩梗型","scores":{"preMatch":0.5}},{"key":"C","text":"降维打击型","scores":{"preMatch":1}}]}
  ];
}

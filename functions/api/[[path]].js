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
      const dimensions = extractDimensions(questions);
      return new Response(JSON.stringify({ questions, dimensions }), { headers });
    }

    if (request.method === 'POST' && path === 'questions') {
      const body = await request.json();
      const questions = body.questions || body;
      await env.IVL_DATA.put('questions', JSON.stringify(questions));
      const dimensions = extractDimensions(questions);
      return new Response(JSON.stringify({ success: true, count: questions.length, dimensions }), { status: 201, headers });
    }

    // ---- 选手管理 ----
    if (request.method === 'GET' && path === 'players') {
      const praw = await env.IVL_DATA.get('players');
      const players = praw ? JSON.parse(praw) : getDefaultPlayers();
      return new Response(JSON.stringify(players), { headers });
    }

    if (request.method === 'POST' && path === 'players') {
      const body = await request.json();
      const players = body.players || body;
      await env.IVL_DATA.put('players', JSON.stringify(players));
      return new Response(JSON.stringify({ success: true, count: players.length }), { status: 201, headers });
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

function extractDimensions(questions) {
  const dimMap = {};
  const dimKeys = ['aggression','tactical','achievement','selfCognition','flexibility','preMatch'];
  const dimLabels = {aggression:'进攻性',tactical:'战术偏好',achievement:'成就取向',selfCognition:'自我认知',flexibility:'灵活性',preMatch:'赛前姿态'};
  const dimIcons = {aggression:'⚔️',tactical:'♟️',achievement:'🏆',selfCognition:'🪞',flexibility:'🍃',preMatch:'🔥'};
  const dimRadar = {aggression:'追击本能',tactical:'控场博弈',achievement:'巅峰渴望',selfCognition:'天赋定位',flexibility:'应变力',preMatch:'喊话气场'};
  // 从题目中收集各维度最高分值
  dimKeys.forEach(k => { dimMap[k] = 0; });
  questions.forEach(q => {
    q.options.forEach(o => {
      if (o.scores) {
        Object.entries(o.scores).forEach(([dim, val]) => {
          if (dimMap[dim] !== undefined) dimMap[dim] = Math.max(dimMap[dim], val);
        });
      }
    });
  });
  // 计算每个维度的最大可能总分
  const dimMax = {};
  dimKeys.forEach(k => { dimMax[k] = 0; });
  questions.forEach(q => {
    q.options.forEach(o => {
      if (o.scores) {
        Object.entries(o.scores).forEach(([dim, val]) => {
          if (dimMax[dim] !== undefined && val > 0) {
            // 每道题一维最多计一次，取该维度在该选项的最大值
            dimMax[dim] += val;
          }
        });
      }
    });
  });
  // 简化：取默认max值，如果dimMax为0则用从questions中累积的值
  const defaults = {aggression:3,tactical:2,achievement:1,selfCognition:1,flexibility:1,preMatch:1};
  return dimKeys.map(k => ({
    key: k,
    label: dimLabels[k],
    radarLabel: dimRadar[k],
    icon: dimIcons[k],
    max: dimMax[k] > 0 ? Math.min(dimMax[k], defaults[k] || dimMax[k]) : (defaults[k] || 1),
    desc: ''
  })).filter(d => dimMap[d.key] > 0);
}

function getDefaultPlayers() {
  return [
    {"id":"qiyan","name":"祈颜","team":"GG","status":"现役","photo":"祈颜.png","answers":["B","A","A","B","D","B","A","B","B","A"],"intro":"祈颜长期处于监管者榜前，是一名绝活女巫玩家，之前曾达到过万分女巫。在2021 IVL 夏季赛中，帮助所在战队JHS获得仅有的三场胜利，他也拿下了全部三个「光明之星」。祈颜已于2023年5月29日从Reborn俱乐部转会至GG俱乐部，后租借给DOU5俱乐部。"},
    {"id":"menghuanxiaomi","name":"梦幻小弥","team":"DOU5","status":"现役","photo":"梦幻小弥.png","answers":["A","B","A","B","D","A","A","A","A","A"],"intro":"梦幻小弥，榜前知名监管者玩家。于2025 IVL 夏季赛前加入DOU5俱乐部担任队内的监管者选手。"},
    {"id":"dongxuan","name":"东玄","team":"FPX.ZQ","status":"现役","photo":"东玄.png","answers":["B","A","A","B","B","B","C","C","B","A"],"intro":"东玄，中国大陆赛区监管者阵营选手，擅长鹿头、红蝶、宿伞之魂、梦之女巫、红夫人等角色。20年夏季赛前加入DOU5俱乐部，2023秋季赛转会加入FPX.ZQ俱乐部。深渊的呼唤Ⅵ冠军、2022 IVL夏季赛总决赛冠军、IVL首位淘汰人数达到1700人的监管者选手、多次获得常规赛MVP及FMVP。"},
    {"id":"xinanzhimeng","name":"心安勿梦","team":"GG","status":"现役","photo":"心安勿梦.png","answers":["B","A","B","B","A","B","C","C","B","B"],"intro":"心安勿梦，曾常用名觉觉、睡觉觉，是一名榜前屠夫玩家，擅长破轮、雕刻家、26号守卫、红夫人、歌剧演员等角色，自IVL创建伊始便加入GG战队。深渊的呼唤Ⅳ冠军、深渊的呼唤Ⅶ冠军、多次IVL总决赛冠军及FMVP。"},
    {"id":"nianjin","name":"年锦","team":"Gr","status":"现役","photo":"年锦.png","answers":["B","B","A","B","D","C","C","C","A","B"],"intro":"年锦，中国大陆赛区监管者选手，擅长26号守卫、歌剧演员、红蝶等角色。2024 IVL秋季赛加入Gr。多次常规赛第一名，最佳新秀，常规赛MVP。"},
    {"id":"xiaocheng","name":"小程","team":"MRC","status":"现役","photo":"小程.png","answers":["A","A","A","B","C","B","B","B","B","B"],"intro":"小程，中国大陆赛区监管者选手，擅长女巫、时空之影、红夫人、红蝶等，梦之女巫绝活玩家。深渊的呼唤Ⅸ冠军、2024 IVL秋季赛总决赛冠军及FMVP。"},
    {"id":"bailu","name":"白露","team":"MRC","status":"现役","photo":"白露.png","answers":["B","B","A","B","C","C","C","C","A","B"],"intro":"白露，擅长歌剧演员、红蝶、跛脚羊，绝活红夫人。深渊的呼唤Ⅸ冠军、2025 IVL秋季赛总决赛冠军及FMVP、2025夏季赛最佳新秀。"},
    {"id":"peipei","name":"配配","team":"TE","status":"现役","photo":"配配.png","answers":["B","B","A","A","D","A","B","C","A","B"],"intro":"配配，擅长渔女、台球手、歌剧演员等。S1绝活渔女，深渊Ⅵ加入WL，2023 IVL夏季赛加入TE溯电子竞技俱乐部。"},
    {"id":"nienie","name":"捏捏","team":"WBG","status":"现役","photo":"捏捏.png","answers":["A","A","A","A","D","A","A","B","B","A"],"intro":"雪碧捏捏，擅长邦邦。曾任FTD监管者，2023年加入Gr，2025年转会WBG。多次冠军荣誉。"},
    {"id":"chongai","name":"宠爱","team":"Wolves","status":"现役","photo":"宠爱.png","answers":["B","A","B","B","D","A","C","C","A","B"],"intro":"宠爱，绝活小丑玩家，精通26号守卫、隐士、破轮、守夜人等。2023/2025 IVL总决赛冠军。多次MVP及年度震慑大师。"},
    {"id":"tuzhiming","name":"兔纸英明","team":"GW","status":"现役","photo":"兔纸英明.png","answers":["B","A","A","B","D","B","A","B","A","C"],"intro":"兔纸英明，擅长守夜人、歌剧演员、宿伞之魂等。深渊呼唤Ⅶ用宿伞之魂四抓惊艳观众。先后效力DOU5、Meow、GW。"},
    {"id":"yangmouren","name":"杨某人","team":"ZQ","status":"退役","photo":"杨某人.png","answers":["B","A","B","A","D","B","B","A","A","C"],"intro":"杨某人，擅长梦之女巫、渔女、红夫人、摄影师等。2020-2021夏/秋季赛冠军，最佳MVP监管者。信仰之光约瑟夫，曾两度创造赛场奇迹。"},
    {"id":"pipixian","name":"皮皮限","team":"Gr","status":"退役","photo":"皮皮限.png","answers":["A","A","B","A","A","C","C","C","B","A"],"intro":"皮皮限，第五人格元老选手。深渊Ⅰ亚军，加入Gr拿到三冠一亚。擅长26号守卫、梦之女巫、红蝶等。2024年正式退役。"},
    {"id":"pipixia","name":"皮皮虾","team":"GG","status":"现役","photo":"皮皮虾.png","answers":["A","A","B","A","A","A","C","C","B","A"],"intro":"皮皮虾，擅长26号守卫、小提琴家、雕刻家等。多个赛季S1邦邦，人屠双七阶。深渊Ⅳ FMVP，深渊Ⅳ/Ⅶ冠军。"},
    {"id":"yusheng","name":"鱼生","team":"ZQ","status":"退役","photo":"鱼生.png","answers":["A","A","B","A","D","A","B","C","B","A"],"intro":"鱼生，全名昏迹鱼生，擅长蜘蛛、杰克、26号守卫等追击型监管者。2020 IVL夏/秋季赛总决赛冠军，夏季赛FMVP。"},
    {"id":"aili","name":"爱丽","team":"WBG","status":"退役","photo":"爱丽.png","answers":["A","A","B","A","D","C","C","C","B","A"],"intro":"爱丽，又名艾利克斯，擅长破轮、雕刻家、歌剧演员等。深渊Ⅴ冠军及FMVP，2021 IVL夏/秋季赛冠军。三周年人气主播，四周年震慑大师。"},
    {"id":"zhenzhen9","name":"针针9","team":"ACT","status":"现役","photo":"针针9.png","answers":["B","A","A","A","D","B","A","A","B","A"],"intro":"针针9，擅长女巫、歌剧演员、时空之影角色。2025年2月加入ACT俱乐部。"}
  ];
}

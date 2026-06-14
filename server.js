/**
 * IVL监管者人格测试 - 简易后端服务
 * 用于接收留言反馈并提供管理查询
 *
 * 启动: npm start
 * 测试网站: http://localhost:3000
 * 管理后台: http://localhost:3000/admin
 */

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const FEEDBACK_FILE = path.join(DATA_DIR, 'feedback.json');
const COMPLETIONS_FILE = path.join(DATA_DIR, 'completions.json');

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 确保数据文件存在
if (!fs.existsSync(COMPLETIONS_FILE)) {
  fs.writeFileSync(COMPLETIONS_FILE, '[]', 'utf-8');
}

// 确保反馈文件存在
if (!fs.existsSync(FEEDBACK_FILE)) {
  fs.writeFileSync(FEEDBACK_FILE, '[]', 'utf-8');
}

// ==================== 中间件 ====================
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// 静态文件服务
app.use(express.static(__dirname));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// ==================== API路由 ====================

/**
 * GET /api/feedback
 * 获取所有留言（管理端用）
 */
app.get('/api/feedback', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(FEEDBACK_FILE, 'utf-8'));
    // 按时间倒序
    data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(data);
  } catch (err) {
    console.error('读取反馈失败:', err.message);
    res.status(500).json({ error: '读取数据失败' });
  }
});

/**
 * POST /api/feedback
 * 提交新留言
 */
app.post('/api/feedback', (req, res) => {
  try {
    const { nickname, message, typeName, matchPlayer, scores } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: '留言内容不能为空' });
    }

    const feedback = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      nickname: (nickname || '匿名用户').trim().slice(0, 20),
      message: message.trim().slice(0, 500),
      typeName: typeName || '',
      matchPlayer: matchPlayer || '',
      scores: scores || {},
      timestamp: new Date().toISOString()
    };

    const data = JSON.parse(fs.readFileSync(FEEDBACK_FILE, 'utf-8'));
    data.unshift(feedback);

    // 保留最近500条
    const trimmed = data.slice(0, 500);
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(trimmed, null, 2), 'utf-8');

    console.log(`[反馈] ${feedback.nickname} - "${feedback.message.slice(0, 30)}..."`);
    res.status(201).json({ success: true, id: feedback.id });
  } catch (err) {
    console.error('保存反馈失败:', err.message);
    res.status(500).json({ error: '保存失败' });
  }
});

/**
 * POST /api/feedback/clear
 * 清空所有留言
 */
app.post('/api/feedback/clear', (req, res) => {
  try {
    fs.writeFileSync(FEEDBACK_FILE, '[]', 'utf-8');
    console.log('[管理] 留言数据已清空');
    res.json({ success: true });
  } catch (err) {
    console.error('清空失败:', err.message);
    res.status(500).json({ error: '清空失败' });
  }
});

/**
 * GET /api/stats
 * 获取基本统计数据
 */
app.get('/api/stats', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(FEEDBACK_FILE, 'utf-8'));
    const today = new Date().toISOString().slice(0, 10);
    const todayCount = data.filter(f => (f.timestamp || '').startsWith(today)).length;

    // 统计类型分布
    const typeDist = {};
    data.forEach(f => {
      const t = f.typeName || '未知';
      typeDist[t] = (typeDist[t] || 0) + 1;
    });

    res.json({
      total: data.length,
      today: todayCount,
      typeDistribution: typeDist
    });
  } catch (err) {
    res.status(500).json({ error: '获取统计失败' });
  }
});

/**
 * POST /api/completion
 * 记录测试完成
 */
app.post('/api/completion', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(COMPLETIONS_FILE, 'utf-8'));
    data.push({
      timestamp: new Date().toISOString(),
      typeName: req.body.typeName || '',
      matchPlayer: req.body.matchPlayer || ''
    });
    const trimmed = data.slice(-2000);
    fs.writeFileSync(COMPLETIONS_FILE, JSON.stringify(trimmed), 'utf-8');
    res.status(201).json({ success: true, total: trimmed.length });
  } catch (err) {
    res.status(500).json({ error: '记录失败' });
  }
});

/**
 * GET /api/completions
 * 获取填写统计数据
 */
app.get('/api/completions', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(COMPLETIONS_FILE, 'utf-8'));
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    // 按小时统计今日
    const hourly = {};
    for (let h = 0; h < 24; h++) {
      hourly[String(h).padStart(2, '0')] = 0;
    }
    const todayData = data.filter(d => (d.timestamp || '').startsWith(today));
    todayData.forEach(d => {
      const h = d.timestamp.slice(11, 13);
      if (hourly[h] !== undefined) hourly[h]++;
    });

    // 按天统计近7天
    const daily = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      daily[d.toISOString().slice(0, 10)] = 0;
    }
    data.forEach(d => {
      const day = (d.timestamp || '').slice(0, 10);
      if (daily[day] !== undefined) daily[day]++;
    });

    // 选手匹配分布
    const playerDist = {};
    data.forEach(d => {
      const p = d.matchPlayer || '未知';
      playerDist[p] = (playerDist[p] || 0) + 1;
    });

    res.json({
      total: data.length,
      todayCount: todayData.length,
      hourly,
      daily,
      playerDist
    });
  } catch (err) {
    res.status(500).json({ error: '获取统计失败' });
  }
});

// ==================== 404处理 ====================
app.use((req, res) => {
  if (req.accepts('html')) {
    res.status(404).sendFile(path.join(__dirname, 'index.html'));
  } else {
    res.status(404).json({ error: 'Not Found' });
  }
});

// ==================== 启动 ====================
app.listen(PORT, () => {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  🎯 IVL监管者人格测试 - 服务器已启动   ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  测试网站:  http://localhost:${PORT}         ║`);
  console.log(`║  管理后台:  http://localhost:${PORT}/admin   ║`);
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
  console.log('💡 提示：关闭终端后服务将停止运行。');
  console.log('   测试网站本身为纯静态页面，可直接打开 index.html 使用。');
  console.log('   反馈功能需要启动此后端服务才能跨设备使用。');
});

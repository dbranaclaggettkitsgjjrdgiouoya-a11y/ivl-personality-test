/**
 * IVL监管者人格测试 - 主应用逻辑
 */
(function () {
  'use strict';

  // ==================== 应用状态 ====================
  const STATE = {
    currentQuestion: 0,
    answers: {},       // { questionId: optionKey }
    scores: null,      // 六维得分
    typeName: '',      // 生成的类型名
    bestMatch: null,   // 匹配的选手
    feedbacks: []      // 本地留言缓存
  };

  // ==================== DOM缓存 ====================
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const PAGES = {
    home: $('#page-home'),
    test: $('#page-test'),
    loading: $('#page-loading'),
    result: $('#page-result')
  };

  // ==================== 页面导航 ====================
  function showPage(pageId) {
    Object.values(PAGES).forEach(p => p && p.classList.remove('active'));
    const target = PAGES[pageId];
    if (target) target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ==================== 首页 ====================
  function initHomePage() {
    // 开始测试按钮
    $('#btn-start').addEventListener('click', () => {
      STATE.currentQuestion = 0;
      STATE.answers = {};
      STATE.scores = null;
      STATE.typeName = '';
      STATE.bestMatch = null;
      renderQuestion();
      showPage('test');
    });

    // 重新测试按钮
    $('#btn-restart').addEventListener('click', () => {
      STATE.currentQuestion = 0;
      STATE.answers = {};
      STATE.scores = null;
      STATE.typeName = '';
      STATE.bestMatch = null;
      renderQuestion();
      showPage('test');
    });

    // 分享按钮
    $('#btn-share-home').addEventListener('click', shareResult);

    // 更新首页统计数据
    updateHomeStats();
  }

  function updateHomeStats() {
    // 选手数量
    $('#stat-players').textContent = PLAYERS.length;
    // 类型数（基于规则）
    $('#stat-types').textContent = '30+';
  }

  // ==================== 测试页 ====================
  function renderQuestion() {
    const q = QUESTIONS[STATE.currentQuestion];
    if (!q) return;

    // 进度
    const progress = ((STATE.currentQuestion) / QUESTIONS.length * 100).toFixed(0);
    $('#progress-fill').style.width = progress + '%';
    $('#progress-text').textContent = `${STATE.currentQuestion + 1} / ${QUESTIONS.length}`;

    // 题目
    $('#question-number').textContent = `Q${q.id}`;
    $('#question-title').textContent = q.title;

    // 选项
    const optionsContainer = $('#options-container');
    optionsContainer.innerHTML = '';

    q.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.innerHTML = `<span class="option-key">${opt.key}</span><span class="option-text">${opt.text}</span>`;
      btn.addEventListener('click', () => selectOption(q.id, opt.key));
      // 入场动画延迟
      btn.style.animationDelay = (idx * 0.1) + 's';
      optionsContainer.appendChild(btn);
    });

    // 上一题按钮
    $('#btn-prev').style.display = STATE.currentQuestion > 0 ? 'flex' : 'none';
    // 按钮文字
    const isLast = STATE.currentQuestion === QUESTIONS.length - 1;
    $('#btn-next').textContent = isLast ? '查看结果' : '下一题';
    $('#btn-next').disabled = !STATE.answers[q.id];
    $('#btn-next').style.opacity = STATE.answers[q.id] ? '1' : '0.5';
  }

  function selectOption(questionId, optionKey) {
    STATE.answers[questionId] = optionKey;

    // 更新选项高亮
    $$('.option-btn').forEach(btn => btn.classList.remove('selected'));
    const buttons = $$('.option-btn');
    buttons.forEach(btn => {
      if (btn.querySelector('.option-key').textContent === optionKey) {
        btn.classList.add('selected');
      }
    });

    // 启用下一题按钮
    $('#btn-next').disabled = false;
    $('#btn-next').style.opacity = '1';
  }

  $('#btn-next').addEventListener('click', () => {
    const q = QUESTIONS[STATE.currentQuestion];
    if (!STATE.answers[q.id]) return;

    if (STATE.currentQuestion < QUESTIONS.length - 1) {
      STATE.currentQuestion++;
      renderQuestion();
    } else {
      // 完成所有题目，计算结果
      calculateResults();
      showPage('loading');
      startLoadingAnimation();
    }
  });

  $('#btn-prev').addEventListener('click', () => {
    if (STATE.currentQuestion > 0) {
      STATE.currentQuestion--;
      renderQuestion();
    }
  });

  // ==================== 计分逻辑 ====================
  function calculateResults() {
    const rawScores = {
      aggression: 0,
      tactical: 0,
      achievement: 0,
      selfCognition: 0,
      flexibility: 0,
      preMatch: 0
    };

    // 遍历所有答案
    for (const [qId, optKey] of Object.entries(STATE.answers)) {
      const question = QUESTIONS.find(q => q.id === parseInt(qId));
      if (!question) continue;

      const option = question.options.find(o => o.key === optKey);
      if (!option || !option.scores) continue;

      for (const [dim, val] of Object.entries(option.scores)) {
        if (rawScores[dim] !== undefined) {
          rawScores[dim] += val;
        }
      }
    }

    // 战术偏好上限2
    rawScores.tactical = Math.min(rawScores.tactical, 2);

    // 根据用户数据基础分，叠加随机偏移生成百分比（保证每次结果不同）
    STATE.scores = {};
    STATE.percentages = {};
    DIMENSIONS.forEach(dim => {
      const basePct = (rawScores[dim.key] / dim.max) * 100; // 0-100 基础值
      // 随机偏移 ±18%，确保每次测试结果都有变化
      const offset = (Math.random() - 0.5) * 36;
      let pct = Math.round(basePct + offset);
      // 限制在合理范围
      pct = Math.max(3, Math.min(97, pct));
      STATE.scores[dim.key] = rawScores[dim.key];
      STATE.percentages[dim.key] = pct;
    });

    STATE.typeName = generateTypeName(rawScores);
    // 构建答案数组（按题号顺序）
    const answerArray = QUESTIONS.map(q => STATE.answers[q.id] || '');
    STATE.bestMatch = findBestMatch(answerArray, rawScores);
  }

  // ==================== 加载动画 ====================
  function startLoadingAnimation() {
    const loadingTexts = [
      '正在分析你的监管者基因...',
      '匹配IVL选手数据库中...',
      '生成六维人格图谱...',
      '计算结果即将揭晓...'
    ];
    let idx = 0;
    const textEl = $('#loading-text');
    const barEl = $('#loading-bar-fill');
    let progress = 0;

    // 文字轮换
    const textInterval = setInterval(() => {
      idx = (idx + 1) % loadingTexts.length;
      textEl.textContent = loadingTexts[idx];
    }, 1000);

    // 进度条动画
    const barInterval = setInterval(() => {
      progress += 1.2;
      if (progress >= 100) progress = 100;
      barEl.style.width = progress + '%';
    }, 50);

    // 记录完成时间戳
    recordCompletion();

    // 5秒后显示结果
    setTimeout(() => {
      clearInterval(textInterval);
      clearInterval(barInterval);
      barEl.style.width = '100%';
      renderResult();
      showPage('result');
    }, 5000);
  }

  // ==================== 结果页 ====================
  function renderResult() {
    if (!STATE.scores || !STATE.bestMatch) return;

    // 显示类型名
    $('#result-type-name').textContent = STATE.typeName;

    // 绘制雷达图（使用百分比/100作为0-1值）
    const percentScores = {};
    DIMENSIONS.forEach(dim => {
      percentScores[dim.key] = (STATE.percentages[dim.key] || 0) / 100;
    });
    setTimeout(() => {
      const radar = new RadarChart('radar-canvas', {
        size: 480,
        levels: 5,
        maxValue: 1,
        labelFontSize: 14
      });
      radar.draw(percentScores, DIMENSIONS);
    }, 100);

    // 维度详情
    renderDimensionDetails();

    // 匹配选手
    renderPlayerCard(STATE.bestMatch);

    // 更新结果页分享按钮
    $('#btn-share-result').addEventListener('click', shareResult);

    // 初始化留言板
    initFeedbackForm();
  }

  function renderDimensionDetails() {
    const container = $('#dimension-details');
    container.innerHTML = '';

    DIMENSIONS.forEach(dim => {
      const pct = STATE.percentages[dim.key] || 0;
      const item = document.createElement('div');
      item.className = 'dimension-item';
      item.innerHTML = `
        <div class="dim-header">
          <span class="dim-icon">${dim.icon}</span>
          <span class="dim-label">${dim.label}</span>
          <span class="dim-value">${pct}%</span>
        </div>
        <div class="dim-bar-bg">
          <div class="dim-bar-fill" style="width: ${pct}%"></div>
        </div>
      `;
      container.appendChild(item);
    });
  }

  function renderPlayerCard(player) {
    const container = $('#player-card');
    const photoPath = player.photo ? player.photo : '';
    const photoHtml = photoPath
      ? `<img src="${photoPath}" alt="${player.name}" class="player-photo" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
         <div class="player-avatar-fallback" style="display:none;">
           <span>${player.name.charAt(0)}</span>
         </div>`
      : `<div class="player-avatar-fallback">
           <span>${player.name.charAt(0)}</span>
         </div>`;

    container.innerHTML = `
      <div class="player-avatar-wrapper">
        ${photoHtml}
      </div>
      <h3 class="player-name">${player.name}</h3>
      <p class="player-intro">${player.intro}</p>
    `;
  }

  // ==================== 分享功能 ====================
  function shareResult() {
    const shareText = `我在IVL监管者人格测试中测出——「${STATE.typeName}」！\n最相似的选手是：${STATE.bestMatch ? STATE.bestMatch.name : '???'}\n快来测测你跟哪位IVL监管最相似吧！`;

    if (navigator.share) {
      navigator.share({
        title: 'IVL监管者人格测试',
        text: shareText,
        url: window.location.href
      }).catch(() => {});
    } else {
      // 回退到复制链接
      copyToClipboard(shareText + '\n' + window.location.href);
    }
  }

  function copyToClipboard(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('已复制分享内容到剪贴板！');
      }).catch(() => {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showToast('已复制分享内容到剪贴板！');
    } catch (e) {
      showToast('复制失败，请手动复制');
    }
    document.body.removeChild(textarea);
  }

  // ==================== Toast提示 ====================
  function showToast(msg) {
    const toast = $('#toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }

  // ==================== 留言板 ====================
  function initFeedbackForm() {
    loadFeedbacks();

    $('#btn-submit-feedback').addEventListener('click', submitFeedback);
  }

  function submitFeedback() {
    const nickname = $('#feedback-nickname').value.trim() || '匿名用户';
    const message = $('#feedback-message').value.trim();

    if (!message) {
      showToast('请输入留言内容');
      return;
    }

    const feedback = {
      id: Date.now(),
      nickname: nickname,
      message: message,
      typeName: STATE.typeName,
      matchPlayer: STATE.bestMatch ? STATE.bestMatch.name : '',
      timestamp: new Date().toISOString(),
      scores: STATE.scores
    };

    // 保存到localStorage
    STATE.feedbacks.unshift(feedback);
    saveFeedbacks();

    // 尝试发送到后端
    sendFeedbackToServer(feedback);

    // 清空表单
    $('#feedback-nickname').value = '';
    $('#feedback-message').value = '';
    showToast('留言提交成功，感谢反馈！');
    loadFeedbacks();
  }

  function saveFeedbacks() {
    try {
      localStorage.setItem('ivl_test_feedbacks', JSON.stringify(STATE.feedbacks.slice(0, 50)));
    } catch (e) {
      // localStorage满了
    }
  }

  function loadFeedbacks() {
    try {
      const data = localStorage.getItem('ivl_test_feedbacks');
      STATE.feedbacks = data ? JSON.parse(data) : [];
    } catch (e) {
      STATE.feedbacks = [];
    }

    // 渲染近期留言
    const container = $('#feedback-list');
    const recent = STATE.feedbacks.slice(0, 5);
    container.innerHTML = recent.map(fb => `
      <div class="feedback-item">
        <div class="feedback-header">
          <span class="feedback-user">${escapeHtml(fb.nickname)}</span>
          <span class="feedback-meta">类型：${escapeHtml(fb.typeName)} | 匹配：${escapeHtml(fb.matchPlayer)}</span>
        </div>
        <div class="feedback-msg">${escapeHtml(fb.message)}</div>
        <div class="feedback-time">${formatDate(fb.timestamp)}</div>
      </div>
    `).join('') || '<p class="no-feedback">暂无留言，来做第一个留言的人吧！</p>';
  }

  function sendFeedbackToServer(feedback) {
    fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedback)
    }).catch(() => {
      // 后端不可用，静默失败，数据已在localStorage中
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatDate(isoStr) {
    const d = new Date(isoStr);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }

  // 绑定结果页的重测按钮（在页面加载时就绑定，因为按钮始终存在）
  function bindResultActions() {
    const restartBtn = $('#btn-restart-result');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        STATE.currentQuestion = 0;
        STATE.answers = {};
        STATE.scores = null;
        STATE.typeName = '';
        STATE.bestMatch = null;
        renderQuestion();
        showPage('test');
      });
    }

    const shareBtn = $('#btn-share-result');
    if (shareBtn) {
      shareBtn.addEventListener('click', shareResult);
    }
  }

  // ==================== 完成记录 ====================
  function recordCompletion() {
    try {
      const key = 'ivl_test_completions';
      const data = JSON.parse(localStorage.getItem(key) || '[]');
      data.push({
        timestamp: new Date().toISOString(),
        typeName: STATE.typeName || '',
        matchPlayer: STATE.bestMatch ? STATE.bestMatch.name : ''
      });
      // 保留最近1000条
      const trimmed = data.slice(-1000);
      localStorage.setItem(key, JSON.stringify(trimmed));
      // 同步到后端
      fetch('/api/completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trimmed[trimmed.length - 1])
      }).catch(() => {});
    } catch (e) {}
  }

  // ==================== 初始化 ====================
  function init() {
    bindResultActions();
    initHomePage();
    showPage('home');
  }

  // DOM加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

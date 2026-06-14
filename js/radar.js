/**
 * 六维雷达图绘制模块 - 纯Canvas实现，无外部依赖
 */
class RadarChart {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.options = Object.assign({
      size: 480,
      levels: 5,
      maxValue: 1,
      labelFontSize: 14,
      colors: {
        grid: 'rgba(0, 0, 0, 0.12)',
        gridFill: 'rgba(0, 0, 0, 0.02)',
        data: '#1a1a1a',
        dataFill: 'rgba(0, 0, 0, 0.06)',
        dot: '#1a1a1a',
        label: '#1a1a1a',
        levelText: 'rgba(0, 0, 0, 0.35)'
      }
    }, options);

    this.centerX = this.options.size / 2;
    this.centerY = this.options.size / 2;
    this.radius = this.options.size * 0.28;

    // 设置Canvas尺寸（适配高清屏）
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.options.size * dpr;
    this.canvas.height = this.options.size * dpr;
    this.canvas.style.width = this.options.size + 'px';
    this.canvas.style.height = this.options.size + 'px';
    this.ctx.scale(dpr, dpr);
  }

  /**
   * 绘制完整雷达图
   * @param {Object} data - { 维度key: 值(0-1) }
   * @param {Array} dimensions - [{ key, label, max }]
   */
  draw(data, dimensions) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const { centerX, centerY, radius } = this;
    const total = dimensions.length;
    const angleStep = (Math.PI * 2) / total;
    const startAngle = -Math.PI / 2; // 从顶部开始

    ctx.clearRect(0, 0, this.options.size, this.options.size);

    // 1. 绘制网格
    this.drawGrid(total, angleStep, startAngle);

    // 2. 绘制轴线
    this.drawAxes(dimensions, total, angleStep, startAngle);

    // 3. 绘制数据区域
    this.drawDataArea(data, dimensions, total, angleStep, startAngle);

    // 4. 绘制数据点
    this.drawDataPoints(data, dimensions, total, angleStep, startAngle);

    // 5. 绘制标签
    this.drawLabels(dimensions, total, angleStep, startAngle);
  }

  drawGrid(total, angleStep, startAngle) {
    const ctx = this.ctx;
    const { centerX, centerY, radius } = this;
    const levels = this.options.levels;

    for (let level = 1; level <= levels; level++) {
      const r = (radius / levels) * level;
      ctx.beginPath();
      for (let i = 0; i <= total; i++) {
        const angle = startAngle + angleStep * i;
        const x = centerX + r * Math.cos(angle);
        const y = centerY + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = this.options.colors.grid;
      ctx.lineWidth = 1;
      ctx.stroke();

      // 填充交替色
      if (level === levels) {
        ctx.fillStyle = this.options.colors.gridFill;
        ctx.fill();
      }
    }
  }

  drawAxes(dimensions, total, angleStep, startAngle) {
    const ctx = this.ctx;
    const { centerX, centerY, radius } = this;

    for (let i = 0; i < total; i++) {
      const angle = startAngle + angleStep * i;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = this.options.colors.grid;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  drawDataArea(data, dimensions, total, angleStep, startAngle) {
    const ctx = this.ctx;
    const { centerX, centerY, radius } = this;

    ctx.beginPath();
    for (let i = 0; i < total; i++) {
      const angle = startAngle + angleStep * i;
      const dim = dimensions[i];
      const value = Math.min(Math.max(data[dim.key] || 0, 0), 1);
      const r = radius * value;
      const x = centerX + r * Math.cos(angle);
      const y = centerY + r * Math.sin(angle);

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = this.options.colors.dataFill;
    ctx.fill();
    ctx.strokeStyle = this.options.colors.data;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  drawDataPoints(data, dimensions, total, angleStep, startAngle) {
    const ctx = this.ctx;
    const { centerX, centerY, radius } = this;

    for (let i = 0; i < total; i++) {
      const angle = startAngle + angleStep * i;
      const dim = dimensions[i];
      const value = Math.min(Math.max(data[dim.key] || 0, 0), 1);
      const r = radius * value;
      const x = centerX + r * Math.cos(angle);
      const y = centerY + r * Math.sin(angle);

      // 外圈
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = this.options.colors.data;
      ctx.lineWidth = 2;
      ctx.stroke();

      // 内圈
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fillStyle = this.options.colors.data;
      ctx.fill();
    }
  }

  drawLabels(dimensions, total, angleStep, startAngle) {
    const ctx = this.ctx;
    const { centerX, centerY, radius } = this;
    const labelOffset = 30;

    for (let i = 0; i < total; i++) {
      const angle = startAngle + angleStep * i;
      const dim = dimensions[i];
      const r = radius + labelOffset;
      const x = centerX + r * Math.cos(angle);
      const y = centerY + r * Math.sin(angle);

      // 标签背景
      ctx.font = `bold ${this.options.labelFontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
      const cornerLabel = dim.label;
      const metrics = ctx.measureText(cornerLabel);
      const tw = metrics.width;
      const th = this.options.labelFontSize;
      const px = 10, py = 6;
      ctx.fillStyle = 'rgba(255,255,255,0.94)';
      ctx.fillRect(x - tw / 2 - px, y - th / 2 - py, tw + px * 2, th + py * 2);

      // 标签文字
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = this.options.colors.label;
      ctx.fillText(cornerLabel, x, y);

      // 百分比（标签下方）
      const pct = data[dim.key] !== undefined ? Math.round(data[dim.key] * 100) + '%' : '0%';
      ctx.font = `11px "Microsoft YaHei", "PingFang SC", sans-serif`;
      ctx.fillStyle = this.options.colors.levelText;
      ctx.fillText(pct, x, y + th / 2 + 14);
    }
  }
}

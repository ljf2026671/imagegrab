/* ============================================================
 * 图提取 ImageGrab - content.js
 * 职责：
 * 1. 在淘宝/京东/拼多多详情页右下角注入「获取图片」悬浮按钮
 * 2. 点击按钮后扫描页面所有商品图片（img / srcset / 懒加载属性 / 背景图）
 * 3. 过滤图标、logo、占位图、过小图，去重后发送给 background
 * ============================================================ */

(function () {
  // 防止被电商页面重复注入
  if (window.__imagegrabInjected) return;
  window.__imagegrabInjected = true;

  // ---------- 1. 注入悬浮按钮 ----------
  const btn = document.createElement('div');
  btn.id = '__imagegrab_btn__';
  btn.textContent = '获取图片';
  btn.title = '一键提取本页所有商品图片';
  document.documentElement.appendChild(btn);

  btn.addEventListener('click', async () => {
    btn.textContent = '提取中…';
    btn.classList.add('__imagegrab_loading__');
    try {
      const images = extractImages();
      if (!images.length) {
        btn.textContent = '未找到图片';
        btn.classList.remove('__imagegrab_loading__');
        setTimeout(() => (btn.textContent = '获取图片'), 1500);
        return;
      }
      // 把图片列表交给 background，由它存起来并打开 gallery 页面
      const res = await chrome.runtime.sendMessage({
        type: 'IMAGEGRAB_EXTRACT',
        images: images,
        source: location.href
      });
      btn.textContent = `已提取 ${images.length} 张`;
      btn.classList.remove('__imagegrab_loading__');
      setTimeout(() => (btn.textContent = '获取图片'), 2000);
    } catch (e) {
      console.error('[ImageGrab] 提取失败：', e);
      btn.textContent = '提取失败';
      btn.classList.remove('__imagegrab_loading__');
      setTimeout(() => (btn.textContent = '获取图片'), 1500);
    }
  });

  // ---------- 2. 图片提取核心 ----------
  function extractImages() {
    const set = new Set();

    // 2.1 收集一个 URL（补全为绝对地址）
    const push = (raw) => {
      if (!raw) return;
      let url = String(raw).trim();
      if (url.startsWith('data:image/')) return;        // 跳过 base64 占位
      if (url.startsWith('//')) url = location.protocol + url;
      else if (url.startsWith('/')) url = location.origin + url;
      if (!/^https?:\/\//i.test(url)) return;          // 只保留 http/https
      // 去掉常见的缩略图尺寸后缀，尝试拿原图（可选）
      set.add(url);
    };

    // 2.2 遍历所有 <img>
    document.querySelectorAll('img').forEach((img) => {
      // 真实像素尺寸过小的直接跳过
      const w = img.naturalWidth || img.width || 0;
      const h = img.naturalHeight || img.height || 0;
      if (w && h && (w < 100 || h < 100)) return;

      push(img.src);
      // srcset 里可能有多档尺寸
      if (img.srcset) {
        img.srcset.split(',').forEach((part) => {
          const u = part.trim().split(/\s+/)[0];
          push(u);
        });
      }
      // 各平台懒加载属性
      ['data-src', 'data-lazy-src', 'data-original', 'data-ks-lazyload',
       'data-url', 'data-actualsrc', 'data-lazy'].forEach((attr) => {
        const v = img.getAttribute(attr);
        if (v) push(v);
      });
    });

    // 2.3 背景图 background-image: url(...)
    document.querySelectorAll('*').forEach((el) => {
      const bg = getComputedStyle(el).backgroundImage;
      if (!bg || bg === 'none') return;
      const m = bg.match(/url\(["']?(.*?)["']?\)/g);
      if (m) m.forEach((item) => push(item.replace(/^url\(["']?|["']?\)$/g, '')));
    });

    // 2.4 去重 + 过滤明显不是商品图的资源
    const list = [...set].filter((url) => {
      // 跳过 1x1、spacer、pixel、blank 之类
      if (/\/(spacer|blank|pixel|1x1|blank\.gif|loading)/i.test(url)) return false;
      // 跳过明显的图标/广告/埋点
      if (/\/(icon|logo|avatar|ad_|tracker|beacon|pixel|qrcode|kefu|customer)/i.test(url)) return false;
      // 跳过 svg（一般是图标）
      if (/\.svg(\?|$)/i.test(url)) return false;
      return true;
    });

    // 同一张图的不同尺寸，保留最大那张的 URL（简单策略：去掉 _数字x数字 后缀取原图）
    const normalized = new Map();
    list.forEach((url) => {
      const key = url.replace(/[._-]?\d{2,4}x\d{2,4}(\.\w+)/i, '$1');
      if (!normalized.has(key)) normalized.set(key, url);
    });
    return [...normalized.values()];
  }
})();

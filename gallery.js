/* ============================================================
 * 图提取 ImageGrab - gallery.js
 * 职责：
 * 1. 从 chrome.storage 读取图片列表并网格渲染
 * 2. 全选 / 反选 / 已选计数
 * 3. 下载选中：通过 background 跨域抓图 -> canvas 转 PNG -> 调用 downloads
 * ============================================================ */

const grid = document.getElementById('grid');
const emptyTip = document.getElementById('emptyTip');
const countBadge = document.getElementById('countBadge');
const selectedInfo = document.getElementById('selectedInfo');
const sourceUrlEl = document.getElementById('sourceUrl');
const toast = document.getElementById('toast');

let state = { images: [], loaded: [] }; // loaded[i] = { url, dataUrl, w, h }

// ---------- 初始化：读取 storage ----------
chrome.storage.local.get(['imagegrabImages', 'imagegrabSource'], (data) => {
  const images = data.imagegrabImages || [];
  if (data.imagegrabSource) {
    sourceUrlEl.textContent = '来源：' + data.imagegrabSource;
  }
  if (!images.length) {
    emptyTip.style.display = 'block';
    return;
  }
  countBadge.textContent = images.length + ' 张图片';
  render(images);
});

// ---------- 渲染网格 ----------
function render(images) {
  emptyTip.style.display = 'none';
  state.images = images;
  state.loaded = new Array(images.length).fill(null);

  images.forEach((url, i) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.index = i;
    card.innerHTML = `
      <input type="checkbox" class="check" data-i="${i}" />
      <div class="thumb"><span>加载中…</span></div>
      <div class="meta">
        <span class="size">-- x --</span>
        <span>#${String(i + 1).padStart(3, '0')}</span>
      </div>
    `;
    grid.appendChild(card);

    // 点击卡片切换勾选
    card.addEventListener('click', (e) => {
      if (e.target.tagName === 'INPUT') return;
      const cb = card.querySelector('.check');
      cb.checked = !cb.checked;
      card.classList.toggle('selected', cb.checked);
      updateSelectedInfo();
    });
    card.querySelector('.check').addEventListener('change', () => {
      card.classList.toggle('selected', card.querySelector('.check').checked);
      updateSelectedInfo();
    });

    // 异步加载缩略图（走 background 跨域抓图）
    loadThumb(url, i, card);
  });
}

// ---------- 跨域抓图 -> dataURL -> 缩略图 ----------
function loadThumb(url, i, card) {
  chrome.runtime.sendMessage({ type: 'IMAGEGRAB_FETCH', url }, (resp) => {
    const thumb = card.querySelector('.thumb');
    if (!resp || !resp.ok) {
      thumb.innerHTML = '<span>加载失败</span>';
      return;
    }
    const img = new Image();
    img.onload = () => {
      thumb.innerHTML = '';
      thumb.appendChild(img);
      card.querySelector('.size').textContent = img.naturalWidth + ' x ' + img.naturalHeight;
      state.loaded[i] = { url, dataUrl: resp.dataUrl, w: img.naturalWidth, h: img.naturalHeight };
    };
    img.onerror = () => (thumb.innerHTML = '<span>解码失败</span>');
    img.src = resp.dataUrl;
  });
}

// ---------- 全选 / 反选 ----------
document.getElementById('selectAllBtn').onclick = () => {
  document.querySelectorAll('.card').forEach((c) => {
    c.querySelector('.check').checked = true;
    c.classList.add('selected');
  });
  updateSelectedInfo();
};
document.getElementById('invertBtn').onclick = () => {
  document.querySelectorAll('.card').forEach((c) => {
    const cb = c.querySelector('.check');
    cb.checked = !cb.checked;
    c.classList.toggle('selected', cb.checked);
  });
  updateSelectedInfo();
};

function updateSelectedInfo() {
  const n = document.querySelectorAll('.card .check:checked').length;
  selectedInfo.textContent = `已选 ${n} 张`;
}

// ---------- 下载选中（统一转 PNG） ----------
document.getElementById('downloadBtn').onclick = async () => {
  const checked = [...document.querySelectorAll('.card .check:checked')].map((cb) => +cb.dataset.i);
  if (!checked.length) { showToast('请先勾选要下载的图片'); return; }

  const btn = document.getElementById('downloadBtn');
  btn.disabled = true;
  showToast(`开始下载 ${checked.length} 张…`);

  let okCount = 0;
  for (let k = 0; k < checked.length; k++) {
    const i = checked[k];
    const item = state.loaded[i];
    if (!item) { showToast(`第 ${i + 1} 张未加载成功，跳过`); continue; }
    try {
      const pngDataUrl = await toPng(item.dataUrl);
      const filename = `商品图_${String(k + 1).padStart(3, '0')}.png`;
      await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { type: 'IMAGEGRAB_DOWNLOAD', dataUrl: pngDataUrl, filename },
          () => { resolve(); }
        );
      });
      okCount++;
    } catch (e) {
      console.error('下载失败：', e);
    }
  }
  btn.disabled = false;
  showToast(`完成：成功下载 ${okCount} 张 PNG`);
};

// 用 canvas 把任意图片 dataURL 重编码为 PNG dataURL
function toPng(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';           // 透明底补白，避免 PNG 透明发黑
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// ---------- 轻提示 ----------
let toastTimer = null;
function showToast(text) {
  toast.textContent = text;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

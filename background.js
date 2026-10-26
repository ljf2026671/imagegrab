/* ============================================================
 * 图提取 ImageGrab - background.js (Service Worker, MV3)
 * 职责：
 * 1. 接收 content.js 发来的图片列表，存入 chrome.storage
 * 2. 打开 gallery.html 展示页面
 * 3. 提供 fetchImage 接口：跨域抓取图片为 blob，避免 gallery 里 canvas 被污染
 * 4. 处理最终下载（PNG dataURL -> chrome.downloads.download）
 * ============================================================ */

// 监听 content script 的消息
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'IMAGEGRAB_EXTRACT') {
    // 存起来，gallery 页面打开后再读
    chrome.storage.local.set(
      { imagegrabImages: msg.images, imagegrabSource: msg.source },
      () => {
        // 打开新标签页展示 gallery
        chrome.tabs.create({ url: chrome.runtime.getURL('gallery.html') });
        sendResponse({ ok: true, count: msg.images.length });
      }
    );
    return true; // 异步 sendResponse
  }

  // gallery 请求跨域抓图：返回一个 blob URL（扩展内部同源，canvas 可安全转 PNG）
  if (msg.type === 'IMAGEGRAB_FETCH') {
    fetch(msg.url, { mode: 'cors', credentials: 'omit' })
      .then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.blob();
      })
      .then((blob) => {
        // 注意：blob URL 在 service worker 里生成，gallery 页能否访问？
        // MV3 里用 FileReader 转成 dataURL 更稳（图片一般几百 KB）
        const reader = new FileReader();
        reader.onload = () => sendResponse({ ok: true, dataUrl: reader.result, type: blob.type });
        reader.onerror = () => sendResponse({ ok: false, error: 'read fail' });
        reader.readAsDataURL(blob);
      })
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true; // 异步
  }

  // gallery 让我们直接下载某个 dataURL
  if (msg.type === 'IMAGEGRAB_DOWNLOAD') {
    chrome.downloads.download(
      { url: msg.dataUrl, filename: msg.filename, saveAs: false },
      (downloadId) => sendResponse({ ok: chrome.runtime.lastError ? false : true, id: downloadId })
    );
    return true;
  }
});

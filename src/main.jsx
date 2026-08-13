import './lib/storage.js'; // 必须在 App 之前引入，注入 window.storage 的 localStorage 实现

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// ===== 自适应缩放＋窗口变化防抖 =====
(function initZoom() {
  if (typeof window === 'undefined') return;

  const designWidth = 390; // 设计稿基准宽度
  let resizeTimer = null;

  function applyZoom() {
    const screenWidth = window.innerWidth;
    // 计算缩放系数：屏幕越宽，缩放越小；但最小不低于 0.5，最大不超过 1
    let scale = designWidth / screenWidth;
    scale = Math.max(0.5, Math.min(1, scale));
    document.documentElement.style.zoom = scale;
  }

  // 首次加载时应用
  applyZoom();

  // 窗口大小变化时重新计算（防抖 200ms，避免频繁触发）
  window.addEventListener('resize', () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      applyZoom();
      resizeTimer = null;
    }, 200);
  });
})();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// 註冊 Service Worker：這是「可安裝成 PWA」的必要條件之一。
// 放在 load 事件之後才註冊，避免搶首屏渲染的資源；失敗也不影響 App 本身正常使用
// （例如某些瀏覽器完全不支援 Service Worker，就單純沒有離線快取和安裝功能而已）。
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

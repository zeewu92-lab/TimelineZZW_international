import './lib/storage.js'; // 必须在 App 之前引入
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// ===== 分段自适应缩放（解决折叠屏展开/合上缩放差异） =====
(function initAdaptiveZoom() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  let resizeTimer = null;

  function applyZoom() {
    const screenWidth = window.innerWidth;
    let scale;

    // ===== 分段判断：根据屏幕宽度使用不同策略 =====
    if (screenWidth >= 600) {
      // 大屏模式（折叠屏展开、平板）：固定缩放，避免内容太小
      scale = 0.75;
    } else if (screenWidth >= 400) {
      // 中等屏幕（普通手机竖屏）：自适应缩放，范围控制在 0.78~0.88
      scale = 390 / screenWidth;
      scale = Math.max(0.78, Math.min(0.88, scale));
    } else {
      // 小屏幕（窄手机）：自适应缩放，范围控制在 0.85~0.95
      scale = 390 / screenWidth;
      scale = Math.max(0.85, Math.min(0.95, scale));
    }
    // =================================================

    // 更新 viewport
    const meta = document.querySelector('meta[name=viewport]');
    if (meta) {
      meta.setAttribute(
        'content',
        `width=device-width, initial-scale=${scale}, minimum-scale=${scale}, maximum-scale=${scale}, user-scalable=no, viewport-fit=cover`
      );
    }
  }

  // 首次加载时应用
  applyZoom();

  // 窗口大小变化时重新计算（防抖 200ms）
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

// Service Worker 注册（保持不变）
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

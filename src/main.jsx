import './lib/storage.js'; // 必须在 App 之前引入
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// ===== 自适应缩放（根据屏幕宽度动态调整 initial-scale） =====
(function initAdaptiveZoom() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const DESIGN_WIDTH = 390; // 设计稿基准宽度（iPhone 12/13/14 逻辑宽度）
  const MIN_SCALE = 0.5;    // 最小缩放限制（防止超大屏缩太小）
  const MAX_SCALE = 1.0;    // 最大缩放限制（防止小屏手机内容溢出）

  let resizeTimer = null;

  function applyZoom() {
    const screenWidth = window.innerWidth;
    // 计算理想缩放值：设计宽度 / 实际宽度，使内容刚好填满屏幕
    let scale = DESIGN_WIDTH / screenWidth;
    // 限制范围
    scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));

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

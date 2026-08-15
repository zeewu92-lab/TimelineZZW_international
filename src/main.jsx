// ===== main.jsx 完整替换 =====

import './lib/storage.js';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

(function initAdaptiveZoom() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const DESIGN_WIDTH = 390;
  // ===== 核心调整：收紧缩放范围 =====
  const MIN_SCALE = 0.72; // 展开时最小缩放到 72%
  const MAX_SCALE = 0.88; // 合上时最大缩放到 88%
  // ================================

  let resizeTimer = null;

  function applyZoom() {
    const screenWidth = window.innerWidth;
    let scale = DESIGN_WIDTH / screenWidth;
    scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));

    const meta = document.querySelector('meta[name=viewport]');
    if (meta) {
      meta.setAttribute(
        'content',
        `width=device-width, initial-scale=${scale}, minimum-scale=${scale}, maximum-scale=${scale}, user-scalable=no, viewport-fit=cover`
      );
    }
  }

  applyZoom();

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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

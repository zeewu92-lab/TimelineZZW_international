import './lib/storage.js'; // 必须在 App 之前引入，注入 window.storage 的 localStorage 实现

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { SpeedInsights } from '@vercel/speed-insights/react';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <SpeedInsights />
  </React.StrictMode>
);

// 註冊 Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

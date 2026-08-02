import './lib/storage.js'; // 必须在 App 之前引入，注入 window.storage 的 localStorage 实现

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

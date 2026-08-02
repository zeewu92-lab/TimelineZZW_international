# 世界時鐘 ・ 時間軸地標（countdown-timeline-app）

一個以「世界時鐘」＋「時間軸地標／倒數日」為核心的網頁應用，支援多國語言、深色模式、雲端登入同步。

## 技術棧

- [React 18](https://react.dev/)
- [Vite 5](https://vitejs.dev/)（開發伺服器／打包）
- [Tailwind CSS](https://tailwindcss.com/)（透過 CDN 引入，見 `index.html`）
- [lucide-react](https://lucide.dev/)（圖示）
- [Firebase](https://firebase.google.com/)（Auth + Firestore，用於登入與雲端資料同步）

## 開始使用

需要先安裝 [Node.js](https://nodejs.org/)（建議 18 以上版本）。

```bash
# 安裝依賴
npm install

# 啟動開發伺服器（預設 http://localhost:5173）
npm run dev

# 打包正式版
npm run build

# 本機預覽打包結果
npm run preview
```

## 專案結構

```
.
├── index.html          # 頁面入口、Tailwind CDN、全域 CSS 動畫（keyframes）
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx         # React 掛載入口
    ├── App.jsx          # 主要邏輯與畫面（世界時鐘、時間軸、表單、登入視窗等）
    └── lib/
        ├── firebase.js  # Firebase 初始化（App / Auth / Firestore）
        ├── auth.js      # 登入／註冊／登出等帳號相關函式
        ├── cloudSync.js # 本機資料與 Firestore 雲端資料的讀寫、合併邏輯
        └── storage.js   # 本機（localStorage 等）資料存取
```

`src/App.jsx` 是目前整個介面與大部分邏輯所在的單一檔案，包含：

- **世界時鐘**：新增／刪除時區，設定「目前位置」，時區清單超過上限可自行捲動查看。
- **時間軸地標**：新增／編輯／刪除倒數日或紀念日，支援重複規則（每年／每月）、農曆等曆法、生日模式、關懷模式（素雅紀念樣式）、自訂 emoji 圖示、搜尋。
- **多國語言**：內建繁體中文、英文、日文、韓文（見 `App.jsx` 中的 `STRINGS`）。
- **深色模式**。
- **帳號登入與雲端同步**：透過 Firebase 以 Google／Apple／Email 登入，本機資料可與雲端合併同步。

## 設定 Firebase（可選）

若要啟用登入與雲端同步功能，需要在 [Firebase Console](https://console.firebase.google.com/) 建立專案，並將對應的設定值填入 `src/lib/firebase.js` 中的 `firebaseConfig`（目前檔案內已附有一組可用設定，僅供開發測試）。

## 授權

專案內未附加開源授權條款，預設保留所有權利。

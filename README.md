# 世界時鐘・時間軸地標（countdown-timeline-app）

**Language / 語言 / 言語 / 언어：**
[繁體中文](#繁體中文) | [English](#english) | [日本語](#日本語) | [한국어](#한국어)

---

## 繁體中文

一個以「世界時鐘」＋「時間軸地標／倒數日」為核心的網頁應用，支援多國語言、深色模式、雲端登入同步。

### 技術棧

- [React 18](https://react.dev/)
- [Vite 5](https://vitejs.dev/)（開發伺服器／打包）
- [Tailwind CSS](https://tailwindcss.com/)（透過 CDN 引入，見 `index.html`）
- [lucide-react](https://lucide.dev/)（圖示）
- [Firebase](https://firebase.google.com/)（Auth + Firestore，用於登入與雲端資料同步）

### 開始使用

需要 [Node.js](https://nodejs.org/)（18 以上版本）。

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

### 專案結構

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

### 設定 Firebase（可選）

登入與雲端同步功能透過 Firebase 實作，相關設定值位於 `src/lib/firebase.js` 中的 `firebaseConfig`，目前檔案內附有一組開發測試用的設定。

### PWA（可安裝到手機主畫面）

專案已內建基本的 PWA 設定（`public/manifest.json`、`public/sw.js`，並在 `index.html` 加了對應的 meta／link 標籤），部署上線後：

- **Android（Chrome）**：打開網站，瀏覽器選單裡會出現「安裝應用程式」或「加入主畫面」，點了之後就會有獨立的桌面圖示，開啟時去掉網址列，體驗接近原生 App。
- **iOS（Safari）**：分享選單 → 「加入主畫面」，同樣會產生桌面圖示與全螢幕啟動效果（iOS 對 PWA 功能支援較陽春，例如背景推播無法使用）。
- 離線或網路不穩時，已經打開過的頁面殼層會由 Service Worker 快取，仍可開啟 App（本機資料本身存在 `localStorage`，跟網路無關，離線一樣可以使用世界時鐘、時間軸等核心功能）。

目前 `public/` 裡的圖示（`icon-192.png`、`icon-512.png`、`icon-maskable-512.png`、`apple-touch-icon.png`、`favicon.ico`）是暫時生成的簡易佔位圖。

### 中國大陸可用性

- **靜態頁面本身**：`xxx.vercel.app` 這種預設網域在大陸網路環境下的解析／連線不穩定。
- **帳號登入／雲端同步（Firebase）**：這部分與網頁託管在哪裡無關——Firebase Authentication／Firestore 在中國大陸網路環境下可能無法連線。目前程式已經是「非阻塞」設計：App 啟動只依賴本機儲存（`window.storage`），不會等待 Firebase 才能顯示畫面，所以世界時鐘、時間軸等核心功能不受影響、皆可正常使用；只有主動點擊「登入」才會嘗試連線 Firebase。若請求逾時（8 秒），畫面會顯示「本功能暫不支援中國大陸地區，請聯繫開發者」的提示。

專案內未附加開源授權條款，預設保留所有權利。

[⬆ 回到頂端](#世界時鐘時間軸地標countdown-timeline-app)

---

## English

A web app centered on a **World Clock** and a **Timeline of Milestones / Countdown Days**, with multi-language support, dark mode, and cloud sync via account login.

### Tech Stack

- [React 18](https://react.dev/)
- [Vite 5](https://vitejs.dev/) (dev server / bundler)
- [Tailwind CSS](https://tailwindcss.com/) (loaded via CDN, see `index.html`)
- [lucide-react](https://lucide.dev/) (icons)
- [Firebase](https://firebase.google.com/) (Auth + Firestore, for login and cloud data sync)

### Getting Started

Requires [Node.js](https://nodejs.org/) (18+).

```bash
# Install dependencies
npm install

# Start the dev server (default http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview the production build locally
npm run preview
```

### Project Structure

```
.
├── index.html          # Page entry, Tailwind CDN, global CSS keyframe animations
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx         # React mount entry point
    ├── App.jsx          # Main logic and UI (world clock, timeline, forms, login modal, etc.)
    └── lib/
        ├── firebase.js  # Firebase initialization (App / Auth / Firestore)
        ├── auth.js      # Login / sign-up / sign-out and related account functions
        ├── cloudSync.js # Read/write and merge logic between local data and Firestore
        └── storage.js   # Local data access (localStorage, etc.)
```

`src/App.jsx` currently holds most of the UI and logic in a single file, including:

- **World Clock**: add/remove time zones, set a "current location", scrollable list when it exceeds the limit.
- **Timeline of Milestones**: add/edit/delete countdown or anniversary entries, with recurrence rules (yearly/monthly), lunar and other calendar support, birthday mode, a subdued "remembrance" mode, custom emoji icons, and search.
- **Multi-language support**: built-in Traditional Chinese, English, Japanese, and Korean (see `STRINGS` in `App.jsx`).
- **Dark mode**.
- **Account login and cloud sync**: sign in via Firebase with Google/Apple/Email; local data can be merged and synced with the cloud.

### Firebase Setup (Optional)

Login and cloud sync are implemented via Firebase, with the corresponding values in `firebaseConfig` inside `src/lib/firebase.js`; the file currently includes a development-only configuration.

### PWA (Installable on Mobile Home Screen)

The project includes basic PWA support (`public/manifest.json`, `public/sw.js`, plus the corresponding meta/link tags in `index.html`). Once deployed:

- **Android (Chrome)**: open the site, and the browser menu will show "Install app" or "Add to Home screen." Tapping it creates a standalone home-screen icon with the address bar hidden, for a near-native feel.
- **iOS (Safari)**: Share menu → "Add to Home Screen," which likewise creates a home-screen icon and full-screen launch (iOS's PWA support is more limited — e.g., no background push notifications).
- When offline or on an unstable connection, previously loaded page shells are cached by the Service Worker, so the app can still open (local data lives in `localStorage` regardless of network, so core features like the world clock and timeline work offline too).

The icons currently in `public/` (`icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`, `favicon.ico`) are temporary placeholder graphics.

### Availability in Mainland China

- **The static site itself**: DNS resolution and connectivity to a default domain like `xxx.vercel.app` can be unstable from within mainland China.
- **Account login / cloud sync (Firebase)**: this is independent of where the site is hosted — Firebase Authentication/Firestore may be unreachable from mainland China networks. The app is designed to be non-blocking: startup only depends on local storage (`window.storage`) and never waits on Firebase to render, so core features like the world clock and timeline are unaffected and work normally. Firebase is only contacted when the user actively taps "Sign in." If the request times out (8 seconds), the UI shows a message saying this feature isn't currently supported in mainland China and to contact the developer.

No open-source license is included in the project; all rights reserved by default.

[⬆ Back to top](#世界時鐘時間軸地標countdown-timeline-app)

---

## 日本語

「ワールドクロック」と「タイムライン・マイルストーン（カウントダウン）」を中心としたウェブアプリです。多言語対応、ダークモード、アカウントログインによるクラウド同期に対応しています。

### 技術スタック

- [React 18](https://react.dev/)
- [Vite 5](https://vitejs.dev/)（開発サーバー／ビルド）
- [Tailwind CSS](https://tailwindcss.com/)（CDN 経由で読み込み、`index.html` を参照）
- [lucide-react](https://lucide.dev/)（アイコン）
- [Firebase](https://firebase.google.com/)（Auth + Firestore、ログインとクラウドデータ同期に使用）

### はじめに

[Node.js](https://nodejs.org/)（バージョン 18 以上）が必要です。

```bash
# 依存関係のインストール
npm install

# 開発サーバーを起動（デフォルト http://localhost:5173）
npm run dev

# 本番用にビルド
npm run build

# ビルド結果をローカルでプレビュー
npm run preview
```

### プロジェクト構成

```
.
├── index.html          # エントリーポイント、Tailwind CDN、グローバル CSS アニメーション（keyframes）
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx         # React マウントのエントリーポイント
    ├── App.jsx          # 主要なロジックと画面（ワールドクロック、タイムライン、フォーム、ログインモーダルなど）
    └── lib/
        ├── firebase.js  # Firebase の初期化（App / Auth / Firestore）
        ├── auth.js      # ログイン／登録／ログアウトなどアカウント関連の関数
        ├── cloudSync.js # ローカルデータと Firestore のクラウドデータの読み書き・マージ処理
        └── storage.js   # ローカル（localStorage 等）データへのアクセス
```

`src/App.jsx` は現在、画面とロジックの大部分を含む単一ファイルで、以下を含みます：

- **ワールドクロック**：タイムゾーンの追加／削除、「現在地」の設定、上限を超えた場合はスクロールで一覧を確認可能。
- **タイムライン・マイルストーン**：カウントダウンや記念日の追加／編集／削除、繰り返しルール（毎年／毎月）、旧暦などの暦対応、誕生日モード、控えめな追悼モード、カスタム絵文字アイコン、検索に対応。
- **多言語対応**：繁体字中国語、英語、日本語、韓国語を標準搭載（`App.jsx` 内の `STRINGS` を参照）。
- **ダークモード**。
- **アカウントログインとクラウド同期**：Firebase 経由で Google／Apple／メールでログインし、ローカルデータをクラウドとマージ・同期可能。

### Firebase の設定（任意）

ログインとクラウド同期機能は Firebase によって実装されており、対応する設定値は `src/lib/firebase.js` 内の `firebaseConfig` にあります。現在のファイルには開発テスト用の設定が含まれています。

### PWA（スマートフォンのホーム画面に追加可能）

本プロジェクトには基本的な PWA 設定が組み込まれています（`public/manifest.json`、`public/sw.js`、および `index.html` 内の対応する meta／link タグ）。デプロイ後は以下のように利用できます：

- **Android（Chrome）**：サイトを開くとブラウザメニューに「アプリをインストール」または「ホーム画面に追加」が表示されます。タップすると独立したホーム画面アイコンが作成され、アドレスバーなしでネイティブアプリに近い体験が得られます。
- **iOS（Safari）**：共有メニュー →「ホーム画面に追加」で同様にホーム画面アイコンとフルスクリーン起動が可能です（iOS の PWA サポートは限定的で、例えばバックグラウンドプッシュ通知は利用できません）。
- オフラインや不安定な通信環境でも、一度開いたページの外殻は Service Worker によりキャッシュされ、アプリを開くことができます（ローカルデータ自体は `localStorage` に保存されているためネットワークに依存せず、ワールドクロックやタイムラインなどの主要機能はオフラインでも利用可能です）。

現在 `public/` 内のアイコン（`icon-192.png`、`icon-512.png`、`icon-maskable-512.png`、`apple-touch-icon.png`、`favicon.ico`）は仮の簡易プレースホルダー画像です。

### 中国本土での利用について

- **静的サイト自体**：`xxx.vercel.app` のようなデフォルトドメインは、中国本土のネットワーク環境では名前解決や接続が不安定になることがあります。
- **アカウントログイン／クラウド同期（Firebase）**：これはサイトのホスティング場所とは無関係です——Firebase Authentication／Firestore は中国本土のネットワーク環境では接続できない場合があります。本アプリは「非ブロッキング」設計になっており、起動時はローカルストレージ（`window.storage`）のみに依存し、Firebase の応答を待たずに画面を表示するため、ワールドクロックやタイムラインなどの主要機能には影響がなく通常通り利用できます。「ログイン」を能動的にタップした場合のみ Firebase への接続を試みます。リクエストがタイムアウト（8秒）した場合、「本機能は現在中国本土では対応しておりません。開発者にお問い合わせください」というメッセージが表示されます。

本プロジェクトにはオープンソースライセンスが付与されていません。デフォルトで全ての権利を留保します。

[⬆ トップに戻る](#世界時鐘時間軸地標countdown-timeline-app)

---

## 한국어

**세계 시계**와 **타임라인 마일스톤(디데이)**을 중심으로 한 웹 앱입니다. 다국어 지원, 다크 모드, 계정 로그인을 통한 클라우드 동기화를 지원합니다.

### 기술 스택

- [React 18](https://react.dev/)
- [Vite 5](https://vitejs.dev/)（개발 서버／빌드）
- [Tailwind CSS](https://tailwindcss.com/)（CDN을 통해 로드, `index.html` 참고）
- [lucide-react](https://lucide.dev/)（아이콘）
- [Firebase](https://firebase.google.com/)（Auth + Firestore, 로그인 및 클라우드 데이터 동기화에 사용）

### 시작하기

[Node.js](https://nodejs.org/)（18 이상）가 필요합니다.

```bash
# 의존성 설치
npm install

# 개발 서버 시작 (기본값 http://localhost:5173)
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 결과 로컬 미리보기
npm run preview
```

### 프로젝트 구조

```
.
├── index.html          # 페이지 진입점, Tailwind CDN, 전역 CSS 애니메이션(keyframes)
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx         # React 마운트 진입점
    ├── App.jsx          # 주요 로직과 화면 (세계 시계, 타임라인, 폼, 로그인 모달 등)
    └── lib/
        ├── firebase.js  # Firebase 초기화 (App / Auth / Firestore)
        ├── auth.js      # 로그인／회원가입／로그아웃 등 계정 관련 함수
        ├── cloudSync.js # 로컬 데이터와 Firestore 클라우드 데이터 간의 읽기/쓰기 및 병합 로직
        └── storage.js   # 로컬 (localStorage 등) 데이터 접근
```

`src/App.jsx`는 현재 화면과 대부분의 로직이 담긴 단일 파일로, 다음을 포함합니다:

- **세계 시계**: 시간대 추가/삭제, "현재 위치" 설정, 목록이 상한을 초과하면 스크롤로 확인 가능.
- **타임라인 마일스톤**: 디데이 또는 기념일 추가/편집/삭제, 반복 규칙(매년/매월), 음력 등 달력 지원, 생일 모드, 절제된 추모 모드, 커스텀 이모지 아이콘, 검색 기능.
- **다국어 지원**: 번체 중국어, 영어, 일본어, 한국어 내장 (`App.jsx`의 `STRINGS` 참고).
- **다크 모드**.
- **계정 로그인 및 클라우드 동기화**: Firebase를 통해 Google/Apple/이메일로 로그인, 로컬 데이터를 클라우드와 병합·동기화 가능.

### Firebase 설정 (선택)

로그인 및 클라우드 동기화 기능은 Firebase를 통해 구현되어 있으며, 해당 설정 값은 `src/lib/firebase.js`의 `firebaseConfig`에 있습니다. 현재 파일에는 개발/테스트용 설정이 포함되어 있습니다.

### PWA (모바일 홈 화면에 설치 가능)

프로젝트에는 기본적인 PWA 설정이 포함되어 있습니다 (`public/manifest.json`, `public/sw.js`, 그리고 `index.html`의 관련 meta/link 태그). 배포 후:

- **Android (Chrome)**: 사이트를 열면 브라우저 메뉴에 "앱 설치" 또는 "홈 화면에 추가"가 표시됩니다. 탭하면 독립된 홈 화면 아이콘이 생성되고 주소창 없이 네이티브 앱에 가까운 경험을 제공합니다.
- **iOS (Safari)**: 공유 메뉴 → "홈 화면에 추가"를 통해 마찬가지로 홈 화면 아이콘과 전체 화면 실행이 가능합니다 (iOS의 PWA 지원은 다소 제한적이며, 예를 들어 백그라운드 푸시 알림은 사용할 수 없습니다).
- 오프라인이거나 네트워크가 불안정할 때도, 이미 열어본 페이지 셸은 Service Worker에 의해 캐시되어 앱을 계속 열 수 있습니다 (로컬 데이터 자체는 `localStorage`에 저장되어 네트워크와 무관하므로, 세계 시계나 타임라인 등 핵심 기능은 오프라인에서도 사용 가능합니다).

현재 `public/`에 있는 아이콘 (`icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`, `favicon.ico`)은 임시로 생성된 플레이스홀더 이미지입니다.

### 중국 본토 이용 가능성

- **정적 페이지 자체**: `xxx.vercel.app`와 같은 기본 도메인은 중국 본토 네트워크 환경에서 DNS 해석/연결이 불안정할 수 있습니다.
- **계정 로그인/클라우드 동기화 (Firebase)**: 이는 사이트가 어디에 호스팅되는지와 무관합니다 — Firebase Authentication/Firestore는 중국 본토 네트워크 환경에서 연결되지 않을 수 있습니다. 현재 앱은 "비차단(non-blocking)" 방식으로 설계되어 있어, 시작 시 로컬 저장소(`window.storage`)에만 의존하고 Firebase 응답을 기다리지 않고 화면을 표시하므로, 세계 시계나 타임라인 등 핵심 기능은 영향을 받지 않고 정상적으로 작동합니다. 사용자가 직접 "로그인"을 탭했을 때만 Firebase 연결을 시도합니다. 요청이 시간 초과(8초)되면 "이 기능은 현재 중국 본토에서 지원되지 않습니다. 개발자에게 문의해 주세요"라는 메시지가 표시됩니다.

프로젝트에는 오픈소스 라이선스가 포함되어 있지 않으며, 기본적으로 모든 권리가 보유됩니다.

[⬆ 맨 위로](#世界時鐘時間軸地標countdown-timeline-app)

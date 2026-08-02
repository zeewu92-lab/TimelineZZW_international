import { useState, useEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, ChevronDown, ChevronLeft, X, MapPin, Check, Clock, Globe, Sun, Moon, Pencil, User, LogOut, Mail, Eye, EyeOff, Search } from 'lucide-react';
import {
  watchAuthState, signUpWithEmail, signInWithEmail, signInWithGoogle, signInWithApple,
  sendMagicLink, completeEmailLinkSignInIfNeeded, signOutUser,
  getCurrentUserProviderId, changePassword, deleteAccount,
} from './lib/auth.js';
import { loadCloudData, saveCloudData } from './lib/cloudSync.js';

const INK = 'var(--ink)';
const INK_SOFT = 'var(--ink-soft)';
const ACCENT = '#6C7BE0';
const DANGER = '#FF004A';
const MINT = '#3FBF9B';
const CARD_BG = 'var(--card-bg)';
const CARD_BORDER = '1px solid var(--card-border)';
const INPUT_BG = 'var(--input-bg)';

// ▼▼▼ 臨時測試版浮水印開關 ▼▼▼
// 之後要移除浮水印時，只需把下面這個常數改成 false，
// 或直接刪除本檔案中「TestVersionWatermark」這個元件與它在 return 裡的呼叫（<TestVersionWatermark />）即可，不影響其他功能。
const SHOW_TEST_WATERMARK = false;
const TEST_WATERMARK_TEXT = '測試版080207';
// ▲▲▲ 臨時測試版浮水印開關 ▲▲▲

// Apple 登入按鈕開關：目前先隱藏，因為網頁版 Apple 登入需要先在 Apple Developer
// 網站申請 Service ID / Team ID / Key ID / 私鑰，並填進 Firebase 的 Apple 提供方設定。
// 等這些都設定好之後，把下面這個常數改成 true 即可重新顯示 Apple 登入按鈕，不用改其他地方。
const SHOW_APPLE_LOGIN = false;

const LANGS = ['zh-TW', 'en', 'ja', 'ko'];
const LANG_NAMES = { 'zh-TW': '繁體中文', en: 'English', ja: '日本語', ko: '한국어' };
const LOCALE_MAP = { 'zh-TW': 'zh-TW', en: 'en-US', ja: 'ja-JP', ko: 'ko-KR' };

// Firestore 不保證讀回資料時，物件（map）欄位的排列順序會跟寫入時完全一致，
// 直接用 JSON.stringify 比較「本機資料」跟「雲端讀回的資料」很容易因為欄位順序不同
// 而被誤判成「不一樣」，導致明明內容相同，每次重新打開 App 都跳出合併提示。
// 這裡改用「先把每個物件的 key 排序後再序列化」的穩定版比較，只看內容本身、不受欄位順序影響。
function stableStringify(value) {
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',') + '}';
  }
  return JSON.stringify(value);
}
// 判斷目前使用者是否「很可能」位於中國大陸——這裡完全沒有後端／IP 查詢服務可用，
// 只能靠瀏覽器本身透露的兩個線索做推測，準確度有限（例如使用 VPN 就會失準），
// 但作為「登入頁面提示」這種輕量用途已經足夠：
//   1. 系統時區是 Asia/Shanghai 或 Asia/Urumqi（中國大陸僅使用這兩個時區）
//   2. 瀏覽器語言是 zh-CN（中國大陸用的簡體中文語言代碼；台港澳的中文語言代碼是 zh-TW / zh-HK 等，不會誤判）
// 只要符合其中一項就視為「大陸用戶」。
function isLikelyMainlandChinaUser() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz === 'Asia/Shanghai' || tz === 'Asia/Urumqi') return true;
    const langs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || '']);
    if (langs.some(l => (l || '').toLowerCase() === 'zh-cn')) return true;
  } catch (err) {
    // 任何環境不支援 Intl／navigator 的例外情況，一律不擋，避免誤傷正常用戶
  }
  return false;
}

// 依「目前位置」時區（若未設定則退回系統時區）判斷早上／中午／晚上，回傳對應的文字 key 與 emoji
function getGreetingInfo(date, tz) {
  let hour;
  try {
    const zone = tz || Intl.DateTimeFormat().resolvedOptions().timeZone;
    hour = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: zone, hour: 'numeric', hour12: false }).format(date), 10);
  } catch (err) {
    hour = date.getHours();
  }
  if (hour >= 5 && hour < 9) return { key: 'greetMorning', emoji: '☀️' };
  if (hour >= 9 && hour < 12) return { key: 'greetForenoon', emoji: '🌤️' };
  if (hour >= 12 && hour < 14) return { key: 'greetAfternoon', emoji: '🌤️' };
  if (hour >= 14 && hour < 18) return { key: 'greetLateAfternoon', emoji: '🌇' };
  return { key: 'greetEvening', emoji: '🌙' };
}

/* ================= Beta 邀請碼驗證（Phase 1：純前端，小範圍內測） =================
 * 之後要接 Cloudflare Worker 時，只需要改寫 verifyInviteCode() 這一個函式的內容，
 * 讓它改成 fetch 你的 /redeem API，回傳一樣的 { ok, token } 格式即可，
 * InviteGate 元件與 window.storage 的儲存邏輯完全不用動。
 *
 * 開發者如何產生一組邀請碼：
 * 1. 自己想一個邀請碼字串，例如 "ZZW-BETA-8K2Q"
 * 2. 在瀏覽器 console 執行以下程式碼算出它的 SHA-256 雜湊值：
 *    (async()=>{const b=await crypto.subtle.digest('SHA-256', new TextEncoder().encode('ZZW-BETA-8K2Q'.trim().toUpperCase())); console.log(Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join(''))})()
 * 3. 把印出來的雜湊值貼到下面的 VALID_INVITE_HASHES 陣列裡（明碼絕對不要寫進程式碼）
 * 4. 把邀請碼本身私下給受邀的測試者
 */
const INVITE_KEY = 'beta-access-granted-v1';
const VALID_INVITE_HASHES = [
  // 'e3b0c44298fc1c14...',  // 範例：每個邀請碼的雜湊值佔一行
];

async function sha256Hex(text) {
  const enc = new TextEncoder().encode(text.trim().toUpperCase());
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// 統一介面：往後換成 Cloudflare Worker 時，只改這個函式內部即可
async function verifyInviteCode(code) {
  if (!code || !code.trim()) return { ok: false };
  const hash = await sha256Hex(code);
  return { ok: VALID_INVITE_HASHES.includes(hash) };

  // ---- Phase 2（Cloudflare Worker）替換範例 ----
  // const res = await fetch('https://your-worker.example.workers.dev/redeem', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ code: code.trim() }),
  // });
  // if (!res.ok) return { ok: false };
  // const data = await res.json();
  // return { ok: !!data.ok, token: data.token };
}

const STRINGS = {
  'zh-TW': {
    todayIs: d => `今天是 ${d}`, greetMorning: '早上好', greetForenoon: '上午好', greetAfternoon: '中午好', greetLateAfternoon: '下午好', greetEvening: '晚上好',
    worldClock: '世界時鐘', addTimezone: '添加時區', back: '返回',
    allAdded: '已加入全部地區', emptyClocks: '尚未加入任何時區，點右上角「添加時區」開始吧。',
    selectedCount: n => `已選 ${n}`, cancel: '取消', delete: '刪除',
    longPressHint: '長按可多選，點一下確認刪除的時區', timeline: '時間軸', compact: '精簡', detailed: '詳細',
    currentLocation: '目前位置', setAsCurrent: '點一下設為目前位置', tapToUnset: '再點一下取消設定',
    sameAsCurrent: '與目前位置同時', diffHourSuffix: '小時',
    newLandmark: '新增地標', titleLabel: '標題', titlePlaceholder: '事件名稱，給這件事起個名字',
    dateLabel: '日期', datePlaceholder: '選擇日期', timeLabel: '時間（選填）', calendarLabel: '曆法參照',
    repeatLabel: '重複', every: '每', unitYear: '年', unitMonth: '個月',
    repeatHint: '例如農曆生日、國定紀念日', lunarRepeatFixedHint: '此曆法目前僅支援每年重複一次',
    iconLabel: '圖示', colorLabel: '路標色', noteLabel: '備註（選填）', notePlaceholder: '想記住的一句話',
    addToTimeline: '加入時間軸', fillRequired: '請填寫標題與日期',
    emptyTimeline: '這條時間軸還沒有地標。', emptyTimelineSub: '新增一個吧，不論是生日、旅行，還是任何值得期待的一天。',
    pastLandmarks: n => `往日地標（${n}）`, youAreHere: '你在這裡',
    searchPlaceholder: '搜尋地標標題…', noSearchResults: '找不到符合的地標',
    countdown: '倒數 Countdown', countup: '正數 Countup', today: '就是今天',
    yearlyBadge: n => (n === 1 ? '每年' : `每${n}年`), monthlyBadge: n => (n === 1 ? '每月' : `每${n}個月`),
    tomorrow: '明天', yesterday: '昨天', lunarPrefix: '農曆',
    editLandmark: '編輯地標', saveChanges: '儲存修改', edit: '編輯',
    birthdayLabel: '生日模式', birthdayHint: '以此日期為出生日，自動計算下一次的生日歲數',
    careLabel: '關懷模式', careHint: '將圖示與顏色改為素雅的紀念樣式',
    ageBadge: n => `${n} 歲生日`,
    inviteTitle: 'Beta 內測邀請碼', inviteSubtitle: '這是尚未公開的測試版本，請輸入開發者提供的邀請碼。',
    invitePlaceholder: '輸入邀請碼', inviteSubmit: '進入', inviteChecking: '驗證中…',
    inviteInvalid: '邀請碼不正確，請確認後再試一次。',
    customIconLabel: '自訂圖示', customIconPlaceholder: '貼上想用的 emoji', customIconAdd: '新增',
    customIconLimit: '自訂圖示數量已達上限（30 個），請先刪除一些再新增。',
    account: '帳號', loginToSync: '登入以同步', loggedInAs: e => `已登入：${e}`,
    mainlandCnBlocked: '本功能暫不支援中國大陸地區，請聯絡開發者。',
    email: 'Email', password: '密碼', login: '登入', signup: '註冊',
    switchToSignup: '還沒有帳號？註冊', switchToLogin: '已有帳號？登入',
    continueWithGoogle: '使用 Google 繼續', continueWithApple: '使用 Apple 繼續',
    sendMagicLink: '寄送免密碼登入連結', magicLinkSent: '登入連結已寄出，請到信箱點擊連結完成登入。',
    orDivider: '或', logout: '登出', close: '關閉', authError: '發生錯誤，請確認帳密後再試一次。',
    authTimeout: '本功能暫不支援中國大陸地區，請聯繫開發者。App 其他功能不受影響，仍可正常使用。',
    syncing: '同步中…', synced: '已同步',
    mergeTitle: '偵測到雲端已有資料', mergeDesc: '這個帳號的雲端資料和這台裝置上的資料不一樣，要怎麼處理？',
    mergeOptionMerge: '合併兩邊的資料', mergeOptionUseCloud: '以雲端資料為主（覆蓋本機）',
    mergeOptionUseLocal: '以本機資料為主（覆蓋雲端）',
    confirmPassword: '確認密碼', passwordMismatch: '兩次輸入的密碼不一致',
    showPassword: '顯示密碼', hidePassword: '隱藏密碼',
    loginMethodLabel: '登入方式', loginMethodGoogle: 'Google', loginMethodApple: 'Apple', loginMethodEmail: 'Email 密碼',
    changePassword: '修改密碼', currentPassword: '目前密碼', newPassword: '新密碼', confirmNewPassword: '確認新密碼',
    passwordChangeSuccess: '密碼已更新', saveChangesBtn: '儲存',
    deleteAccount: '註銷帳號', deleteAccountConfirmTitle: '確定要註銷帳號嗎？',
    deleteAccountConfirmDesc: '這個動作無法復原，帳號與雲端資料都會被永久刪除。', confirmDelete: '永久刪除',
  },
  en: {
    todayIs: d => `Today is ${d}`, greetMorning: 'Good morning', greetForenoon: 'Good morning', greetAfternoon: 'Good afternoon', greetLateAfternoon: 'Good afternoon', greetEvening: 'Good evening',
    worldClock: 'World Clock', addTimezone: 'Add Timezone', back: 'Back',
    allAdded: 'All regions added', emptyClocks: 'No timezones yet — tap "Add Timezone" to start.',
    selectedCount: n => `${n} selected`, cancel: 'Cancel', delete: 'Delete',
    longPressHint: 'Long-press to multi-select, tap to confirm removal', timeline: 'Timeline', compact: 'Compact', detailed: 'Detailed',
    currentLocation: 'Current location', setAsCurrent: 'Tap to set as current location', tapToUnset: 'Tap again to unset',
    sameAsCurrent: 'Same time as current location', diffHourSuffix: 'h',
    newLandmark: 'New Landmark', titleLabel: 'Title', titlePlaceholder: 'Event name — give it a name',
    dateLabel: 'Date', datePlaceholder: 'Select a date', timeLabel: 'Time (optional)', calendarLabel: 'Calendar system',
    repeatLabel: 'Repeat', every: 'Every', unitYear: 'year(s)', unitMonth: 'month(s)',
    repeatHint: 'e.g. lunar birthday, national holiday', lunarRepeatFixedHint: 'This calendar currently supports yearly repeat only',
    iconLabel: 'Icon', colorLabel: 'Marker color', noteLabel: 'Note (optional)', notePlaceholder: 'Something worth remembering',
    addToTimeline: 'Add to Timeline', fillRequired: 'Please fill in title and date',
    emptyTimeline: 'No landmarks on this timeline yet.', emptyTimelineSub: 'Add one — a birthday, a trip, or anything worth looking forward to.',
    pastLandmarks: n => `Past landmarks (${n})`, youAreHere: 'You are here',
    searchPlaceholder: 'Search landmarks…', noSearchResults: 'No matching landmarks found',
    countdown: 'Countdown', countup: 'Countup', today: 'Today',
    yearlyBadge: n => (n === 1 ? 'Yearly' : `Every ${n} years`), monthlyBadge: n => (n === 1 ? 'Monthly' : `Every ${n} months`),
    tomorrow: 'Tomorrow', yesterday: 'Yesterday', lunarPrefix: 'Lunar',
    editLandmark: 'Edit Landmark', saveChanges: 'Save Changes', edit: 'Edit',
    birthdayLabel: 'Birthday mode', birthdayHint: "Treat this date as the birth date and auto-calculate the age turned each time",
    careLabel: 'Memorial mode', careHint: 'Switch icons and colors to a quiet, memorial style',
    ageBadge: n => `Turning ${n}`,
    inviteTitle: 'Beta Invite Code', inviteSubtitle: 'This is an unreleased test build — please enter the invite code provided by the developer.',
    invitePlaceholder: 'Enter invite code', inviteSubmit: 'Enter', inviteChecking: 'Checking…',
    inviteInvalid: 'Invalid invite code. Please check and try again.',
    customIconLabel: 'Custom Icons', customIconPlaceholder: 'Paste an emoji', customIconAdd: 'Add',
    customIconLimit: 'You have reached the limit of 30 custom icons — remove one before adding more.',
    account: 'Account', loginToSync: 'Log in to sync', loggedInAs: e => `Logged in as ${e}`,
    mainlandCnBlocked: 'This feature is not currently available in mainland China. Please contact the developer.',
    email: 'Email', password: 'Password', login: 'Log in', signup: 'Sign up',
    switchToSignup: "Don't have an account? Sign up", switchToLogin: 'Already have an account? Log in',
    continueWithGoogle: 'Continue with Google', continueWithApple: 'Continue with Apple',
    sendMagicLink: 'Send sign-in link', magicLinkSent: 'A sign-in link has been sent — check your email to finish logging in.',
    orDivider: 'or', logout: 'Log out', close: 'Close', authError: 'Something went wrong — please check your details and try again.',
    authTimeout: 'This feature isn\'t currently supported in mainland China — please contact the developer. Everything else in the app still works normally.',
    syncing: 'Syncing…', synced: 'Synced',
    mergeTitle: 'Cloud data found', mergeDesc: 'This account already has cloud data that differs from what is on this device. How would you like to proceed?',
    mergeOptionMerge: 'Merge both', mergeOptionUseCloud: 'Use cloud data (overwrite this device)',
    mergeOptionUseLocal: 'Use this device (overwrite cloud)',
    confirmPassword: 'Confirm password', passwordMismatch: 'Passwords do not match',
    showPassword: 'Show password', hidePassword: 'Hide password',
    loginMethodLabel: 'Sign-in method', loginMethodGoogle: 'Google', loginMethodApple: 'Apple', loginMethodEmail: 'Email & password',
    changePassword: 'Change password', currentPassword: 'Current password', newPassword: 'New password', confirmNewPassword: 'Confirm new password',
    passwordChangeSuccess: 'Password updated', saveChangesBtn: 'Save',
    deleteAccount: 'Delete account', deleteAccountConfirmTitle: 'Delete your account?',
    deleteAccountConfirmDesc: 'This cannot be undone. Your account and cloud data will be permanently deleted.', confirmDelete: 'Delete permanently',
  },
  ja: {
    todayIs: d => `今日は ${d}`, greetMorning: 'おはようございます', greetForenoon: 'おはようございます', greetAfternoon: 'こんにちは', greetLateAfternoon: 'こんにちは', greetEvening: 'こんばんは',
    worldClock: '世界時計', addTimezone: 'タイムゾーンを追加', back: '戻る',
    allAdded: 'すべての地域を追加済み', emptyClocks: 'タイムゾーンがありません。右上の「タイムゾーンを追加」から始めましょう。',
    selectedCount: n => `${n}件選択`, cancel: 'キャンセル', delete: '削除',
    longPressHint: '長押しで複数選択、タップで削除を確定', timeline: 'タイムライン', compact: 'シンプル', detailed: '詳細',
    currentLocation: '現在地', setAsCurrent: 'タップして現在地に設定', tapToUnset: 'もう一度タップで解除',
    sameAsCurrent: '現在地と同じ時刻', diffHourSuffix: '時間',
    newLandmark: '新しいランドマーク', titleLabel: 'タイトル', titlePlaceholder: 'イベント名を入力してください',
    dateLabel: '日付', datePlaceholder: '日付を選択', timeLabel: '時刻（任意）', calendarLabel: '暦法',
    repeatLabel: '繰り返し', every: '毎', unitYear: '年', unitMonth: 'ヶ月',
    repeatHint: '例：旧暦の誕生日、記念日', lunarRepeatFixedHint: 'この暦は現在、年1回の繰り返しのみ対応しています',
    iconLabel: 'アイコン', colorLabel: 'マーカーカラー', noteLabel: 'メモ（任意）', notePlaceholder: '覚えておきたい一言',
    addToTimeline: 'タイムラインに追加', fillRequired: 'タイトルと日付を入力してください',
    emptyTimeline: 'まだランドマークがありません。', emptyTimelineSub: '誕生日、旅行など、楽しみな日を追加しましょう。',
    pastLandmarks: n => `過去のランドマーク（${n}）`, youAreHere: '現在地',
    searchPlaceholder: 'ランドマークを検索…', noSearchResults: '一致するランドマークが見つかりません',
    countdown: 'カウントダウン', countup: '経過日数', today: '今日',
    yearlyBadge: n => (n === 1 ? '毎年' : `${n}年ごと`), monthlyBadge: n => (n === 1 ? '毎月' : `${n}ヶ月ごと`),
    tomorrow: '明日', yesterday: '昨日', lunarPrefix: '旧暦',
    editLandmark: 'ランドマークを編集', saveChanges: '変更を保存', edit: '編集',
    birthdayLabel: '誕生日モード', birthdayHint: 'この日付を誕生日として、次に迎える歳を自動計算します',
    careLabel: '追悼モード', careHint: 'アイコンと色を落ち着いた追悼スタイルに切り替えます',
    ageBadge: n => `${n}歳の誕生日`,
    inviteTitle: 'ベータ招待コード', inviteSubtitle: 'これは未公開のテスト版です。開発者から受け取った招待コードを入力してください。',
    invitePlaceholder: '招待コードを入力', inviteSubmit: '入る', inviteChecking: '確認中…',
    inviteInvalid: '招待コードが正しくありません。確認してもう一度お試しください。',
    customIconLabel: 'カスタムアイコン', customIconPlaceholder: '使いたい絵文字を貼り付け', customIconAdd: '追加',
    customIconLimit: 'カスタムアイコンは30個まで登録できます。追加する前に不要なものを削除してください。',
    account: 'アカウント', loginToSync: 'ログインして同期', loggedInAs: e => `ログイン中：${e}`,
    mainlandCnBlocked: 'この機能は現在、中国本土ではご利用いただけません。開発者までご連絡ください。',
    email: 'メールアドレス', password: 'パスワード', login: 'ログイン', signup: '新規登録',
    switchToSignup: 'アカウントをお持ちでない方は新規登録', switchToLogin: 'アカウントをお持ちの方はログイン',
    continueWithGoogle: 'Google で続ける', continueWithApple: 'Apple で続ける',
    sendMagicLink: 'ログインリンクを送信', magicLinkSent: 'ログインリンクを送信しました。メールを確認してリンクをクリックしてください。',
    orDivider: 'または', logout: 'ログアウト', close: '閉じる', authError: 'エラーが発生しました。入力内容を確認してもう一度お試しください。',
    authTimeout: 'この機能は現在、中国本土ではご利用いただけません。開発者までお問い合わせください。他の機能は引き続き通常どおり利用できます。',
    syncing: '同期中…', synced: '同期済み',
    mergeTitle: 'クラウドに既存データがあります', mergeDesc: 'このアカウントのクラウドデータが、この端末のデータと異なります。どうしますか？',
    mergeOptionMerge: '両方をマージ', mergeOptionUseCloud: 'クラウドデータを優先（この端末を上書き）',
    mergeOptionUseLocal: 'この端末のデータを優先（クラウドを上書き）',
    confirmPassword: 'パスワード（確認）', passwordMismatch: 'パスワードが一致しません',
    showPassword: 'パスワードを表示', hidePassword: 'パスワードを隠す',
    loginMethodLabel: 'ログイン方法', loginMethodGoogle: 'Google', loginMethodApple: 'Apple', loginMethodEmail: 'メール/パスワード',
    changePassword: 'パスワードを変更', currentPassword: '現在のパスワード', newPassword: '新しいパスワード', confirmNewPassword: '新しいパスワード（確認）',
    passwordChangeSuccess: 'パスワードを更新しました', saveChangesBtn: '保存',
    deleteAccount: 'アカウントを削除', deleteAccountConfirmTitle: 'アカウントを削除しますか？',
    deleteAccountConfirmDesc: 'この操作は取り消せません。アカウントとクラウドデータは完全に削除されます。', confirmDelete: '完全に削除',
  },
  ko: {
    todayIs: d => `오늘은 ${d}`, greetMorning: '좋은 아침이에요', greetForenoon: '좋은 아침이에요', greetAfternoon: '좋은 오후예요', greetLateAfternoon: '좋은 오후예요', greetEvening: '좋은 저녁이에요',
    worldClock: '세계 시계', addTimezone: '시간대 추가', back: '뒤로',
    allAdded: '모든 지역이 추가되었습니다', emptyClocks: '아직 추가된 시간대가 없습니다. 오른쪽 위 "시간대 추가"를 눌러보세요.',
    selectedCount: n => `${n}개 선택됨`, cancel: '취소', delete: '삭제',
    longPressHint: '길게 눌러 여러 개 선택, 탭하여 삭제 확정', timeline: '타임라인', compact: '간단히', detailed: '자세히',
    currentLocation: '현재 위치', setAsCurrent: '탭하여 현재 위치로 설정', tapToUnset: '다시 탭하면 해제',
    sameAsCurrent: '현재 위치와 같은 시간', diffHourSuffix: '시간',
    newLandmark: '새 랜드마크', titleLabel: '제목', titlePlaceholder: '이벤트 이름을 지어 주세요',
    dateLabel: '날짜', datePlaceholder: '날짜 선택', timeLabel: '시간(선택)', calendarLabel: '달력 체계',
    repeatLabel: '반복', every: '매', unitYear: '년', unitMonth: '개월',
    repeatHint: '예: 음력 생일, 국경일', lunarRepeatFixedHint: '이 달력은 현재 연 1회 반복만 지원합니다',
    iconLabel: '아이콘', colorLabel: '마커 색상', noteLabel: '메모(선택)', notePlaceholder: '기억하고 싶은 한마디',
    addToTimeline: '타임라인에 추가', fillRequired: '제목과 날짜를 입력해 주세요',
    emptyTimeline: '아직 타임라인에 랜드마크가 없습니다.', emptyTimelineSub: '생일, 여행 등 기대되는 날을 추가해 보세요.',
    pastLandmarks: n => `지난 랜드마크 (${n})`, youAreHere: '현재 위치',
    searchPlaceholder: '랜드마크 검색…', noSearchResults: '일치하는 랜드마크가 없습니다',
    countdown: '카운트다운', countup: '경과일', today: '오늘',
    yearlyBadge: n => (n === 1 ? '매년' : `${n}년마다`), monthlyBadge: n => (n === 1 ? '매월' : `${n}개월마다`),
    tomorrow: '내일', yesterday: '어제', lunarPrefix: '음력',
    editLandmark: '랜드마크 편집', saveChanges: '변경 사항 저장', edit: '편집',
    birthdayLabel: '생일 모드', birthdayHint: '이 날짜를 생일로 지정해 다음 생일 나이를 자동 계산합니다',
    careLabel: '추모 모드', careHint: '아이콘과 색상을 차분한 추모 스타일로 바꿉니다',
    ageBadge: n => `${n}세 생일`,
    inviteTitle: '베타 초대 코드', inviteSubtitle: '아직 공개되지 않은 테스트 버전입니다. 개발자가 제공한 초대 코드를 입력해 주세요.',
    invitePlaceholder: '초대 코드 입력', inviteSubmit: '입장', inviteChecking: '확인 중…',
    inviteInvalid: '초대 코드가 올바르지 않습니다. 확인 후 다시 시도해 주세요.',
    customIconLabel: '커스텀 아이콘', customIconPlaceholder: '사용하고 싶은 이모지 붙여넣기', customIconAdd: '추가',
    customIconLimit: '커스텀 아이콘은 최대 30개까지 등록할 수 있습니다. 추가하기 전에 일부를 삭제해 주세요.',
    account: '계정', loginToSync: '로그인하여 동기화', loggedInAs: e => `로그인됨: ${e}`,
    mainlandCnBlocked: '이 기능은 현재 중국 본토에서 이용하실 수 없습니다. 개발자에게 문의해 주세요.',
    email: '이메일', password: '비밀번호', login: '로그인', signup: '회원가입',
    switchToSignup: '계정이 없으신가요? 회원가입', switchToLogin: '이미 계정이 있으신가요? 로그인',
    continueWithGoogle: 'Google로 계속하기', continueWithApple: 'Apple로 계속하기',
    sendMagicLink: '로그인 링크 보내기', magicLinkSent: '로그인 링크를 보냈습니다. 이메일에서 링크를 눌러 로그인을 완료하세요.',
    orDivider: '또는', logout: '로그아웃', close: '닫기', authError: '오류가 발생했습니다. 입력 정보를 확인한 뒤 다시 시도해 주세요.',
    authTimeout: '이 기능은 현재 중국 본토에서 지원되지 않습니다. 개발자에게 문의해 주세요. 다른 기능은 정상적으로 계속 사용할 수 있습니다.',
    syncing: '동기화 중…', synced: '동기화됨',
    mergeTitle: '클라우드에 기존 데이터가 있습니다', mergeDesc: '이 계정의 클라우드 데이터가 이 기기의 데이터와 다릅니다. 어떻게 처리할까요?',
    mergeOptionMerge: '양쪽 데이터 합치기', mergeOptionUseCloud: '클라우드 데이터 사용(이 기기 덮어쓰기)',
    mergeOp

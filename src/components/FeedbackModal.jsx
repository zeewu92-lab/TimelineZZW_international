import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Plus, ChevronLeft, ChevronRight, ChevronDown, Maximize2, Minimize2, Copy, Check } from 'lucide-react';
// 手機號碼的國際區號與各國格式校驗，全部交給 libphonenumber-js（Google libphonenumber 的 JS 版本）
// 處理，不自己刻各國規則表——手動維護兩百多國的號碼長度/格式規則極容易寫錯或漏判，
// 這正是題目特別提醒「不能誤判合法號碼」的原因。需要先 `npm install libphonenumber-js`。
import { parsePhoneNumberFromString, isValidPhoneNumber, getCountryCallingCode } from 'libphonenumber-js';

const ACCENT = 'var(--accent, #6C7BE0)';
const INK = 'var(--ink)';
const INK_SOFT = 'var(--ink-soft)';
const CARD_BORDER = '1px solid var(--card-border)';
const INPUT_BG = 'var(--input-bg)';
const DANGER = '#FF004A';

// 跟 AuthModal 用的是同一組玻璃感視窗樣式（毛玻璃卡片 + 半透明白底），
// 讓「意見反饋」跟「帳號登入」視窗的質感一致，不會突然看起來像兩套不同的 UI。
const FEEDBACK_GLASS = {
  background: 'rgba(255,255,255,0.55)',
  backdropFilter: 'blur(24px) saturate(180%)',
  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.4)',
  boxShadow: '0 8px 32px rgba(31,38,135,0.18)',
};

// Telegram sendMediaGroup 一次最多帶 10 張，這裡跟後端的分批邏輯（見 feedback.js）保持同一個上限，
// 前端先擋掉超過的部分，使用者不用送出後才被後端拒絕。
const MAX_IMAGES = 10;

// 「建議」字數上限，純視覺提醒用——超過不會擋輸入，純粹讓使用者知道意見內容偏長，
// 跟後端 feedback.js 真正的硬性驗證（message.length > 2000 才會被拒絕）數字保持一致，
// 這樣「看起來超過建議值」跟「送出真的會失敗」不會兜不起來、造成使用者困惑。
const MESSAGE_SUGGESTED_LIMIT = 2000;
const MESSAGE_COLLAPSED_HEIGHT = 132;
const MESSAGE_EXPANDED_HEIGHT = 300;

// 「新增聯絡方式」二級選單的可選類型。id 是內部識別用的 key，label 是選單與已加項目上顯示的文字，
// inputType／placeholder 用來讓對應的輸入框有正確的鍵盤與提示文字（例如手機號碼喚起數字鍵盤）。
// 'other' 比較特別：需要使用者自己填「名稱」，所以在渲染與送出邏輯裡都會額外判斷這個 id。
const CONTACT_TYPES = [
  { id: 'wechat', label: 'WeChat', placeholder: 'WeChat 帳號' },
  { id: 'qq', label: 'QQ', placeholder: 'QQ 號碼', inputType: 'tel' },
  { id: 'phone', label: '手機號碼', placeholder: '手機號碼', inputType: 'tel' },
  { id: 'email', label: 'E-mail', placeholder: 'E-mail 信箱', inputType: 'email' },
  { id: 'whatsapp', label: 'WhatsApp', placeholder: 'WhatsApp 號碼', inputType: 'tel' },
  { id: 'telegram', label: 'Telegram', placeholder: 'Telegram 帳號' },
  { id: 'discord', label: 'Discord', placeholder: 'Discord 帳號' },
  { id: 'facebook', label: 'Facebook', placeholder: 'Facebook 帳號／連結' },
  { id: 'other', label: '其他', placeholder: '聯絡資訊' },
];
const CONTACT_TYPE_LABEL = Object.fromEntries(CONTACT_TYPES.map(c => [c.id, c.label]));

// 國際區號選擇器的可選國家／地區清單：只需要維護 ISO 代碼＋中文名稱，實際的區號（+86 這種）
// 一律用 getCountryCallingCode() 從 libphonenumber-js 的資料現算，不手動抄一份數字，
// 避免手抄打錯或跟函式庫本身的校驗規則對不上。這份清單涵蓋常見的地區，之後有需要
// 隨時可以再往裡加，不影響其他邏輯。
const RAW_REGIONS = [
  ['CN', '中國大陸'], ['HK', '香港'], ['MO', '澳門'], ['TW', '台灣'],
  ['US', '美國'], ['CA', '加拿大'], ['JP', '日本'], ['KR', '韓國'],
  ['SG', '新加坡'], ['MY', '馬來西亞'], ['TH', '泰國'], ['VN', '越南'],
  ['PH', '菲律賓'], ['ID', '印尼'], ['IN', '印度'], ['GB', '英國'],
  ['FR', '法國'], ['DE', '德國'], ['IT', '義大利'], ['ES', '西班牙'],
  ['PT', '葡萄牙'], ['NL', '荷蘭'], ['BE', '比利時'], ['CH', '瑞士'],
  ['AT', '奧地利'], ['SE', '瑞典'], ['NO', '挪威'], ['DK', '丹麥'],
  ['FI', '芬蘭'], ['IE', '愛爾蘭'], ['PL', '波蘭'], ['RU', '俄羅斯'],
  ['UA', '烏克蘭'], ['TR', '土耳其'], ['GR', '希臘'], ['AU', '澳大利亞'],
  ['NZ', '紐西蘭'], ['AE', '阿聯酋'], ['SA', '沙烏地阿拉伯'], ['IL', '以色列'],
  ['EG', '埃及'], ['ZA', '南非'], ['NG', '奈及利亞'], ['KE', '肯亞'],
  ['BR', '巴西'], ['MX', '墨西哥'], ['AR', '阿根廷'], ['CL', '智利'],
  ['CO', '哥倫比亞'], ['PE', '秘魯'], ['PK', '巴基斯坦'], ['BD', '孟加拉'],
  ['LK', '斯里蘭卡'], ['NP', '尼泊爾'], ['KH', '柬埔寨'], ['MM', '緬甸'],
  ['LA', '寮國'], ['MN', '蒙古'], ['KZ', '哈薩克'], ['UZ', '烏茲別克'],
  ['QA', '卡達'], ['KW', '科威特'], ['OM', '阿曼'], ['JO', '約旦'],
  ['LB', '黎巴嫩'], ['IQ', '伊拉克'], ['CZ', '捷克'], ['HU', '匈牙利'],
  ['RO', '羅馬尼亞'], ['BG', '保加利亞'], ['HR', '克羅埃西亞'], ['RS', '塞爾維亞'],
  ['SK', '斯洛伐克'], ['SI', '斯洛維尼亞'], ['IS', '冰島'], ['LU', '盧森堡'],
];
const REGIONS = RAW_REGIONS.map(([code, name]) => ({ code, name, callingCode: getCountryCallingCode(code) }));
// 最終保底值：時區判斷不到對應國家時才會用到這個（例如瀏覽器回傳了一個不在對照表裡的時區）。
const DEFAULT_PHONE_COUNTRY = 'CN';

// IANA 時區 -> ISO 國家代碼的對照表，只需要覆蓋 REGIONS 清單裡有的國家／地區即可。
// 大國（美國／加拿大／俄羅斯／澳洲）境內有多個時區，這裡把常見的都對應到同一個國家代碼；
// 其餘大多數國家在 Intl 裡通常就只有一個代表時區，一對一列出即可。
const TIMEZONE_TO_COUNTRY = {
  'Asia/Shanghai': 'CN', 'Asia/Urumqi': 'CN',
  'Asia/Hong_Kong': 'HK', 'Asia/Macau': 'MO', 'Asia/Taipei': 'TW',
  'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US',
  'America/Los_Angeles': 'US', 'America/Anchorage': 'US', 'Pacific/Honolulu': 'US',
  'America/Toronto': 'CA', 'America/Vancouver': 'CA', 'America/Edmonton': 'CA',
  'America/Winnipeg': 'CA', 'America/Halifax': 'CA',
  'Asia/Tokyo': 'JP', 'Asia/Seoul': 'KR', 'Asia/Singapore': 'SG',
  'Asia/Kuala_Lumpur': 'MY', 'Asia/Bangkok': 'TH', 'Asia/Ho_Chi_Minh': 'VN',
  'Asia/Manila': 'PH', 'Asia/Jakarta': 'ID', 'Asia/Kolkata': 'IN',
  'Europe/London': 'GB', 'Europe/Paris': 'FR', 'Europe/Berlin': 'DE',
  'Europe/Rome': 'IT', 'Europe/Madrid': 'ES', 'Europe/Lisbon': 'PT',
  'Europe/Amsterdam': 'NL', 'Europe/Brussels': 'BE', 'Europe/Zurich': 'CH',
  'Europe/Vienna': 'AT', 'Europe/Stockholm': 'SE', 'Europe/Oslo': 'NO',
  'Europe/Copenhagen': 'DK', 'Europe/Helsinki': 'FI', 'Europe/Dublin': 'IE',
  'Europe/Warsaw': 'PL', 'Europe/Moscow': 'RU', 'Asia/Yekaterinburg': 'RU',
  'Asia/Novosibirsk': 'RU', 'Asia/Vladivostok': 'RU', 'Europe/Kyiv': 'UA',
  'Europe/Istanbul': 'TR', 'Europe/Athens': 'GR',
  'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Australia/Brisbane': 'AU',
  'Australia/Perth': 'AU', 'Australia/Adelaide': 'AU', 'Pacific/Auckland': 'NZ',
  'Asia/Dubai': 'AE', 'Asia/Riyadh': 'SA', 'Asia/Jerusalem': 'IL',
  'Africa/Cairo': 'EG', 'Africa/Johannesburg': 'ZA', 'Africa/Lagos': 'NG', 'Africa/Nairobi': 'KE',
  'America/Sao_Paulo': 'BR', 'America/Mexico_City': 'MX',
  'America/Argentina/Buenos_Aires': 'AR', 'America/Santiago': 'CL',
  'America/Bogota': 'CO', 'America/Lima': 'PE',
  'Asia/Karachi': 'PK', 'Asia/Dhaka': 'BD', 'Asia/Colombo': 'LK', 'Asia/Kathmandu': 'NP',
  'Asia/Phnom_Penh': 'KH', 'Asia/Yangon': 'MM', 'Asia/Vientiane': 'LA', 'Asia/Ulaanbaatar': 'MN',
  'Asia/Almaty': 'KZ', 'Asia/Tashkent': 'UZ', 'Asia/Qatar': 'QA', 'Asia/Kuwait': 'KW',
  'Asia/Muscat': 'OM', 'Asia/Amman': 'JO', 'Asia/Beirut': 'LB', 'Asia/Baghdad': 'IQ',
  'Europe/Prague': 'CZ', 'Europe/Budapest': 'HU', 'Europe/Bucharest': 'RO',
  'Europe/Sofia': 'BG', 'Europe/Zagreb': 'HR', 'Europe/Belgrade': 'RS',
  'Europe/Bratislava': 'SK', 'Europe/Ljubljana': 'SI',
  'Atlantic/Reykjavik': 'IS', 'Europe/Luxembourg': 'LU',
};

// 新增手機號碼聯絡方式時，用瀏覽器/系統目前的時區去猜預設國家／地區（例如系統時區是
// Asia/Shanghai 就預設 +86、Asia/Tokyo 就預設 +81），對照表裡找不到才退回 DEFAULT_PHONE_COUNTRY。
// 使用者隨時都可以自己在選單裡改，這裡只是決定「一開始選好的是哪一個」。
function detectDefaultPhoneCountry() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return TIMEZONE_TO_COUNTRY[tz] || DEFAULT_PHONE_COUNTRY;
  } catch {
    return DEFAULT_PHONE_COUNTRY;
  }
}

// 失焦時把使用者輸入的號碼重新排版成該國家慣用的格式（例如中國大陸會排成「138 0000 0000」），
// 對應題目要求的「自動套用相應的號碼格式」；只在 libphonenumber-js 能夠解析出來時才重新排版，
// 解析不出來就照使用者原本打的樣子留著，讓下面的錯誤提示去處理，不會憑空改動使用者輸入的內容。
function formatPhoneOnBlur(value, country) {
  if (!value.trim()) return value;
  const parsed = parsePhoneNumberFromString(value, country);
  return parsed ? parsed.formatNational() : value;
}

// 送出前組成完整國際電話號碼（例如 +86 138 0000 0000）。國際區號跟號碼平常分開存在
// contact 物件的 country／value 兩個欄位裡，只有在這裡、真的要送出的當下才組合起來。
function formatPhoneForSubmit(value, country) {
  const parsed = parsePhoneNumberFromString(value, country);
  return parsed ? parsed.formatInternational() : `+${getCountryCallingCode(country)} ${value}`;
}

// 「意見類型」二級選單的可選項目，單選——選了哪個就直接顯示在「意見類型」欄位裡，
// 跟「新增聯絡方式」那組多選、可重複添加的選單性質不同，所以分開兩組常數與各自的 state。
const FEEDBACK_TYPES = ['功能建議', '問題回報', '介面與體驗', '效能問題', '帳號與資料', '隱私與安全', '其他'];

// 把已填寫的聯絡方式陣列組成一段文字，掛在既有的 'contact' 欄位送給後端——
// 後端（feedback.js）本來就只是把 contact 當一段不透明的字串塞進 Telegram caption，
// 這裡改成多行文字（每種聯絡方式一行）完全不需要動後端。
function formatContactsForSubmit(contacts) {
  return contacts
    .map(c => {
      const value = c.value.trim();
      if (!value) return null;
      if (c.type === 'phone') {
        return `手機號碼：${formatPhoneForSubmit(value, c.country || DEFAULT_PHONE_COUNTRY)}`;
      }
      const label = c.type === 'other' ? (c.label.trim() || '其他') : CONTACT_TYPE_LABEL[c.type];
      return `${label}：${value}`;
    })
    .filter(Boolean)
    .join('\n');
}

export default function FeedbackModal({ onClose, isDark = false }) {
  // 這個彈窗是用 createPortal 直接掛到 document.body（見檔案最下方），在 DOM 樹裡
  // 跟 App 裡設定 --ink／--card-bg 等 CSS 變數的 #app-root 是手足關係、不是子孫，
  // 繼承不到那些變數（跟 App.jsx 開頭註解說明的其他幾個 portal 彈窗是同樣的狀況）。
  // 所以這裡兩個二級選單需要精準區分深/淺色的視覺（玻璃底色、邊框、文字），
  // 就直接用 isDark 這個 prop 算出對應色票，不依賴會被斷開繼承的 CSS 變數。
  // 呼叫端記得傳入 isDark={isDark}，沒傳的話預設為淺色模式，不會壞掉但深色模式下配色會不準。
  const DROPDOWN_BG = isDark ? 'rgba(29,32,41,0.94)' : 'rgba(255,255,255,0.94)';
  const DROPDOWN_BORDER = isDark ? '1px solid #2B2F3A' : '1px solid #ECEDF1';
  const DROPDOWN_INK = isDark ? '#F2F3F6' : '#232733';
  const DROPDOWN_ITEM_SELECTED_BG = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(35,39,51,0.05)';

  // 進場／離場動畫：跟 AuthModal 同一套手法——先掛上 DOM（opacity 0 / 背景透明），
  // 下一個 frame 再切成 'shown' 觸發 CSS transition，讓背景淡入、卡片浮現；
  // 關閉時反過來先切 'closing' 播完動畫，再真的呼叫 onClose 把節點卸載。
  const [modalPhase, setModalPhase] = useState('enter');
  const MODAL_DURATION = 180;
  useEffect(() => {
    const id = requestAnimationFrame(() => setModalPhase('shown'));
    return () => cancelAnimationFrame(id);
  }, []);
  function handleClose() {
    if (modalPhase === 'closing') return;
    setModalPhase('closing');
    setTimeout(onClose, MODAL_DURATION);
  }
  const modalShown = modalPhase === 'shown';

  const [message, setMessage] = useState('');
  // 「放大」輸入框：只是換一個高度呈現、方便輸入較長內容，不影響 message 本身的值。
  const [messageExpanded, setMessageExpanded] = useState(false);
  // 意見類型：單選，未選時是空字串——空字串代表「沒有選」，送出時就不會附加這個欄位，
  // 完全不影響原本「只填意見內容就能送出」的流程。
  const [feedbackType, setFeedbackType] = useState('');
  const [feedbackTypeMenuOpen, setFeedbackTypeMenuOpen] = useState(false);
  const feedbackTypeMenuRef = useRef(null);
  // 多筆聯絡方式：每筆是 { id, type, label, value }。label 只有 type === 'other' 時才會用到
  // （使用者自訂的名稱，例如「Line」），其餘類型的顯示名稱直接查 CONTACT_TYPE_LABEL。
  const [contacts, setContacts] = useState([]);
  const [contactMenuOpen, setContactMenuOpen] = useState(false);
  // 選單展開方向：'right'（按鈕右側，優先）／'left'（右側空間不夠就改左側）／
  // 'below'（左右都放不下才退回往下展開的保底方案）。開啟當下量一次可用空間再決定，
  // 不用一直監聽 resize——彈窗開著的當下使用者不太會去轉螢幕方向。
  const [contactMenuPlacement, setContactMenuPlacement] = useState('right');
  const contactMenuRef = useRef(null);
  const CONTACT_MENU_WIDTH = 160;
  const CONTACT_MENU_GAP = 8;
  const contactIdRef = useRef(0);
  // 國際區號選擇器：「新增聯絡方式」選單已經會擋掉重複加第二筆「手機號碼」，
  // 所以任何時候最多只會有一筆 type === 'phone' 的聯絡方式，這裡用單一組 state
  // 就能安全對應到那唯一一筆，不需要用陣列或用 id 分別追蹤每一筆的開合狀態。
  const [phoneCountryMenuOpen, setPhoneCountryMenuOpen] = useState(false);
  const [phoneCountrySearch, setPhoneCountrySearch] = useState('');
  const phoneCountryMenuRef = useRef(null);

  // 按 Esc 關閉：哪個選單／放大狀態最後開的就先收合哪個，都沒開才關閉整個視窗，
  // 跟一般「一次 Esc 只收掉最上層那件事」的操作習慣一致。
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key !== 'Escape' && e.key !== 'Esc') return;
      if (feedbackTypeMenuOpen) setFeedbackTypeMenuOpen(false);
      else if (contactMenuOpen) setContactMenuOpen(false);
      else if (phoneCountryMenuOpen) { setPhoneCountryMenuOpen(false); setPhoneCountrySearch(''); }
      else if (messageExpanded) setMessageExpanded(false);
      else handleClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedbackTypeMenuOpen, contactMenuOpen, phoneCountryMenuOpen, messageExpanded]);

  // 點選單外面的地方就收合「意見類型」選單
  useEffect(() => {
    if (!feedbackTypeMenuOpen) return;
    function handleClickOutside(e) {
      if (feedbackTypeMenuRef.current && !feedbackTypeMenuRef.current.contains(e.target)) setFeedbackTypeMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [feedbackTypeMenuOpen]);

  // 點選單外面的地方就收合「新增聯絡方式」選單
  useEffect(() => {
    if (!contactMenuOpen) return;
    function handleClickOutside(e) {
      if (contactMenuRef.current && !contactMenuRef.current.contains(e.target)) setContactMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [contactMenuOpen]);

  // 點選單外面的地方就收合國際區號選擇器（順便清掉搜尋字串，下次打開是乾淨的狀態）
  useEffect(() => {
    if (!phoneCountryMenuOpen) return;
    function handleClickOutside(e) {
      if (phoneCountryMenuRef.current && !phoneCountryMenuRef.current.contains(e.target)) {
        setPhoneCountryMenuOpen(false);
        setPhoneCountrySearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [phoneCountryMenuOpen]);

  // 已加入的類型（'其他' 除外）就不再顯示在選單裡，避免使用者不小心重複加兩個 WeChat；
  // 「其他」允許加很多個（例如同時想留 Line 跟 Signal），所以不受這個限制。
  const usedTypes = new Set(contacts.filter(c => c.type !== 'other').map(c => c.type));
  const availableContactTypes = CONTACT_TYPES.filter(c => c.id === 'other' || !usedTypes.has(c.id));

  function addContact(typeId) {
    contactIdRef.current += 1;
    // 手機號碼類型多帶一個 country 欄位，預設值改成依系統時區偵測（偵測不到才退回 +86）；
    // 其餘類型不需要這個欄位，維持原樣。
    const extra = typeId === 'phone' ? { country: detectDefaultPhoneCountry() } : {};
    setContacts(prev => [...prev, { id: contactIdRef.current, type: typeId, label: '', value: '', ...extra }]);
    setContactMenuOpen(false);
  }

  function updateContact(id, patch) {
    setContacts(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)));
  }

  function removeContact(id) {
    setContacts(prev => prev.filter(c => c.id !== id));
  }

  // 開啟選單當下量一次按鈕跟螢幕邊界的距離，優先往右展開；右側放不下改左側；
  // 兩側都放不下（極窄螢幕）才退回往下展開，並保留原本的「不超出螢幕邊界」保底。
  function toggleContactMenu() {
    if (!contactMenuOpen && contactMenuRef.current) {
      const rect = contactMenuRef.current.getBoundingClientRect();
      const spaceRight = window.innerWidth - rect.right;
      const spaceLeft = rect.left;
      if (spaceRight >= CONTACT_MENU_WIDTH + CONTACT_MENU_GAP) setContactMenuPlacement('right');
      else if (spaceLeft >= CONTACT_MENU_WIDTH + CONTACT_MENU_GAP) setContactMenuPlacement('left');
      else setContactMenuPlacement('below');
    }
    setContactMenuOpen(v => !v);
  }
  // 多圖：每張存 { file, url }，url 是 URL.createObjectURL 產生的本機預覽網址，
  // 卸載或移除圖片時要記得 revoke，不然分頁開久了會累積記憶體。
  const [images, setImages] = useState([]);
  const [status, setStatus] = useState(''); // '', 'sending', 'success', 'error'
  const [feedbackCode, setFeedbackCode] = useState(''); // 送出成功後後端回傳的短碼，例如 FB8K2N9
  const [codeCopied, setCodeCopied] = useState(false); // 短暫顯示「已複製」的圖示反饋

  // 送出成功那一刻，表單畫面切換成感謝畫面，這裡讓感謝畫面本身也做一個淡入＋輕微上浮的
  // 進場動畫（跟外層視窗進場同一套手法：先掛上 DOM/opacity 0，下一個 frame 再切換觸發
  // CSS transition），不是整個視窗重新開合，只是這塊內容自己的進場效果。
  const [successEntered, setSuccessEntered] = useState(false);
  const SUCCESS_ANIM_DURATION = 260;
  useEffect(() => {
    if (status !== 'success') { setSuccessEntered(false); return; }
    const id = requestAnimationFrame(() => setSuccessEntered(true));
    return () => cancelAnimationFrame(id);
  }, [status]);

  // 複製編號到剪貼簿；navigator.clipboard 在非 https（少數 WebView）環境可能不存在，
  // 用 try/catch 包起來，複製失敗就靜默失敗，不影響其他功能。
  async function copyFeedbackCode() {
    try {
      await navigator.clipboard.writeText(feedbackCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 1500);
    } catch {
      // 複製失敗就算了，不打斷使用者，畫面上編號本來就看得到可以手動抄
    }
  }
  const [previewIndex, setPreviewIndex] = useState(null); // 點縮圖後開啟的燈箱，null 表示沒開
  const fileInputRef = useRef(null);

  useEffect(() => {
    // 元件卸載時，把目前還沒被 revoke 的所有預覽網址一次清掉
    return () => {
      images.forEach(img => URL.revokeObjectURL(img.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFilesSelected(e) {
    const picked = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    e.target.value = ''; // 允許連續選同一批檔案也能觸發 change
    if (!picked.length) return;
    setImages(prev => {
      const room = MAX_IMAGES - prev.length;
      const toAdd = picked.slice(0, Math.max(room, 0)).map(file => ({ file, url: URL.createObjectURL(file) }));
      return [...prev, ...toAdd];
    });
  }

  function removeImage(index) {
    setImages(prev => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((_, i) => i !== index);
    });
    setPreviewIndex(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!message.trim() || status === 'sending') return;
    setStatus('sending');

    const formData = new FormData();
    formData.append('message', message);
    if (feedbackType) formData.append('feedbackType', feedbackType);
    const contactText = formatContactsForSubmit(contacts);
    if (contactText) formData.append('contact', contactText);
    // 多張圖片用同一個欄位名重複 append，後端用 form.getAll('images') 收成陣列，
    // 再決定要 sendMediaGroup（相簿效果）還是逐張 sendPhoto。
    images.forEach(img => formData.append('images', img.file, img.file.name || 'image.jpg'));

    try {
      const res = await fetch('/api/feedback', { method: 'POST', body: formData });
      const data = await res.json();
      setStatus(data.ok ? 'success' : 'error');
      if (data.ok && data.code) setFeedbackCode(data.code);
    } catch {
      setStatus('error');
    }
  }

  return createPortal(
    <>
      <div
        className="fixed inset-0 flex items-center justify-center px-6"
        style={{
          zIndex: 200,
          background: modalShown ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0)',
          transition: `background ${MODAL_DURATION}ms cubic-bezier(0.22, 1, 0.36, 1)`,
        }}
        onClick={handleClose}
      >
        <div
          className="w-full max-w-sm rounded-2xl p-5"
          style={{
            ...FEEDBACK_GLASS,
            opacity: modalShown ? 1 : 0,
            transform: modalShown ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.97)',
            transition: `opacity ${MODAL_DURATION}ms ease, transform ${MODAL_DURATION}ms cubic-bezier(0.22, 1, 0.36, 1)`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black" style={{ color: INK }}>意見反饋</h2>
            <button onClick={handleClose} style={{ color: INK_SOFT }}>
              <X size={20} />
            </button>
          </div>

          {status === 'success' ? (
            <div
              className="py-6 text-center"
              style={{
                opacity: successEntered ? 1 : 0,
                transform: successEntered ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.96)',
                transition: `opacity ${SUCCESS_ANIM_DURATION}ms ease, transform ${SUCCESS_ANIM_DURATION}ms cubic-bezier(0.22, 1, 0.36, 1)`,
              }}
            >
              <p className="text-2xl font-black" style={{ color: INK }}>提交成功！</p>
              <p className="text-sm mt-3 leading-relaxed" style={{ color: INK }}>
                感謝您提供寶貴的意見與建議。我們已成功收到您的反饋，相關內容將由我們認真審閱與處理。
              </p>
              {feedbackCode && (
                <div className="flex items-center justify-center gap-1.5 mt-3">
                  <span className="text-sm font-bold" style={{ color: INK }}>
                    反饋編號：{feedbackCode}
                  </span>
                  <button
                    type="button"
                    onClick={copyFeedbackCode}
                    className="flex items-center justify-center rounded-lg flex-shrink-0"
                    style={{ width: 24, height: 24, color: codeCopied ? ACCENT : INK_SOFT }}
                    title="複製編號"
                  >
                    {codeCopied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              )}
              <p className="text-xs mt-3 leading-relaxed" style={{ color: INK_SOFT }}>
                請妥善保存此編號，後續與我們聯繫時提供此編號，有助於我們快速確認相關反饋內容。我們也會在必要時透過您提供的聯絡方式與您聯繫。
              </p>
              <p className="text-xs mt-3 leading-relaxed" style={{ color: INK_SOFT }}>
                再次感謝您的反饋，您的意見將作為我們持續改善與優化服務的重要參考。
              </p>
              <button
                onClick={handleClose}
                className="mt-4 px-4 py-2 rounded-xl text-sm font-bold"
                style={{ background: ACCENT, color: '#fff' }}
              >
                關閉
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {/* 意見類型：單選欄位，樣式跟下面的 textarea／輸入框同一套 token（INPUT_BG／CARD_BORDER／
                  rounded-xl），視覺上是「一個可點的輸入框」而不是獨立的按鈕語彙，跟整體表單風格一致。
                  點擊後展開二級選單，選好某一項就直接寫回這個欄位、選單自動收合。 */}
              <div className="relative" ref={feedbackTypeMenuRef}>
                <button
                  type="button"
                  onClick={() => setFeedbackTypeMenuOpen(v => !v)}
                  className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-sm"
                  style={{ background: INPUT_BG, color: feedbackType ? INK : INK_SOFT, border: CARD_BORDER }}
                >
                  <span>{feedbackType || '意見類型（選填）'}</span>
                  <ChevronDown size={14} style={{ color: INK_SOFT, transform: feedbackTypeMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms ease', flexShrink: 0 }} />
                </button>
                {feedbackTypeMenuOpen && (
                  <div
                    className="absolute left-0 right-0 mt-2 rounded-xl overflow-hidden z-20"
                    style={{
                      background: DROPDOWN_BG,
                      backdropFilter: 'blur(20px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                      border: DROPDOWN_BORDER,
                      boxShadow: '0 10px 30px rgba(35,39,51,0.22)',
                    }}
                  >
                    {FEEDBACK_TYPES.map(ft => (
                      <button
                        key={ft}
                        type="button"
                        onClick={() => { setFeedbackType(ft); setFeedbackTypeMenuOpen(false); }}
                        className="w-full text-left px-3 py-2 text-sm"
                        style={{ color: ft === feedbackType ? ACCENT : DROPDOWN_INK, background: ft === feedbackType ? DROPDOWN_ITEM_SELECTED_BG : 'transparent' }}
                      >
                        {ft}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* 意見內容輸入區：外層是統一的圓角背景容器（INPUT_BG／CARD_BORDER，深淺色都會跟著
                  CSS 變數切換，對比度由 App 既有的色票保證），textarea 本身貼滿容器、背景透明，
                  右上角疊字數統計、右下角疊放大／收合按鈕——都用 padding 讓輸入文字自動避開，
                  不會被蓋住。展開只是改容器高度＋CSS transition，內容與游標位置完全不受影響。 */}
              <div
                className="relative w-full rounded-xl overflow-hidden"
                style={{
                  background: INPUT_BG,
                  border: CARD_BORDER,
                  height: messageExpanded ? MESSAGE_EXPANDED_HEIGHT : MESSAGE_COLLAPSED_HEIGHT,
                  transition: 'height 220ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              >
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="想跟我們說什麼？"
                  required
                  className="absolute inset-0 w-full h-full text-sm outline-none resize-none bg-transparent"
                  style={{ color: INK, padding: '28px 12px 34px 12px', border: 'none' }}
                />
                {/* 字數統計：純視覺提醒，不設 maxLength，超過建議字數也能繼續輸入；
                    只有超過時前面的數字變紅，斜線後的建議上限文字顏色維持不變。 */}
                <span
                  className="absolute top-2 right-3 text-[11px] font-bold pointer-events-none"
                  style={{ color: INK_SOFT }}
                >
                  <span style={{ color: message.length > MESSAGE_SUGGESTED_LIMIT ? DANGER : INK_SOFT }}>
                    {message.length}
                  </span>
                  /{MESSAGE_SUGGESTED_LIMIT}
                </span>
                <button
                  type="button"
                  onClick={() => setMessageExpanded(v => !v)}
                  className="absolute bottom-2 right-2 flex items-center justify-center rounded-lg"
                  style={{ width: 24, height: 24, background: 'var(--card-border)', color: INK_SOFT }}
                  title={messageExpanded ? '收起輸入框' : '放大輸入框'}
                >
                  {messageExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                </button>
              </div>
              {/* 「新增聯絡方式」按鈕＋二級選單：self-start 讓按鈕維持原本的緊湊寬度（不像
                  textarea／意見類型欄位撐滿整列），右側才會有空間讓選單往右展開。
                  選好類型後，對應的輸入框會動態出現在下方（見下面 contacts.map 那一段）。 */}
              <div className="relative self-start" ref={contactMenuRef}>
                <button
                  type="button"
                  onClick={toggleContactMenu}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold"
                  style={{ border: '1px dashed var(--card-border)', color: INK_SOFT }}
                >
                  新增聯絡方式
                  {availableContactTypes.length > 0 && (
                    <ChevronDown size={14} style={{ transform: contactMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms ease' }} />
                  )}
                </button>
                {contactMenuOpen && availableContactTypes.length > 0 && (
                  <div
                    className="absolute rounded-xl overflow-hidden z-20"
                    style={{
                      width: CONTACT_MENU_WIDTH,
                      top: contactMenuPlacement === 'below' ? 'calc(100% + 8px)' : 0,
                      left: contactMenuPlacement === 'right' ? 'calc(100% + 8px)' : (contactMenuPlacement === 'below' ? 0 : 'auto'),
                      right: contactMenuPlacement === 'left' ? 'calc(100% + 8px)' : 'auto',
                      background: DROPDOWN_BG,
                      backdropFilter: 'blur(20px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                      border: DROPDOWN_BORDER,
                      boxShadow: '0 10px 30px rgba(35,39,51,0.22)',
                    }}
                  >
                    {availableContactTypes.map(ct => (
                      <button
                        key={ct.id}
                        type="button"
                        onClick={() => addContact(ct.id)}
                        className="w-full text-left px-3 py-2 text-sm"
                        style={{ color: DROPDOWN_INK }}
                      >
                        {ct.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 已加入的聯絡方式：每一筆都是可直接編輯的輸入框＋刪除按鈕。
                  '其他' 多一個「名稱」輸入框；'phone'（手機號碼）多一個國際區號選擇器，
                  格式與校驗規則都交給 libphonenumber-js，依所選國家／地區動態套用。 */}
              {contacts.length > 0 && (
                <div className="flex flex-col gap-2">
                  {contacts.map(c => {
                    // 手機號碼：只有在使用者實際輸入過內容、且格式不符合所選國家／地區規則時才顯示錯誤，
                    // 純視覺提醒，不會擋住送出（跟上面「意見內容」字數統計同一套不強制阻擋的邏輯）。
                    const phoneInvalid =
                      c.type === 'phone' && c.value.trim() !== '' && !isValidPhoneNumber(c.value, c.country || DEFAULT_PHONE_COUNTRY);
                    const phoneCountrySearchLower = phoneCountrySearch.trim().toLowerCase();
                    const filteredRegions = phoneCountrySearchLower
                      ? REGIONS.filter(ct =>
                          ct.name.toLowerCase().includes(phoneCountrySearchLower) ||
                          ct.code.toLowerCase().includes(phoneCountrySearchLower) ||
                          ct.callingCode.includes(phoneCountrySearchLower.replace('+', ''))
                        )
                      : REGIONS;

                    return (
                      <div key={c.id} className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="flex-shrink-0 text-xs font-bold px-2 py-2 rounded-xl text-center"
                            style={{ background: INPUT_BG, color: INK_SOFT, minWidth: 64 }}
                          >
                            {CONTACT_TYPE_LABEL[c.type]}
                          </span>

                          {c.type === 'other' ? (
                            <input
                              type="text"
                              value={c.label}
                              onChange={(e) => updateContact(c.id, { label: e.target.value })}
                              placeholder="名稱，如 Line"
                              className="flex-1 min-w-0 rounded-xl px-3 py-2 text-sm outline-none"
                              style={{ background: INPUT_BG, color: INK, border: CARD_BORDER }}
                            />
                          ) : c.type === 'phone' ? (
                            <>
                              {/* 國際區號選擇器：點擊展開可搜尋的國家／地區清單，選好之後只收合選單、
                                  不影響已經輸入的號碼本身——國際區號跟號碼分開存在 country／value 兩個
                                  欄位，送出時才由 formatPhoneForSubmit 組成完整國際電話號碼。 */}
                              <div className="relative" ref={phoneCountryMenuRef}>
                                <button
                                  type="button"
                                  onClick={() => setPhoneCountryMenuOpen(v => !v)}
                                  className="flex items-center gap-1 px-2 py-2 rounded-xl text-sm flex-shrink-0"
                                  style={{ background: INPUT_BG, color: INK, border: CARD_BORDER }}
                                >
                                  <span>+{getCountryCallingCode(c.country || DEFAULT_PHONE_COUNTRY)}</span>
                                  <ChevronDown size={12} style={{ color: INK_SOFT, transform: phoneCountryMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms ease' }} />
                                </button>
                                {phoneCountryMenuOpen && (
                                  <div
                                    className="absolute left-0 top-full mt-2 rounded-xl overflow-hidden z-30 flex flex-col"
                                    style={{ width: 220, background: DROPDOWN_BG, backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', border: DROPDOWN_BORDER, boxShadow: '0 10px 30px rgba(35,39,51,0.22)' }}
                                  >
                                    <div className="p-2" style={{ borderBottom: DROPDOWN_BORDER }}>
                                      <input
                                        type="text"
                                        value={phoneCountrySearch}
                                        onChange={(e) => setPhoneCountrySearch(e.target.value)}
                                        placeholder="搜尋國家／地區或區號"
                                        autoFocus
                                        className="w-full rounded-lg px-2 py-1.5 text-xs outline-none"
                                        style={{ background: INPUT_BG, color: INK, border: CARD_BORDER }}
                                      />
                                    </div>
                                    <div className="overflow-y-auto" style={{ maxHeight: 200 }}>
                                      {filteredRegions.map(ct => (
                                        <button
                                          key={ct.code}
                                          type="button"
                                          onClick={() => { updateContact(c.id, { country: ct.code }); setPhoneCountryMenuOpen(false); setPhoneCountrySearch(''); }}
                                          className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm"
                                          style={{ color: ct.code === c.country ? ACCENT : DROPDOWN_INK, background: ct.code === c.country ? DROPDOWN_ITEM_SELECTED_BG : 'transparent' }}
                                        >
                                          <span className="flex-1 truncate">{ct.name}</span>
                                          <span style={{ color: INK_SOFT }}>+{ct.callingCode}</span>
                                        </button>
                                      ))}
                                      {filteredRegions.length === 0 && (
                                        <p className="px-3 py-4 text-xs text-center" style={{ color: INK_SOFT }}>找不到符合的國家／地區</p>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1" />
                            </>
                          ) : (
                            <input
                              type={CONTACT_TYPES.find(t => t.id === c.type)?.inputType || 'text'}
                              value={c.value}
                              onChange={(e) => updateContact(c.id, { value: e.target.value })}
                              placeholder={CONTACT_TYPES.find(t => t.id === c.type)?.placeholder}
                              className="flex-1 min-w-0 rounded-xl px-3 py-2 text-sm outline-none"
                              style={{ background: INPUT_BG, color: INK, border: CARD_BORDER }}
                            />
                          )}

                          <button
                            type="button"
                            onClick={() => removeContact(c.id)}
                            className="flex-shrink-0 flex items-center justify-center rounded-full"
                            style={{ width: 26, height: 26, color: INK_SOFT }}
                          >
                            <X size={14} />
                          </button>
                        </div>

                        {c.type === 'other' && (
                          <input
                            type="text"
                            value={c.value}
                            onChange={(e) => updateContact(c.id, { value: e.target.value })}
                            placeholder="聯絡資訊"
                            className="rounded-xl px-3 py-2 text-sm outline-none"
                            style={{ marginLeft: 72, background: INPUT_BG, color: INK, border: CARD_BORDER }}
                          />
                        )}

                        {c.type === 'phone' && (
                          <>
                            <input
                              type="tel"
                              value={c.value}
                              onChange={(e) => updateContact(c.id, { value: e.target.value })}
                              onBlur={(e) => updateContact(c.id, { value: formatPhoneOnBlur(e.target.value, c.country || DEFAULT_PHONE_COUNTRY) })}
                              placeholder="手機號碼"
                              className="rounded-xl px-3 py-2 text-sm outline-none"
                              style={{ marginLeft: 72, background: INPUT_BG, color: INK, border: phoneInvalid ? `1px solid ${DANGER}` : CARD_BORDER }}
                            />
                            {phoneInvalid && (
                              <p className="text-xs" style={{ marginLeft: 72, color: DANGER }}>
                                請輸入有效的手機號碼
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 圖片縮圖列：已選的圖片＋一個「新增」方塊，超過上限就不再顯示新增方塊 */}
              <div className="flex flex-wrap gap-2">
                {images.map((img, i) => (
                  <div
                    key={img.url}
                    className="relative rounded-lg overflow-hidden flex-shrink-0"
                    style={{ width: 64, height: 64, border: CARD_BORDER }}
                  >
                    <img
                      src={img.url}
                      alt=""
                      onClick={() => setPreviewIndex(i)}
                      className="w-full h-full object-cover cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                      className="absolute flex items-center justify-center rounded-full"
                      style={{ top: 3, right: 3, width: 18, height: 18, background: 'rgba(0,0,0,0.55)', color: '#fff' }}
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
                {images.length < MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    className="flex items-center justify-center gap-1.5 rounded-lg flex-shrink-0 px-3 text-xs font-bold"
                    style={{ height: 64, border: '1px dashed var(--card-border)', color: INK_SOFT }}
                  >
                    <Plus size={20} />
                    上傳圖片檔案
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFilesSelected}
                className="hidden"
              />
              {images.length > 0 && (
                <p className="text-[11px]" style={{ color: INK_SOFT }}>
                  已選 {images.length}/{MAX_IMAGES} 張圖片，點縮圖可預覽
                </p>
              )}

              {status === 'error' && (
                <p className="text-xs font-bold" style={{ color: DANGER }}>
                  傳送失敗，請稍後再試
                </p>
              )}

              <button
                type="submit"
                disabled={status === 'sending'}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold mt-1"
                style={{ background: ACCENT, color: '#fff', opacity: status === 'sending' ? 0.6 : 1 }}
              >
                <Send size={14} />
                {status === 'sending' ? '傳送中...' : '送出'}
              </button>

              {/* 替代反饋方式：跟表單本身用同一個 flex-col + gap-3 的間距節奏，
                  不需要額外加 margin，分隔線與下面的 mailto 連結自然融入既有留白。 */}
              <div className="flex items-center gap-3">
                <div className="flex-1" style={{ height: 1, background: 'var(--card-border)' }} />
                <span className="flex-shrink-0 text-xs font-bold" style={{ color: INK_SOFT }}>或</span>
                <div className="flex-1" style={{ height: 1, background: 'var(--card-border)' }} />
              </div>
              <a
                href="mailto:support@timezzw.top"
                className="block text-center text-sm font-bold active:opacity-70"
                style={{ color: ACCENT, textDecoration: 'underline', textUnderlineOffset: 3 }}
              >
                向我們的電子郵箱傳送郵件
              </a>
            </form>
          )}
        </div>
      </div>

      {/* 圖片燈箱：點縮圖後全螢幕預覽，支援左右切換與點空白處/叉叉關閉 */}
      {previewIndex !== null && images[previewIndex] && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 260, background: 'rgba(0,0,0,0.85)' }}
          onClick={() => setPreviewIndex(null)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setPreviewIndex(null); }}
            className="absolute flex items-center justify-center rounded-full"
            style={{ top: 16, right: 16, width: 36, height: 36, background: 'rgba(255,255,255,0.15)', color: '#fff' }}
          >
            <X size={18} />
          </button>

          {images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setPreviewIndex(i => (i - 1 + images.length) % images.length); }}
              className="absolute flex items-center justify-center rounded-full"
              style={{ left: 12, width: 40, height: 40, background: 'rgba(255,255,255,0.15)', color: '#fff' }}
            >
              <ChevronLeft size={20} />
            </button>
          )}

          <img
            src={images[previewIndex].url}
            alt=""
            onClick={(e) => e.stopPropagation()}
            className="max-w-[88vw] max-h-[80vh] rounded-lg object-contain"
          />

          {images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setPreviewIndex(i => (i + 1) % images.length); }}
              className="absolute flex items-center justify-center rounded-full"
              style={{ right: 12, width: 40, height: 40, background: 'rgba(255,255,255,0.15)', color: '#fff' }}
            >
              <ChevronRight size={20} />
            </button>
          )}

          {images.length > 1 && (
            <p
              className="absolute text-xs font-bold"
              style={{ bottom: 20, color: '#fff', opacity: 0.8 }}
            >
              {previewIndex + 1} / {images.length}
            </p>
          )}
        </div>
      )}
    </>,
    document.body
  );
}

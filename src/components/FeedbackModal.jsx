import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Plus, ChevronLeft, ChevronRight } from 'lucide-react';

const ACCENT = 'var(--accent, #6C7BE0)';
const INK = 'var(--ink)';
const INK_SOFT = 'var(--ink-soft)';
const CARD_BORDER = '1px solid var(--card-border)';
const INPUT_BG = 'var(--input-bg)';

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

export default function FeedbackModal({ onClose }) {
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

  // 按 Esc 關閉（跟 App 其他彈窗一致的操作習慣）
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape' || e.key === 'Esc') handleClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  // 多圖：每張存 { file, url }，url 是 URL.createObjectURL 產生的本機預覽網址，
  // 卸載或移除圖片時要記得 revoke，不然分頁開久了會累積記憶體。
  const [images, setImages] = useState([]);
  const [status, setStatus] = useState(''); // '', 'sending', 'success', 'error'
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
    if (contact) formData.append('contact', contact);
    // 多張圖片用同一個欄位名重複 append，後端用 form.getAll('images') 收成陣列，
    // 再決定要 sendMediaGroup（相簿效果）還是逐張 sendPhoto。
    images.forEach(img => formData.append('images', img.file, img.file.name || 'image.jpg'));

    try {
      const res = await fetch('/api/feedback', { method: 'POST', body: formData });
      const data = await res.json();
      setStatus(data.ok ? 'success' : 'error');
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
            <h2 className="text-lg font-black" style={{ color: INK }}>意見回饋</h2>
            <button onClick={handleClose} style={{ color: INK_SOFT }}>
              <X size={20} />
            </button>
          </div>

          {status === 'success' ? (
            <div className="py-6 text-center">
              <p className="text-sm font-bold" style={{ color: INK }}>感謝您的意見！</p>
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
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="想跟我們說什麼？"
                maxLength={2000}
                required
                rows={4}
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ background: INPUT_BG, color: INK, border: CARD_BORDER }}
              />
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="聯絡方式（選填）"
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ background: INPUT_BG, color: INK, border: CARD_BORDER }}
              />

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
                    className="flex items-center justify-center rounded-lg flex-shrink-0"
                    style={{ width: 64, height: 64, border: '1px dashed var(--card-border)', color: INK_SOFT }}
                  >
                    <Plus size={20} />
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
                <p className="text-xs font-bold" style={{ color: '#FF004A' }}>
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

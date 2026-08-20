import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Send } from 'lucide-react';

const ACCENT = 'var(--accent, #6C7BE0)';
const INK = 'var(--ink)';
const INK_SOFT = 'var(--ink-soft)';
const CARD_BG = 'var(--card-bg)';
const CARD_BORDER = '1px solid var(--card-border)';
const INPUT_BG = 'var(--input-bg)';

export default function FeedbackModal({ onClose }) {
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [status, setStatus] = useState(''); // '', 'sending', 'success', 'error'

  async function handleSubmit(e) {
    e.preventDefault();
    if (!message.trim() || status === 'sending') return;
    setStatus('sending');

    const formData = new FormData();
    formData.append('message', message);
    if (contact) formData.append('contact', contact);
    if (imageFile) formData.append('image', imageFile);

    try {
      const res = await fetch('/api/feedback', { method: 'POST', body: formData });
      const data = await res.json();
      setStatus(data.ok ? 'success' : 'error');
    } catch {
      setStatus('error');
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center px-6"
      style={{ background: 'rgba(0,0,0,0.4)', zIndex: 200 }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-5"
        style={{ background: CARD_BG, border: CARD_BORDER }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black" style={{ color: INK }}>意見回饋</h2>
          <button onClick={onClose} style={{ color: INK_SOFT }}>
            <X size={20} />
          </button>
        </div>

        {status === 'success' ? (
          <div className="py-6 text-center">
            <p className="text-sm font-bold" style={{ color: INK }}>感謝您的意見！</p>
            <button
              onClick={onClose}
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
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files[0] || null)}
              className="text-xs"
              style={{ color: INK_SOFT }}
            />

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
    </div>,
    document.body
  );
}

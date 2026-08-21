export const config = { runtime: 'edge' };

// Telegram sendMediaGroup 一次最多帶 10 個項目、且至少要 2 個項目（1 張要改用 sendPhoto），
// 這裡統一切成每批最多 10 張，超過 10 張的部分就依序（迴圈）送出下一批，
// 達成「多圖也能穩定送出、又盡量用相簿效果」的效果。
const MEDIA_GROUP_MAX = 10;

// 每筆回饋的短碼：固定前綴 sgxufb（純識別用，不提供隨機性）+ 5 碼時間戳記（base36，取最後
// 5 碼）+ 5 碼純數字隨機碼，方便在 Telegram 裡肉眼辨識／引用。保證等級跟前一版一樣是
// 「機率夠低」而非「保證唯一」：
// - 時間戳記那 5 碼本質是「目前毫秒數 mod 36^5」，大約每 16.8 小時就會完整繞回重複一次
//   （數學上確定會發生的週期性重複，不是機率問題）。
// - 只有當兩筆意見剛好落在同一個週期內的同一毫秒送出時，才需要靠後面的隨機數字避免撞號；
//   5 碼純數字只有 10^5 = 10 萬種組合，比前一版「4 碼英數混合」的 168 萬種組合少了超過
//   16 倍，撞號機率會比前一版略高，但對小規模使用仍然足夠低，不用擔心。
// - 這裡完全沒有查資料庫確認是否已存在同樣的碼——單純是「機率夠低到小規模使用不用擔心」，
//   不是嚴格唯一鍵。之後如果接了 Firestore（見前面的雙向回覆方案），建議直接拿
//   Firestore 自動產生的 feedbackId（保證唯一）取代這裡的短碼，或送出前先查一次是否重複。
function generateFeedbackCode() {
  const time = Date.now().toString(36).toUpperCase().slice(-5);
  const rand = Array.from({ length: 5 }, () => Math.floor(Math.random() * 10)).join('');
  return `sgxufb${time}${rand}`;
}

async function sendMessage(caption) {
  return fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: process.env.CHAT_ID, text: caption }),
  });
}

async function sendSinglePhoto(image, caption) {
  const tgForm = new FormData();
  tgForm.append('chat_id', process.env.CHAT_ID);
  if (caption) tgForm.append('caption', caption);
  tgForm.append('photo', image, image.name || 'image.jpg');
  return fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendPhoto`, {
    method: 'POST',
    body: tgForm,
  });
}

// 把一批（2~10 張）圖片包成一個 sendMediaGroup 請求：caption 只掛在第一張上，
// Telegram 會把整批顯示成同一則訊息裡的相簿（跟手動一張一張 sendPhoto 比起來，
// 使用者端看到的是「一次收到一組相片」而不是洗版式的多則訊息）。
async function sendMediaGroup(images, caption) {
  const tgForm = new FormData();
  tgForm.append('chat_id', process.env.CHAT_ID);
  const media = images.map((image, i) => {
    const attachName = `photo${i}`;
    tgForm.append(attachName, image, image.name || `image${i}.jpg`);
    return {
      type: 'photo',
      media: `attach://${attachName}`,
      ...(i === 0 && caption ? { caption } : {}),
    };
  });
  tgForm.append('media', JSON.stringify(media));
  return fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMediaGroup`, {
    method: 'POST',
    body: tgForm,
  });
}

// 送一批圖片：只有 1 張時 sendMediaGroup 會被 Telegram 拒絕（至少要 2 個項目），
// 所以這裡統一分流——1 張走 sendPhoto，2 張以上才走 sendMediaGroup。
async function sendImageChunk(chunk, caption) {
  if (chunk.length === 1) return sendSinglePhoto(chunk[0], caption);
  return sendMediaGroup(chunk, caption);
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), { status: 405 });
  }

  const form = await req.formData();
  const message = form.get('message');
  const contact = form.get('contact');
  // 前端「意見類型」二級選單選填欄位；沒選時 form.get 會是 null，caption 組字串時直接跳過，
  // 不影響原本「只填意見內容也能送出」的行為。
  const feedbackType = form.get('feedbackType');
  // 前端用同一個欄位名 'images' 重複 append 多張圖，這裡用 getAll 收成陣列；
  // 過濾掉空檔案（例如選取後又被使用者清空的情況）。
  const images = form.getAll('images').filter(f => f && typeof f === 'object' && f.size > 0);

  if (!message || typeof message !== 'string' || message.length > 2000) {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid message' }), { status: 400 });
  }

  const feedbackCode = generateFeedbackCode();
  const caption = `📩 新意見反饋 #${feedbackCode}${feedbackType ? `（${feedbackType}）` : ''}\n\n${message}${contact ? `\n\n聯絡方式：${contact}` : ''}`;

  try {
    if (images.length === 0) {
      // 沒有圖片：純文字訊息
      const tgRes = await sendMessage(caption);
      if (!tgRes.ok) throw new Error('Telegram API error');
    } else {
      // 有圖片：依序（迴圈）把圖片切成每批最多 10 張送出，
      // caption 只掛在第一批的第一張上，避免同一則反饋的說明文字被重複貼好幾次。
      for (let i = 0; i < images.length; i += MEDIA_GROUP_MAX) {
        const chunk = images.slice(i, i + MEDIA_GROUP_MAX);
        const isFirstChunk = i === 0;
        const tgRes = await sendImageChunk(chunk, isFirstChunk ? caption : undefined);
        if (!tgRes.ok) throw new Error('Telegram API error');
      }
    }

    return new Response(JSON.stringify({ ok: true, code: feedbackCode }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: 'Failed to send' }), { status: 500 });
  }
}

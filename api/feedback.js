export const config = { runtime: 'edge' };

// Telegram sendMediaGroup 一次最多帶 10 個項目、且至少要 2 個項目（1 張要改用 sendPhoto），
// 這裡統一切成每批最多 10 張，超過 10 張的部分就依序（迴圈）送出下一批，
// 達成「多圖也能穩定送出、又盡量用相簿效果」的效果。
const MEDIA_GROUP_MAX = 10;

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
  // 前端用同一個欄位名 'images' 重複 append 多張圖，這裡用 getAll 收成陣列；
  // 過濾掉空檔案（例如選取後又被使用者清空的情況）。
  const images = form.getAll('images').filter(f => f && typeof f === 'object' && f.size > 0);

  if (!message || typeof message !== 'string' || message.length > 2000) {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid message' }), { status: 400 });
  }

  const caption = `📩 新意見反饋\n\n${message}${contact ? `\n\n聯絡方式：${contact}` : ''}`;

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

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: 'Failed to send' }), { status: 500 });
  }
}

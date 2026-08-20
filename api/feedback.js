export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), { status: 405 });
  }

  const form = await req.formData();
  const message = form.get('message');
  const contact = form.get('contact');
  const image = form.get('image'); // File 物件，沒有的話是 null

  if (!message || typeof message !== 'string' || message.length > 2000) {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid message' }), { status: 400 });
  }

  const caption = `📩 新意見反饋\n\n${message}${contact ? `\n\n聯絡方式：${contact}` : ''}`;

  try {
    let tgRes;

    if (image && image.size > 0) {
      // 有圖片：用 sendPhoto
      const tgForm = new FormData();
      tgForm.append('chat_id', process.env.CHAT_ID);
      tgForm.append('caption', caption);
      tgForm.append('photo', image, image.name || 'image.jpg');

      tgRes = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        body: tgForm,
      });
    } else {
      // 沒圖片：用 sendMessage
      tgRes = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: process.env.CHAT_ID, text: caption }),
      });
    }

    if (!tgRes.ok) throw new Error('Telegram API error');

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: 'Failed to send' }), { status: 500 });
  }
}

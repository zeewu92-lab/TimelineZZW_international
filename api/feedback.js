export const config = { runtime: 'edge' };
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { message, contact } = req.body;

  if (!message || typeof message !== 'string' || message.length > 2000) {
    return res.status(400).json({ ok: false, error: 'Invalid message' });
  }

  const text = `📩 新意見反饋\n\n${message}${contact ? `\n\n聯絡方式：${contact}` : ''}`;

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: process.env.CHAT_ID, text })
    });

    if (!tgRes.ok) throw new Error('Telegram API error');

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Failed to send' });
  }
}

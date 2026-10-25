// POST /api/jarvis {text, hist:[{u,a}], lang, name} -> {reply}
// Open conversation for the Jarvis voice assistant. Only the spoken/typed sentence and a few earlier turns are sent.
// Vault data (passwords, usernames, account names) is never part of the request.
const { limited } = require('./_lib');

const clean = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ').trim().slice(0, n);

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(503).json({ error: 'Jarvis AI configure nahi hai (ANTHROPIC_API_KEY daalo).' });
  const b = req.body || {};
  const text = clean(b.text, 400);
  if (!text) return res.status(400).json({ error: 'Kuch bolo.' });
  const ip = String((req.headers && req.headers['x-forwarded-for']) || '').split(',')[0].trim() || 'ip';
  if (limited('j:' + ip, 40, 60 * 60 * 1000)) return res.status(429).json({ error: 'Bahut zyada sawal. Thodi der baad try karo.' });

  const hi = b.lang === 'hi-IN';
  const name = clean(b.name, 24) || 'Jarvis';
  const system =
    `Tum "${name}" ho, PassFast naam ke password vault app ka friendly voice assistant (Iron Man ke Jarvis jaisa). ` +
    `User se dost ki tarah natural baat karo. Tumhara jawab bolkar sunaya jayega, isliye sirf 1 se 3 chhote vakya, ` +
    `bina markdown, list, emoji ya special symbols ke. ` +
    (hi ? 'Jawab Hindi me, Devanagari lipi me do.' : 'Jawab simple Hinglish (Roman) me do; user English me bole to English me.') +
    ` Tum vault ke passwords, usernames ya account ke naam nahi dekh sakte; unke baare me andaza mat lagao. ` +
    `Agar user kisi account ka password dikhane, copy, edit, delete ya naya account jodne ko kahe, bolo: ` +
    `"Account ke naam ke saath bolo, jaise: Gmail ka password dikhao." ` +
    `Password, OTP ya card number kabhi mat maango. Pata na ho to saaf bolo ki pata nahi.`;

  const messages = [];
  const hist = Array.isArray(b.hist) ? b.hist.slice(-6) : [];
  for (const h of hist) {
    const u = clean(h && h.u, 300), a = clean(h && h.a, 400);
    if (u && a) messages.push({ role: 'user', content: u }, { role: 'assistant', content: a });
  }
  messages.push({ role: 'user', content: text });

  let r;
  try {
    r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: process.env.JARVIS_MODEL || 'claude-haiku-5-5', max_tokens: 220, system, messages })
    });
  } catch (e) { return res.status(502).json({ error: 'AI tak pahunch nahi paaye.' }); }
  if (!r.ok) return res.status(502).json({ error: 'AI abhi jawab nahi de paaya.' });
  let j; try { j = await r.json(); } catch (e) { return res.status(502).json({ error: 'AI ka jawab samajh nahi aaya.' }); }
  const raw = (j.content || []).filter((c) => c.type === 'text').map((c) => c.text).join(' ');
  const reply = raw.replace(/[*_`#>~|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 500);
  if (!reply) return res.status(502).json({ error: 'Khaali jawab aaya.' });
  res.status(200).json({ reply });
};

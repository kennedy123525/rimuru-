const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, 'stickers');
const CHANCE = 1; // 1 = sticker on every reply, 0.5 = about half of replies
const MOOD_NAMES = ['angry', 'happy', 'sad', 'laugh', 'surprised', 'neutral'];
const MAX_BYTES = 100 * 1024;
const cache = new Map();
const pending = new Map(); // chat id -> mood chosen for the next reply

// Backup guess from keywords, used only when no mood was chosen.
const MOODS = [
  ['laugh', /(lol|lmao|haha|hehe|funny|joke|hilarious)|😂|🤣|😆/i],
  ['angry', /\b(angry|furious|mad|rage|annoy\w*|shut up|stupid|idiot|dumb|hate|pissed|irritat\w*|how dare|damn|trash|fool|disrespect\w*|insult\w*|enough)\b|😡|🤬|😠/i],
  ['sad', /\b(sad|sorry|cry\w*|miss|lonely|hurt|unfortunately|depress\w*|alone|regret|sigh)\b|😢|😭|😔|🥲/i],
  ['surprised', /(wow|whoa|omg|no way|really\?|seriously\?|huh\?|what\?|surpris\w*|shock\w*)|😮|😲|😳|🤯/i],
  ['happy', /\b(happy|glad|great|awesome|nice|love|thanks?|thank you|welcome|yay|excellent|proud|cool|wonderful|enjoy)\b|😊|😄|😁|🥰|💙|❤/i],
];

function detectMood(...texts) {
  for (const t of texts) {
    if (!t) continue;
    for (const [mood, re] of MOODS) if (re.test(t)) return mood;
  }
  return 'neutral';
}

// Remembers the mood for the next reply in this chat.
function setMood(jid, mood) {
  if (MOOD_NAMES.includes(mood)) pending.set(jid, mood);
}

// Pulls a [mood:xxx] tag off the end of an AI answer. Returns { text, mood }.
function splitMood(answer) {
  const src = answer || '';
  const m = /\[\s*mood\s*[:=]\s*([a-z]+)\s*\]/i.exec(src);
  const text = src.replace(/\[\s*mood\s*[:=]\s*[a-z]+\s*\]/gi, '').trim();
  return { text, mood: m ? m[1].toLowerCase() : null };
}

function filesIn(dir) {
  try {
    return fs.readdirSync(dir)
      .filter((f) => /\.(webp|png|jpe?g)$/i.test(f))
      .map((f) => path.join(dir, f));
  } catch {
    return [];
  }
}

function pickFile(mood) {
  let pool = filesIn(path.join(ROOT, mood));
  if (!pool.length) pool = filesIn(path.join(ROOT, 'neutral'));
  if (!pool.length) pool = filesIn(ROOT);
  if (!pool.length) pool = MOOD_NAMES.flatMap((m) => filesIn(path.join(ROOT, m)));
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

// Same method as the .s command: 512x512 rounded WebP using only sharp.
async function toSticker(buf) {
  const S = 512;
  const mask = Buffer.from(`<svg width="${S}" height="${S}"><rect width="${S}" height="${S}" rx="96" ry="96" fill="#fff"/></svg>`);
  for (const quality of [85, 65, 45, 30]) {
    const out = await sharp(buf)
      .resize(S, S, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .composite([{ input: mask, blend: 'dest-in' }])
      .webp({ quality })
      .toBuffer();
    if (out.length <= MAX_BYTES) return out;
  }
  return null;
}

async function load(file) {
  if (cache.has(file)) return cache.get(file);
  const raw = fs.readFileSync(file);
  const buf = /\.webp$/i.test(file) ? raw : await toSticker(raw);
  if (buf) cache.set(file, buf);
  return buf;
}

async function maybeSend(sock, jid, replyText, userText) {
  try {
    const chosen = pending.get(jid);
    pending.delete(jid);
    if (Math.random() > CHANCE) return;
    const file = pickFile(chosen || detectMood(replyText, userText));
    if (!file) return;
    const sticker = await load(file);
    if (!sticker) return;
    await sock.sendMessage(jid, { sticker });
  } catch (e) {
    console.error('Sticker failed:', e.message);
  }
}

module.exports = { maybeSend, detectMood, setMood, splitMood };
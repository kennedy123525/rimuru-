// View-once reveal (owner / sub-owner only)
//   .vv   reply to a view-once image / video / voice note: Rimuru resends it as normal media
//   .vv2  same, but the revealed media goes to your DM instead of the chat
// WhatsApp strips the download info when a view-once message is quoted in a reply, so the bot
// keeps its own copy of each view-once message that reaches it (memory only, about 1 hour).
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const log = require('./logger');

const KINDS = { imageMessage: 'image', videoMessage: 'video', audioMessage: 'audio' };
const MAX_SAVED = 30;
const MAX_AGE_MS = 60 * 60 * 1000;
const MAX_BYTES = 25 * 1024 * 1024;
const saved = new Map(); // message id -> { found, buffer, at }

function findViewOnce(quoted) {
  let m = quoted;
  let wrapped = false;
  for (let i = 0; i < 5 && m; i++) {
    const vo = m.viewOnceMessage || m.viewOnceMessageV2 || m.viewOnceMessageV2Extension;
    if (vo) { wrapped = true; m = vo.message; continue; }
    if (m.ephemeralMessage) { m = m.ephemeralMessage.message; continue; }
    break;
  }
  if (!m) return null;
  for (const key of Object.keys(KINDS)) {
    const node = m[key];
    if (node && (wrapped || node.viewOnce === true)) return { key, type: KINDS[key], node };
  }
  return null;
}

async function toBuffer(node, type) {
  const stream = await downloadContentFromMessage(node, type);
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function buildContent({ key, node }, buffer) {
  if (key === 'imageMessage') return { image: buffer, caption: node.caption || '' };
  if (key === 'videoMessage') return { video: buffer, caption: node.caption || '', mimetype: node.mimetype || 'video/mp4' };
  return { audio: buffer, mimetype: node.mimetype || 'audio/ogg; codecs=opus', ptt: node.ptt === true };
}

function dmTarget(ctx) {
  if (!ctx.isGroup) return ctx.jid;
  const k = ctx.msg.key;
  return [k.participantPn, k.participantAlt, ctx.sender].find((j) => j && j.endsWith('@s.whatsapp.net')) || ctx.sender;
}

function trim() {
  const now = Date.now();
  for (const [id, s] of saved) if (now - s.at > MAX_AGE_MS) saved.delete(id);
  while (saved.size > MAX_SAVED) saved.delete(saved.keys().next().value);
}

// Called for every incoming message: keeps a copy of view-once media so .vv can use it later.
async function capture(msg) {
  try {
    const id = msg && msg.key && msg.key.id;
    if (!id || !msg.message) return;
    const found = findViewOnce(msg.message);
    if (!found) return;
    const buffer = await toBuffer(found.node, found.type);
    if (!buffer.length || buffer.length > MAX_BYTES) return;
    saved.set(id, { found, buffer, at: Date.now() });
    trim();
  } catch (e) {
    log.warn('view-once capture failed:', e.message);
  }
}

async function reveal(ctx, toDm) {
  try {
    const quotedId = ctx.ctxInfo && ctx.ctxInfo.stanzaId;
    const copy = quotedId && saved.get(quotedId);
    let found, buffer;
    if (copy) {
      found = copy.found;
      buffer = copy.buffer;
    } else {
      found = findViewOnce(ctx.ctxInfo && ctx.ctxInfo.quotedMessage);
      if (!found) return await ctx.reply('Reply to a view-once message');
      buffer = await toBuffer(found.node, found.type);
    }
    if (!buffer || !buffer.length) throw new Error('empty download');
    const content = buildContent(found, buffer);

    if (toDm) {
      const dm = dmTarget(ctx);
      await ctx.sock.sendMessage(dm, content);
      if (dm !== ctx.jid) await ctx.sock.sendMessage(ctx.jid, { react: { text: '✅', key: ctx.msg.key } }).catch(() => {});
    } else {
      await ctx.sock.sendMessage(ctx.jid, content, { quoted: ctx.msg });
    }
  } catch (e) {
    log.error('vv failed:', e.message);
    await ctx.reply("Couldn't reveal that one. I can only reveal view-once messages that reached me while I was online (up to about an hour ago).").catch(() => {});
  }
}

module.exports = [
  { name: 'vv', category: 'OWNER', menu: ['vv'], ownerOnly: true, run: (ctx) => reveal(ctx, false) },
  { name: 'vv2', category: 'OWNER', menu: ['vv2'], ownerOnly: true, run: (ctx) => reveal(ctx, true) },
];
module.exports.capture = capture;
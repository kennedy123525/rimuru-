
const { gifToMp4 } = require('./ffmpeg');

const reactions = [
  { name: 'hug', emoji: '🤗', action: 'hugs' },
  { name: 'pat', emoji: '🥰', action: 'pats' },
  { name: 'highfive', emoji: '🙌', action: 'high-fives' },
  { name: 'wave', emoji: '👋', action: 'waves at' },
  { name: 'dance', emoji: '💃', action: 'dances with' },
  { name: 'cry', emoji: '😭', action: 'cries with' },
  { name: 'poke', emoji: '👉', action: 'pokes' },
  { name: 'bonk', emoji: '✨', action: 'playfully bonks' },
  { name: 'smile', emoji: '😊', action: 'smiles at' },
  { name: 'wink', emoji: '😉', action: 'winks at' },
  { name: 'smug', emoji: '😏', action: 'looks smug at' },
  { name: 'facepalm', emoji: '🤦', action: 'facepalms at' },
  { name: 'kiss', emoji: '😘', action: 'kisses' },
];

const commands = reactions.map((reaction) => ({
  name: reaction.name,
  category: 'REACTION',
  menu: [
    `${reaction.name} @user`,
    `${reaction.name} (reply to someone)`,
  ],

  run: async (ctx) => {
    const target =
      ctx.mentioned?.[0] ||
      ctx.ctxInfo?.participant;

    if (!target) {
      return ctx.reply(
        `Tag someone or reply to their message to use .${reaction.name}!`
      );
    }

    try {
      // Request 5 GIFs from the API
      const apiResponse = await fetch(
        `https://nekos.best/api/v2/${reaction.name}?amount=5`,
        {
          headers: {
            'User-Agent':
              'RimuruWhatsAppBot (https://github.com/kennedy123525/rimuru-)'
          },
        }
      );

      if (!apiResponse.ok) {
        throw new Error(`GIF API failed: ${apiResponse.status}`);
      }

      const data = await apiResponse.json();
      const results = (data.results || []).filter(
        (item) => item.url &&
          item.url.toLowerCase().endsWith('.gif')
      );

      if (results.length === 0) {
        throw new Error('No GIFs returned');
      }

      // Randomly select one of the available GIFs
      const selected =
        results[Math.floor(Math.random() * results.length)];

      // Download selected GIF
      const gifResponse = await fetch(selected.url);

      if (!gifResponse.ok) {
        throw new Error('GIF download failed');
      }

      const gifBuffer = Buffer.from(
        await gifResponse.arrayBuffer()
      );

      // Convert GIF to WhatsApp-compatible MP4
      const mp4Buffer = await gifToMp4(gifBuffer);

      const sender = ctx.sender;

      const mentions = [...new Set(
        [sender, target].filter(Boolean)
      )];

      const senderTag = sender
        ? `@${sender.split('@')[0]}`
        : 'Someone';

      const targetTag = `@${target.split('@')[0]}`;

      return ctx.sock.sendMessage(ctx.jid, {
        video: mp4Buffer,
        gifPlayback: true,
        caption:
          `${reaction.emoji} ${senderTag} ${reaction.action} ${targetTag}!`,
        mentions,
      });

    } catch (error) {
      console.error(`${reaction.name} GIF error:`, error);

      return ctx.reply(
        `❌ Couldn't send the ${reaction.name} GIF. Try again later.`
      );
    }
  },
}));

module.exports = commands;

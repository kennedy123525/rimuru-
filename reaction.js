
// Public Anime GIF reaction commands
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
  { name: 'slap', emoji: '😵', action: 'does a cartoon slap to' },
];

const commands = reactions.map((reaction) => ({
  name: reaction.name,
  category: 'REACTION',
  menu: [`${reaction.name} @user`, `${reaction.name} (reply to someone)`],

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
      // Get a real animated GIF
      const apiResponse = await fetch(
        `https://nekos.best/api/v2/${reaction.name}`
      );

      if (!apiResponse.ok) {
        throw new Error('GIF API request failed');
      }

      const data = await apiResponse.json();
      const gifUrl = data.results?.[0]?.url;

      if (!gifUrl || !gifUrl.toLowerCase().endsWith('.gif')) {
        throw new Error('No animated GIF returned');
      }

      // Download the GIF
      const gifResponse = await fetch(gifUrl);

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
        caption: `${reaction.emoji} ${senderTag} ${reaction.action} ${targetTag}!`,
        mentions,
      });

    } catch (error) {
      console.error(`${reaction.name} GIF error:`, error);

      return ctx.reply(
        `❌ Couldn't send the ${reaction.name} GIF. Please try again.`
      );
    }
  },
}));

module.exports = commands;

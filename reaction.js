
// Public Anime GIF reaction commands
const { gifToMp4 } = require('./ffmpeg');

const reactions = [
  {
    name: 'hug',
    endpoint: 'hug',
    emoji: '🤗',
    action: 'hugs',
    fallbackUrl: 'https://media1.tenor.com/m/yrdaKdQ69WYAAAAd/hug.gif',
  },
  { name: 'pat', endpoint: 'pat', emoji: '🥰', action: 'pats' },
  { name: 'highfive', endpoint: 'highfive', emoji: '🙌', action: 'high-fives' },
  { name: 'wave', endpoint: 'wave', emoji: '👋', action: 'waves at' },
  { name: 'dance', endpoint: 'dance', emoji: '💃', action: 'dances with' },
  { name: 'cry', endpoint: 'cry', emoji: '😭', action: 'cries with' },
  { name: 'poke', endpoint: 'poke', emoji: '👉', action: 'pokes' },
  { name: 'bonk', endpoint: 'bonk', emoji: '✨', action: 'playfully bonks' },
  { name: 'smile', endpoint: 'smile', emoji: '😊', action: 'smiles at' },
  { name: 'wink', endpoint: 'wink', emoji: '😉', action: 'winks at' },
  { name: 'smug', endpoint: 'smug', emoji: '😏', action: 'gives a smug look to' },
  { name: 'slap', endpoint: 'slap', emoji: '😵', action: 'does a cartoon slap to' },
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
        `Please tag someone or reply to their message to use .${reaction.name}!`
      );
    }

    try {
      let gifBuffer;

      if (reaction.fallbackUrl) {
        const response = await fetch(reaction.fallbackUrl);

        if (!response.ok) {
          throw new Error('GIF download failed');
        }

        gifBuffer = Buffer.from(await response.arrayBuffer());
      } else {
        const apiResponse = await fetch(
          `https://api.waifu.pics/sfw/${reaction.endpoint}`
        );

        if (!apiResponse.ok) {
          throw new Error('Reaction API failed');
        }

        const data = await apiResponse.json();

        if (!data.url) {
          throw new Error('No GIF was returned');
        }

        const gifResponse = await fetch(data.url);

        if (!gifResponse.ok) {
          throw new Error('GIF download failed');
        }

        gifBuffer = Buffer.from(
          await gifResponse.arrayBuffer()
        );
      }

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
        `❌ I couldn't send the ${reaction.name} GIF. Try again later.`
      );
    }
  },
}));

module.exports = commands;

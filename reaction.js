// Public GIF reaction commands
const reactions = [
  {
    name: 'hug',
    category: 'REACTION',
    menu: ['hug @user'],
    gif: 'PASTE_HUG_GIF_MP4_URL_HERE',

    run: async (ctx) => {
      const target = ctx.mentioned?.[0];

      if (!target) {
        return ctx.reply('🤗 Tag someone to hug!');
      }

      return ctx.sock.sendMessage(ctx.jid, {
        video: { url: reactions[0].gif },
        gifPlayback: true,
        caption: `🤗 @${target.split('@')[0]} receives a warm hug from ${ctx.senderName}!`,
        mentions: [target],
      });
    },
  },
];

module.exports = reactions;
// Public reaction commands
const reactions = [
  {
    name: 'hug',
    category: 'REACTION',
    menu: ['hug @user'],
    run: (ctx) => {
      const target = ctx.mentioned?.[0];
      if (!target) return ctx.reply('🤗 Tag someone to give them a hug!');

      return ctx.sock.sendMessage(ctx.jid, {
        text: `🤗 @${target.split('@')[0]} receives a warm hug from ${ctx.senderName}!`,
        mentions: [target],
      });
    },
  },
  {
    name: 'pat',
    category: 'REACTION',
    menu: ['pat @user'],
    run: (ctx) => {
      const target = ctx.mentioned?.[0];
      if (!target) return ctx.reply('😊 Tag someone to give them a friendly pat!');

      return ctx.sock.sendMessage(ctx.jid, {
        text: `😊 @${target.split('@')[0]} receives a friendly pat from ${ctx.senderName}!`,
        mentions: [target],
      });
    },
  },
];

module.exports = reactions;
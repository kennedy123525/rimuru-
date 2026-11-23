// Public reaction commands
const reactions = [
  {
    name: 'hug',
    category: 'REACTION',
    menu: ['hug @user'],
    run: (ctx) => {
      const target = ctx.mentioned[0];
      if (!target) return ctx.reply('🤗 Tag someone to give them a hug!');
      return ctx.reply(`🤗 ${ctx.senderName} gives ${target.split('@')[0]} a warm hug!`);
    },
  },
  {
    name: 'pat',
    category: 'REACTION',
    menu: ['pat @user'],
    run: (ctx) => {
      const target = ctx.mentioned[0];
      if (!target) return ctx.reply('😊 Tag someone to give them a pat!');
      return ctx.reply(`😊 ${ctx.senderName} gives ${target.split('@')[0]} a friendly pat!`);
    },
  },
];

module.exports = reactions;
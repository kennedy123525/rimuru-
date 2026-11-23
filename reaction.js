
// Public Anime GIF reaction commands
const { gifToMp4 } = require('./ffmpeg');

const reactions = [
  {
    name: 'hug',
    category: 'REACTION',
    menu: ['hug @user'],

    run: async (ctx) => {
      const target = ctx.mentioned?.[0];

      if (!target) {
        return ctx.reply('🤗 Tag someone to hug!');
      }

      try {
        const response = await fetch(
          'https://media1.tenor.com/m/yrdaKdQ69WYAAAAd/hug.gif'
        );

        if (!response.ok) {
          throw new Error('GIF download failed');
        }

        const gifBuffer = Buffer.from(
          await response.arrayBuffer()
        );

        const mp4Buffer = await gifToMp4(gifBuffer);

        return ctx.sock.sendMessage(ctx.jid, {
          video: mp4Buffer,
          gifPlayback: true,
          caption: `🤗 @${target.split('@')[0]} receives an anime hug!`,
          mentions: [target],
        });
      } catch (error) {
        console.error('Hug GIF error:', error);
        return ctx.reply('❌ I could not send the hug GIF.');
      }
    },
  },
];

module.exports = reactions;

// Group tools: add, kick, mute and more.
const settings = require('./settings');
const { numberOf } = require('./jid');
const { groupInfo } = require('./groupTools');

async function guard(ctx) {
  if (!ctx.isGroup) { await ctx.reply('Groups only.'); return null; }
  const info = await groupInfo(ctx.sock, ctx.jid);
  if (!ctx.isOwner && !info.admins.has(ctx.senderNum)) { await ctx.reply('Admins only.'); return null; }
  if (!info.botIsAdmin) { await ctx.reply("Make me an admin first. I can't do that otherwise."); return null; }
  return info;
}

const ADD_STATUS = {
  200: 'added',
  403: "their privacy settings block adding them",
  408: 'they left recently and cannot be re-added yet',
  409: 'already in the group',
};

module.exports = [
  {
    name: 'add', category: 'GROUP TOOLS', menu: ['add <number>'],
    run: async (ctx) => {
      const info = await guard(ctx);
      if (!info) return;
      const nums = ctx.args.map((a) => a.replace(/\D/g, '')).filter((n) => n.length >= 7 && n.length <= 15);
      if (!nums.length) return ctx.reply(`Give me a number with country code.\nExample: ${settings.prefix()}add 2348012345678`);
      const res = await ctx.sock.groupParticipantsUpdate(ctx.jid, nums.map((n) => `${n}@s.whatsapp.net`), 'add');
      const lines = (res || []).map((r) => `${numberOf(r.jid)}: ${ADD_STATUS[r.status] || `failed (${r.status})`}`);
      return ctx.reply(lines.join('\n') || 'Nothing happened.');
    },
  },
  {
    name: 'kick', category: 'GROUP TOOLS', menu: ['kick @user'],
    run: async (ctx) => {
      const info = await guard(ctx);
      if (!info) return;
      let targets = ctx.mentioned.length ? ctx.mentioned : (ctx.ctxInfo?.participant ? [ctx.ctxInfo.participant] : []);
      targets = [...new Set(targets)];
      if (!targets.length) return ctx.reply(`Tag who to remove, or reply to their message.\nExample: ${settings.prefix()}kick @user`);
      const protectedIds = settings.protectedIds();
      const blocked = targets.filter((j) => {
        const n = numberOf(j);
        return info.botNumbers.includes(n) || settings.isOwner(n) || protectedIds.includes(n);
      });
      if (blocked.length) return ctx.reply("Not him. Not me either. Pick someone else.");
      const res = await ctx.sock.groupParticipantsUpdate(ctx.jid, targets, 'remove');
      const failed = (res || []).filter((r) => String(r.status) !== '200');
      return ctx.reply(failed.length ? "Couldn't remove everyone. Admins can't be removed by me." : 'Gone.');
    },
  },
  {
    name: 'mute', category: 'GROUP TOOLS', menu: ['mute'],
    run: async (ctx) => {
      const info = await guard(ctx);
      if (!info) return;
      await ctx.sock.groupSettingUpdate(ctx.jid, 'announcement');
      return ctx.reply('Group muted. Only admins can send messages now.');
    },
  },
  {
    name: 'warn', category: 'GROUP TOOLS', menu: ['warn @user'],
    run: async (ctx) => {
      const info = await guard(ctx);
      if (!info) return;

      const target = ctx.mentioned?.[0] || ctx.ctxInfo?.participant;
      if (!target) return ctx.reply('Tag or reply to the person you want to warn.');

      const num = numberOf(target);
      if (num === ctx.senderNum || num === numberOf(ctx.sock.user.id)) {
        return ctx.reply('You cannot warn yourself or the bot.');
      }

if (settings.isOwner(num) || settings.isSubOwner(num)) { 
        return ctx.reply('You cannot warn a protected user.');
      }

      const count = settings.addWarning(ctx.jid, num);

      if (count >= 3) {
        if (info.admins.has(num)) {
          return ctx.reply(`${target} has ${count} warnings, but is an admin. Demote them before removal.`);
        }

        await ctx.sock.groupParticipantsUpdate(ctx.jid, [target], 'remove');

        for (let i = 0; i < count; i++) {
          settings.clearWarning(ctx.jid, num);
        }

        return ctx.reply(`${target} reached 3 warnings and has been removed from the group.`);
      }

      return ctx.reply(`${target} has received a warning. Total: ${count}/3.`);
    },
  },
  {
    name: 'unwarn', category: 'GROUP TOOLS', menu: ['unwarn @user'],
    run: async (ctx) => {
      const info = await guard(ctx);
      if (!info) return;

      const target = ctx.mentioned?.[0] || ctx.ctxInfo?.participant;
      if (!target) return ctx.reply('Tag or reply to the person whose warning you want to remove.');

      const num = numberOf(target);
      const current = settings.getWarnings(ctx.jid, num);

      if (!current) return ctx.reply('That user has no warnings.');

      const remaining = settings.clearWarning(ctx.jid, num);
      return ctx.reply(`One warning removed. Remaining warnings: ${remaining}/3.`);
    },
  },
  {
    name: 'unmute', category: 'GROUP TOOLS', menu: ['unmute'],
    run: async (ctx) => {
      const info = await guard(ctx);
      if (!info) return;
      await ctx.sock.groupSettingUpdate(ctx.jid, 'not_announcement');
      return ctx.reply('Group unmuted. Everyone can send messages now.');
    },
  },
];
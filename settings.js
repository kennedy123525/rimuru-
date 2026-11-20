isAiOn, setAi, isProtectOn, setProtect, prefix, setPrefix,
isBlocked, addBlocked, removeBlocked,// Switches and small facts that survive restarts:
// AI on/off per chat, Kennedy protection, claimed owner ids, prefix, AFK list.
const config = require('./config');
const { createStore } = require('./jsonStore');

const store = createStore('settings', { aiOff: {}, protectEnabled: null, claimed: [], protectAlias: [], subOwners: [], prefix: null, afk: {}, sleeping: {}, warnings: {}, blocked: [] });

function d() {
  const s = store.data;
  s.aiOff = s.aiOff || {};
  s.claimed = s.claimed || [];
  s.protectAlias = s.protectAlias || [];
  s.subOwners = s.subOwners || [];
  s.sleeping = s.sleeping || {};
  s.afk = s.afk || {};
  s.warnings = s.warnings || {};
  s.blocked = s.blocked || [];
  if (s.protectEnabled === undefined) s.protectEnabled = null;
  if (s.prefix === undefined) s.prefix = null;
  return s;
}
const uniq = (a) => [...new Set(a)];

// --- Blocked users
const isBlocked = (num) => d().blocked.includes(num);

function addBlocked(nums) {
  const s = d();
  s.blocked = uniq([...s.blocked, ...nums.filter(Boolean)]);
  store.save();
}

function removeBlocked(nums) {
  const s = d();
  s.blocked = s.blocked.filter((n) => !nums.includes(n));
  store.save();
}

// --- AI on/off per chat
const isAiOn = (chatId) => !d().aiOff[chatId];
function setAi(chatId, on) { if (on) delete d().aiOff[chatId]; else d().aiOff[chatId] = true; store.save(); }

// --- Kennedy protection switch
const isProtectOn = () => (d().protectEnabled === null ? config.protectedContact.enabled : d().protectEnabled);
function setProtect(on) { d().protectEnabled = Boolean(on); store.save(); }

// --- Command prefix
const prefix = () => d().prefix || config.prefix;
function setPrefix(p) { d().prefix = p && p !== config.prefix ? p : null; store.save(); }

// --- Owner / protected identities (phone numbers AND hidden LIDs, digits only)
const claimed = () => d().claimed.slice();
const isMainOwner = (num) => config.owner.ids.includes(num) || d().claimed.includes(num);
const isSubOwner = (num) => d().subOwners.includes(num);
const isOwner = (num) => isMainOwner(num) || isSubOwner(num); // may use owner-only commands
const subOwners = () => d().subOwners.slice();
function addSubOwners(nums) {
  const before = d().subOwners.length;
  d().subOwners = uniq([...d().subOwners, ...nums.filter((n) => n && !isMainOwner(n))]);
  if (d().subOwners.length !== before) store.save();
  return d().subOwners.length - before;
}
function removeSubOwners(nums) {
  const before = d().subOwners.length;
  d().subOwners = d().subOwners.filter((n) => !nums.includes(n));
  if (d().subOwners.length !== before) store.save();
  return before - d().subOwners.length;
}
function addClaimed(nums) {
  const before = d().claimed.length;
  d().claimed = uniq([...d().claimed, ...nums.filter(Boolean)]);
  if (d().claimed.length !== before) store.save();
  return d().claimed.length !== before;
}
function clearClaimed() { d().claimed = []; d().protectAlias = []; store.save(); }
function addProtectAlias(nums) {
  const before = d().protectAlias.length;
  d().protectAlias = uniq([...d().protectAlias, ...nums.filter(Boolean)]);
  if (d().protectAlias.length !== before) store.save();
}
const protectedIds = () => uniq([...config.protectedContact.ids, ...d().claimed, ...d().protectAlias]);

// --- Sleep: while asleep in a chat, Rimuru ignores everything there except the owner's wake-up
const isAsleep = (chatId) => Boolean(d().sleeping[chatId]);
function setSleep(chatId, on) { if (on) d().sleeping[chatId] = true; else delete d().sleeping[chatId]; store.save(); }

// --- Warnings
const getWarnings = (chatId, num) => d().warnings[chatId]?.[num] || 0;

function addWarning(chatId, num) {
  const s = d();
  if (!s.warnings[chatId]) s.warnings[chatId] = {};
  s.warnings[chatId][num] = (s.warnings[chatId][num] || 0) + 1;
  store.save();
  return s.warnings[chatId][num];
}

function clearWarning(chatId, num) {
  const s = d();
  if (!s.warnings[chatId]?.[num]) return 0;

  s.warnings[chatId][num]--;

  if (s.warnings[chatId][num] <= 0) {
    delete s.warnings[chatId][num];
  }

  if (!Object.keys(s.warnings[chatId]).length) {
    delete s.warnings[chatId];
  }

  store.save();
  return s.warnings[chatId]?.[num] || 0;
}

// --- AFK
const getAfk = (num) => d().afk[num] || null;
function setAfk(num, info) { d().afk[num] = info; store.save(); }
function clearAfk(num) { delete d().afk[num]; store.save(); }

module.exports = {
  isAiOn, setAi, isProtectOn, setProtect, prefix, setPrefix,
  isBlocked, addBlocked, removeBlocked,
  claimed, isOwner, isMainOwner, isSubOwner, subOwners,
  addSubOwners, removeSubOwners, addClaimed, clearClaimed,
  addProtectAlias, protectedIds,
  getAfk, setAfk, clearAfk, isAsleep, setSleep,
  getWarnings, addWarning, clearWarning,
  init: async () => { await store.load(); d(); },
};

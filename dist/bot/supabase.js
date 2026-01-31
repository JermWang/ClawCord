"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
exports.getGuildSettings = getGuildSettings;
exports.updateGuildSettings = updateGuildSettings;
exports.logCall = logCall;
exports.hasPostedToken = hasPostedToken;
const supabase_js_1 = require("@supabase/supabase-js");
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.warn('⚠️ Supabase not configured - using in-memory storage');
}
exports.supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
    ? (0, supabase_js_1.createClient)(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    : null;
const DEFAULT_SETTINGS = {
    channel_id: null,
    min_score: 6.5,
    autopost: false,
    show_volume: true,
    show_holders: true,
    show_links: true,
    policy_preset: 'default',
};
// In-memory fallback
const memoryCache = new Map();
async function getGuildSettings(guildId, guildName) {
    // Try Supabase first
    if (exports.supabase) {
        const { data, error } = await exports.supabase
            .from('guild_settings')
            .select('*')
            .eq('guild_id', guildId)
            .single();
        if (data) {
            return {
                guild_id: data.guild_id,
                guild_name: data.guild_name,
                channel_id: data.channel_id,
                min_score: parseFloat(data.min_score),
                autopost: data.autopost,
                show_volume: data.show_volume,
                show_holders: data.show_holders,
                show_links: data.show_links,
                policy_preset: data.policy_preset,
            };
        }
        // Create new record if not found
        if (error?.code === 'PGRST116') {
            const newSettings = { guild_id: guildId, guild_name: guildName, ...DEFAULT_SETTINGS };
            await exports.supabase.from('guild_settings').insert(newSettings);
            return newSettings;
        }
    }
    // Fallback to memory
    if (!memoryCache.has(guildId)) {
        memoryCache.set(guildId, { guild_id: guildId, guild_name: guildName, ...DEFAULT_SETTINGS });
    }
    return memoryCache.get(guildId);
}
async function updateGuildSettings(guildId, updates) {
    if (exports.supabase) {
        await exports.supabase
            .from('guild_settings')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('guild_id', guildId);
    }
    // Also update memory cache
    const current = memoryCache.get(guildId) || { guild_id: guildId, ...DEFAULT_SETTINGS };
    memoryCache.set(guildId, { ...current, ...updates });
}
async function logCall(guildId, tokenAddress, tokenSymbol, score, marketCap, liquidity, messageId) {
    if (exports.supabase) {
        await exports.supabase.from('call_history').insert({
            guild_id: guildId,
            token_address: tokenAddress,
            token_symbol: tokenSymbol,
            score,
            market_cap: marketCap,
            liquidity,
            message_id: messageId,
        });
    }
}
async function hasPostedToken(guildId, tokenAddress, withinHours = 24) {
    if (exports.supabase) {
        const cutoff = new Date(Date.now() - withinHours * 60 * 60 * 1000).toISOString();
        const { data } = await exports.supabase
            .from('call_history')
            .select('id')
            .eq('guild_id', guildId)
            .eq('token_address', tokenAddress)
            .gte('posted_at', cutoff)
            .limit(1);
        return (data?.length || 0) > 0;
    }
    return false;
}
//# sourceMappingURL=supabase.js.map
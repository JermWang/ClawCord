"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStorage = getStorage;
const supabase_js_1 = require("@supabase/supabase-js");
const policies_1 = require("./policies");
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
    ? (0, supabase_js_1.createClient)(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    : null;
if (!supabase) {
    console.warn("⚠️ Supabase not configured - using in-memory storage");
}
const VALID_POLICY_PRESETS = [
    "fresh-scanner",
    "momentum",
    "dip-hunter",
    "whale-follow",
    "deployer-reputation",
    "community-strength",
];
function normalizePreset(value) {
    if (!value)
        return "momentum";
    const preset = value;
    return VALID_POLICY_PRESETS.includes(preset) ? preset : "momentum";
}
function parseDate(value) {
    if (!value)
        return new Date();
    return value instanceof Date ? value : new Date(value);
}
function parseNumber(value, fallback) {
    if (typeof value === "number" && !Number.isNaN(value)) {
        return value;
    }
    if (typeof value === "string") {
        const parsed = Number(value);
        return Number.isNaN(parsed) ? fallback : parsed;
    }
    return fallback;
}
function parseWatchlist(raw) {
    if (!Array.isArray(raw))
        return [];
    return raw
        .filter((item) => item && typeof item === "object")
        .map((item) => {
        const entry = item;
        return {
            ...entry,
            addedAt: entry.addedAt ? parseDate(entry.addedAt) : new Date(),
        };
    });
}
const DEFAULT_DISPLAY_SETTINGS = {
    minScore: 6.5,
    showVolume: true,
    showHolders: true,
    showLinks: true,
};
function buildPolicy(guildId, row) {
    const preset = normalizePreset(row.policy?.preset ?? row.policy_preset);
    const base = (0, policies_1.createPolicy)(guildId, preset);
    const stored = row.policy && typeof row.policy === "object" ? row.policy : null;
    const minScore = parseNumber(row.min_score, base.thresholds.minConfidenceScore);
    const storedThresholds = {
        ...base.thresholds,
        ...(stored?.thresholds ?? {}),
    };
    if (stored?.thresholds?.minConfidenceScore === undefined && row.min_score !== null && row.min_score !== undefined) {
        storedThresholds.minConfidenceScore = minScore;
    }
    if (!stored) {
        return {
            ...base,
            thresholds: storedThresholds,
            autopostEnabled: row.autopost ?? base.autopostEnabled,
        };
    }
    return {
        ...base,
        ...stored,
        thresholds: {
            ...storedThresholds,
        },
        enabledSignals: stored.enabledSignals ?? base.enabledSignals,
        autopostEnabled: stored.autopostEnabled ?? row.autopost ?? base.autopostEnabled,
        autopostCadence: stored.autopostCadence ?? base.autopostCadence,
        maxCallsPerDay: stored.maxCallsPerDay ?? base.maxCallsPerDay,
    };
}
function buildDisplaySettings(row, policy) {
    return {
        minScore: parseNumber(row.min_score, policy.thresholds.minConfidenceScore ?? DEFAULT_DISPLAY_SETTINGS.minScore),
        showVolume: row.show_volume ?? DEFAULT_DISPLAY_SETTINGS.showVolume,
        showHolders: row.show_holders ?? DEFAULT_DISPLAY_SETTINGS.showHolders,
        showLinks: row.show_links ?? DEFAULT_DISPLAY_SETTINGS.showLinks,
    };
}
function mapGuildRow(row) {
    const policy = buildPolicy(row.guild_id, row);
    const display = buildDisplaySettings(row, policy);
    return {
        guildId: row.guild_id,
        guildName: row.guild_name || "Unknown Server",
        channelId: row.channel_id || "",
        channelName: row.channel_name || "channel",
        policy,
        watchlist: parseWatchlist(row.watchlist),
        adminUsers: Array.isArray(row.admin_users) ? row.admin_users : [],
        requireMention: row.require_mention ?? true,
        createdAt: parseDate(row.created_at),
        updatedAt: parseDate(row.updated_at),
        callCount: parseNumber(row.call_count, 0),
        lastCallAt: row.last_call_at ? parseDate(row.last_call_at) : undefined,
        display,
    };
}
function buildLegacyCallCard(row) {
    return {
        callId: row.call_id || row.id,
        timestamp: row.posted_at ? new Date(row.posted_at) : new Date(),
        token: {
            symbol: row.token_symbol || "UNKNOWN",
            mint: row.token_address,
            name: row.token_symbol || "Unknown Token",
        },
        policy: {
            name: "Legacy",
            version: "0.0.0",
            hash: "legacy",
        },
        triggers: [],
        pros: [],
        risks: [],
        invalidation: [],
        confidence: row.score ?? 0,
        metrics: {
            mint: row.token_address,
            symbol: row.token_symbol || "UNKNOWN",
            name: row.token_symbol || "Unknown Token",
            price: 0,
            priceChange24h: 0,
            volume24h: 0,
            volumeChange: 0,
            liquidity: row.liquidity ?? 0,
            liquidityChange: 0,
            holders: 0,
            holdersChange: 0,
            topHolderConcentration: 0,
            tokenAgeHours: 0,
            mintAuthority: false,
            freezeAuthority: false,
            lpLocked: false,
            lpAge: 0,
            deployerAddress: "",
            deployerPriorTokens: 0,
            deployerRugCount: 0,
        },
        receipts: {
            inputRefs: [],
            rulesTriggered: [],
            modelVersion: "legacy",
            promptVersion: "legacy",
        },
    };
}
function normalizeCallLog(guildId, log) {
    if (log.callCard) {
        const entry = log;
        return {
            ...entry,
            guildId: entry.guildId || guildId,
            createdAt: parseDate(entry.createdAt),
        };
    }
    const callCard = log;
    const partial = log;
    return {
        id: partial.id || callCard.callId,
        guildId: partial.guildId || guildId,
        channelId: partial.channelId || "",
        callCard,
        triggeredBy: partial.triggeredBy || "manual",
        userId: partial.userId,
        messageId: partial.messageId,
        createdAt: partial.createdAt ? parseDate(partial.createdAt) : new Date(),
    };
}
// In-memory storage for development/demo
class InMemoryStorage {
    guilds = new Map();
    callLogs = new Map();
    async getGuildConfig(guildId) {
        return this.guilds.get(guildId) || null;
    }
    async saveGuildConfig(config) {
        this.guilds.set(config.guildId, config);
    }
    async deleteGuildConfig(guildId) {
        this.guilds.delete(guildId);
        this.callLogs.delete(guildId);
    }
    async addCallLog(guildId, log) {
        const entry = normalizeCallLog(guildId, log);
        const logs = this.callLogs.get(guildId) || [];
        logs.unshift(entry);
        if (logs.length > 100) {
            logs.pop();
        }
        this.callLogs.set(guildId, logs);
    }
    async getCallLogs(guildId, limit = 20) {
        const logs = this.callLogs.get(guildId) || [];
        return logs.slice(0, limit);
    }
    async getCallLogsSince(guildId, since, limit = 50) {
        const logs = this.callLogs.get(guildId) || [];
        const filtered = logs.filter((log) => log.createdAt >= since);
        return filtered.slice(0, limit);
    }
    async getAllGuilds() {
        return Array.from(this.guilds.values());
    }
    async getStats() {
        const guilds = Array.from(this.guilds.values());
        const totalCalls = Array.from(this.callLogs.values()).reduce((sum, logs) => sum + logs.length, 0);
        const activeGuilds = guilds.filter((g) => g.policy.autopostEnabled).length;
        return {
            totalGuilds: guilds.length,
            totalCalls,
            activeGuilds,
        };
    }
}
class SupabaseStorage {
    async getGuildConfig(guildId) {
        if (!supabase)
            return null;
        const { data, error } = await supabase
            .from("guild_settings")
            .select("*")
            .eq("guild_id", guildId)
            .single();
        if (!data || error) {
            if (error && error.code !== "PGRST116") {
                console.error("Supabase guild lookup failed:", error);
            }
            return null;
        }
        return mapGuildRow(data);
    }
    async saveGuildConfig(config) {
        if (!supabase)
            return;
        const display = config.display ?? {
            minScore: config.policy.thresholds.minConfidenceScore,
            showVolume: DEFAULT_DISPLAY_SETTINGS.showVolume,
            showHolders: DEFAULT_DISPLAY_SETTINGS.showHolders,
            showLinks: DEFAULT_DISPLAY_SETTINGS.showLinks,
        };
        const payload = {
            guild_id: config.guildId,
            guild_name: config.guildName,
            channel_id: config.channelId || null,
            channel_name: config.channelName || null,
            policy_preset: config.policy.preset,
            policy: config.policy,
            watchlist: config.watchlist,
            admin_users: config.adminUsers,
            require_mention: config.requireMention,
            call_count: config.callCount,
            last_call_at: config.lastCallAt ? config.lastCallAt.toISOString() : null,
            autopost: config.policy.autopostEnabled,
            min_score: display.minScore,
            show_volume: display.showVolume,
            show_holders: display.showHolders,
            show_links: display.showLinks,
            updated_at: new Date().toISOString(),
        };
        const { error } = await supabase
            .from("guild_settings")
            .upsert(payload, { onConflict: "guild_id" });
        if (error) {
            console.error("Supabase guild upsert failed:", error);
        }
    }
    async deleteGuildConfig(guildId) {
        if (!supabase)
            return;
        const { error } = await supabase
            .from("guild_settings")
            .delete()
            .eq("guild_id", guildId);
        if (error) {
            console.error("Supabase guild delete failed:", error);
        }
    }
    async addCallLog(guildId, log) {
        if (!supabase)
            return;
        const entry = normalizeCallLog(guildId, log);
        const callCard = entry.callCard;
        const metrics = callCard.metrics;
        const { error } = await supabase
            .from("call_history")
            .insert({
            guild_id: guildId,
            channel_id: entry.channelId || null,
            call_id: entry.id || callCard.callId,
            call_card: callCard,
            triggered_by: entry.triggeredBy,
            user_id: entry.userId || null,
            token_address: callCard.token.mint,
            token_symbol: callCard.token.symbol,
            score: callCard.confidence,
            market_cap: null,
            liquidity: metrics.liquidity,
            message_id: entry.messageId || null,
            posted_at: entry.createdAt ? entry.createdAt.toISOString() : new Date().toISOString(),
        });
        if (error) {
            console.error("Supabase call log insert failed:", error);
        }
    }
    async getCallLogs(guildId, limit = 20) {
        if (!supabase)
            return [];
        const { data, error } = await supabase
            .from("call_history")
            .select("*")
            .eq("guild_id", guildId)
            .order("posted_at", { ascending: false })
            .limit(limit);
        if (error) {
            console.error("Supabase call log lookup failed:", error);
            return [];
        }
        return (data || []).map((row) => {
            const entry = row;
            return {
                id: entry.call_id || entry.id,
                guildId: entry.guild_id,
                channelId: entry.channel_id || "",
                callCard: entry.call_card || buildLegacyCallCard(entry),
                triggeredBy: (entry.triggered_by || "manual"),
                userId: entry.user_id || undefined,
                messageId: entry.message_id || undefined,
                createdAt: entry.posted_at ? parseDate(entry.posted_at) : new Date(),
            };
        });
    }
    async getCallLogsSince(guildId, since, limit = 50) {
        if (!supabase)
            return [];
        const { data, error } = await supabase
            .from("call_history")
            .select("*")
            .eq("guild_id", guildId)
            .gte("posted_at", since.toISOString())
            .order("posted_at", { ascending: false })
            .limit(limit);
        if (error) {
            console.error("Supabase call log lookup failed:", error);
            return [];
        }
        return (data || []).map((row) => {
            const entry = row;
            return {
                id: entry.call_id || entry.id,
                guildId: entry.guild_id,
                channelId: entry.channel_id || "",
                callCard: entry.call_card || buildLegacyCallCard(entry),
                triggeredBy: (entry.triggered_by || "manual"),
                userId: entry.user_id || undefined,
                messageId: entry.message_id || undefined,
                createdAt: entry.posted_at ? parseDate(entry.posted_at) : new Date(),
            };
        });
    }
    async getAllGuilds() {
        if (!supabase)
            return [];
        const { data, error } = await supabase.from("guild_settings").select("*");
        if (error) {
            console.error("Supabase guild list failed:", error);
            return [];
        }
        return (data || []).map((row) => mapGuildRow(row));
    }
    async getStats() {
        if (!supabase)
            return { totalGuilds: 0, totalCalls: 0, activeGuilds: 0 };
        const [guildCount, callCount, activeCount] = await Promise.all([
            supabase.from("guild_settings").select("guild_id", { count: "exact", head: true }),
            supabase.from("call_history").select("id", { count: "exact", head: true }),
            supabase.from("guild_settings").select("guild_id", { count: "exact", head: true }).eq("autopost", true),
        ]);
        return {
            totalGuilds: guildCount.count || 0,
            totalCalls: callCount.count || 0,
            activeGuilds: activeCount.count || 0,
        };
    }
}
// Singleton instance
let storageInstance = null;
function getStorage() {
    if (!storageInstance) {
        storageInstance = supabase ? new SupabaseStorage() : new InMemoryStorage();
    }
    return storageInstance;
}
//# sourceMappingURL=storage.js.map
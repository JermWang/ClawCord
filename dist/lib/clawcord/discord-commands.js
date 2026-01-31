"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commandDefinitions = void 0;
exports.handleCommand = handleCommand;
const policies_1 = require("./policies");
const data_providers_1 = require("./data-providers");
const call_card_1 = require("./call-card");
const commands = {
    install: handleInstall,
    policy: handlePolicy,
    watch: handleWatch,
    call: handleCall,
    autopost: handleAutopost,
    thresholds: handleThresholds,
    logs: handleLogs,
};
async function handleCommand(name, ctx, storage) {
    const handler = commands[name];
    if (!handler) {
        return { content: "Unknown command", error: true };
    }
    const config = await storage.getGuildConfig(ctx.guildId);
    return handler(ctx, config, storage);
}
async function handleInstall(ctx, config, storage) {
    if (config) {
        return {
            content: `ClawCord is already installed in this server!\n\n**Current Setup:**\n• Channel: <#${config.channelId}>\n• Policy: ${config.policy.name}\n• Watchlist: ${config.watchlist.length} items\n• Calls today: ${config.callCount}\n\nUse \`/clawcord policy set\` to change policy or \`/clawcord watch add\` to modify watchlist.`,
            ephemeral: true,
        };
    }
    const newConfig = {
        guildId: ctx.guildId,
        guildName: "Server",
        channelId: ctx.channelId,
        channelName: "channel",
        policy: (0, policies_1.createPolicy)(ctx.guildId, "momentum"),
        watchlist: [],
        adminUsers: [ctx.userId],
        requireMention: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        callCount: 0,
    };
    await storage.saveGuildConfig(newConfig);
    const presets = (0, policies_1.getPolicyPresets)();
    return {
        content: `✅ **ClawCord Installed Successfully!**

**Setup Checklist:**
1. ✅ Bot added to server
2. ✅ Default policy set: **Momentum**
3. ⏳ Add tokens to watchlist: \`/clawcord watch add <token>\`
4. ⏳ (Optional) Change policy: \`/clawcord policy set <preset>\`
5. ⏳ (Optional) Enable autopost: \`/clawcord autopost on\`

**Available Policy Presets:**
${presets.map((p) => `• **${p.name}** - ${p.description}`).join("\n")}

**Security Defaults:**
• requireMention: enabled (bot only responds when @mentioned)
• Admin: <@${ctx.userId}>

**Next Steps:**
\`/clawcord watch add <token_address_or_ticker>\`
\`/clawcord call now <token>\``,
        ephemeral: true,
    };
}
async function handlePolicy(ctx, config, storage) {
    if (!config) {
        return {
            content: "Please run `/clawcord install` first.",
            error: true,
            ephemeral: true,
        };
    }
    const [subcommand, ...args] = ctx.args;
    if (!subcommand || subcommand === "view") {
        return {
            content: `**Current Policy: ${config.policy.name}**
*${config.policy.description}*

**Thresholds:**
• Min Liquidity: $${config.policy.thresholds.minLiquidity.toLocaleString()}
• Min Volume 24h: $${config.policy.thresholds.minVolume24h.toLocaleString()}
• Max Token Age: ${config.policy.thresholds.maxTokenAge}h
• Min Holders: ${config.policy.thresholds.minHolders}
• Max Top Holder: ${config.policy.thresholds.maxTopHolderConcentration}%
• Min Confidence: ${config.policy.thresholds.minConfidenceScore}/10

**Enabled Signals:**
${config.policy.enabledSignals.map((s) => `• ${s}`).join("\n")}

**Autopost:** ${config.policy.autopostEnabled ? `ON (every ${config.policy.autopostCadence}m)` : "OFF"}`,
            ephemeral: true,
        };
    }
    if (subcommand === "set") {
        const presetName = args[0]?.toLowerCase().replace("-", "-");
        const validPresets = [
            "fresh-scanner",
            "momentum",
            "dip-hunter",
            "whale-follow",
            "deployer-reputation",
            "community-strength",
        ];
        if (!presetName || !validPresets.includes(presetName)) {
            const presets = (0, policies_1.getPolicyPresets)();
            return {
                content: `Please specify a valid preset:\n${presets.map((p) => `• \`${p.preset}\` - ${p.name}`).join("\n")}\n\nUsage: \`/clawcord policy set momentum\``,
                error: true,
                ephemeral: true,
            };
        }
        config.policy = (0, policies_1.createPolicy)(ctx.guildId, presetName);
        config.updatedAt = new Date();
        await storage.saveGuildConfig(config);
        return {
            content: `✅ Policy updated to **${config.policy.name}**\n\n*${config.policy.description}*`,
        };
    }
    return {
        content: "Usage: `/clawcord policy [view|set <preset>]`",
        ephemeral: true,
    };
}
async function handleWatch(ctx, config, storage) {
    if (!config) {
        return {
            content: "Please run `/clawcord install` first.",
            error: true,
            ephemeral: true,
        };
    }
    const [subcommand, ...args] = ctx.args;
    if (!subcommand || subcommand === "list") {
        if (config.watchlist.length === 0) {
            return {
                content: "**Watchlist is empty.**\n\nAdd items with:\n`/clawcord watch add <token_address>`\n`/clawcord watch add $TICKER`",
                ephemeral: true,
            };
        }
        const grouped = {
            token: config.watchlist.filter((w) => w.type === "token"),
            wallet: config.watchlist.filter((w) => w.type === "wallet"),
            deployer: config.watchlist.filter((w) => w.type === "deployer"),
            ticker: config.watchlist.filter((w) => w.type === "ticker"),
        };
        let content = "**📋 Watchlist:**\n";
        if (grouped.token.length > 0) {
            content += `\n**Tokens (${grouped.token.length}):**\n`;
            content += grouped.token
                .map((w) => `• \`${w.value.slice(0, 8)}...\` ${w.label || ""}`)
                .join("\n");
        }
        if (grouped.wallet.length > 0) {
            content += `\n**Wallets (${grouped.wallet.length}):**\n`;
            content += grouped.wallet.map((w) => `• \`${w.value.slice(0, 8)}...\``).join("\n");
        }
        return { content, ephemeral: true };
    }
    if (subcommand === "add") {
        const value = args[0];
        if (!value) {
            return {
                content: "Please provide a token address or ticker.\nUsage: `/clawcord watch add <address>` or `/clawcord watch add $TICKER`",
                error: true,
                ephemeral: true,
            };
        }
        let type = "token";
        let finalValue = value;
        if (value.startsWith("$")) {
            type = "ticker";
            const dataProvider = (0, data_providers_1.createDataProvider)();
            const resolved = await dataProvider.resolveTickerToMint(value);
            if (resolved) {
                type = "token";
                finalValue = resolved;
            }
            else {
                finalValue = value.toUpperCase();
            }
        }
        // Check for duplicates
        if (config.watchlist.some((w) => w.value === finalValue)) {
            return {
                content: `Item already in watchlist: \`${finalValue}\``,
                error: true,
                ephemeral: true,
            };
        }
        const item = {
            type,
            value: finalValue,
            label: value.startsWith("$") ? value.toUpperCase() : undefined,
            addedBy: ctx.userId,
            addedAt: new Date(),
        };
        config.watchlist.push(item);
        config.updatedAt = new Date();
        await storage.saveGuildConfig(config);
        return {
            content: `✅ Added to watchlist: \`${finalValue}\`${item.label ? ` (${item.label})` : ""}`,
        };
    }
    if (subcommand === "remove") {
        const value = args[0];
        if (!value) {
            return {
                content: "Please provide the item to remove.\nUsage: `/clawcord watch remove <address>`",
                error: true,
                ephemeral: true,
            };
        }
        const index = config.watchlist.findIndex((w) => w.value === value || w.value.startsWith(value) || w.label === value.toUpperCase());
        if (index === -1) {
            return {
                content: `Item not found in watchlist: \`${value}\``,
                error: true,
                ephemeral: true,
            };
        }
        const removed = config.watchlist.splice(index, 1)[0];
        config.updatedAt = new Date();
        await storage.saveGuildConfig(config);
        return {
            content: `✅ Removed from watchlist: \`${removed.value}\``,
        };
    }
    return {
        content: "Usage: `/clawcord watch [list|add|remove] <value>`",
        ephemeral: true,
    };
}
async function handleCall(ctx, config, storage) {
    if (!config) {
        return {
            content: "Please run `/clawcord install` first.",
            error: true,
            ephemeral: true,
        };
    }
    const [subcommand, token] = ctx.args;
    if (subcommand !== "now" || !token) {
        return {
            content: "Usage: `/clawcord call now <token_address_or_ticker>`",
            error: true,
            ephemeral: true,
        };
    }
    // Resolve ticker if needed
    let mint = token;
    const dataProvider = (0, data_providers_1.createDataProvider)();
    if (token.startsWith("$") || !token.includes("1")) {
        const resolved = await dataProvider.resolveTickerToMint(token);
        if (!resolved) {
            // Generate call anyway with the raw input (will use mock data)
            mint = token;
        }
        else {
            mint = resolved;
        }
    }
    const result = await (0, call_card_1.processCallRequest)(mint, config.policy, dataProvider);
    if (!result.success || !result.card) {
        return {
            content: `❌ **Call Failed**\n\n${result.error}`,
            error: true,
        };
    }
    // Log the call
    await storage.addCallLog(ctx.guildId, {
        ...result.card,
        triggeredBy: "manual",
        userId: ctx.userId,
        createdAt: new Date(),
    });
    config.callCount++;
    config.lastCallAt = new Date();
    await storage.saveGuildConfig(config);
    return {
        content: (0, call_card_1.formatCallCardForDiscord)(result.card),
    };
}
async function handleAutopost(ctx, config, storage) {
    if (!config) {
        return {
            content: "Please run `/clawcord install` first.",
            error: true,
            ephemeral: true,
        };
    }
    const [setting, ...args] = ctx.args;
    if (!setting) {
        return {
            content: `**Autopost Settings:**
• Status: ${config.policy.autopostEnabled ? "ON" : "OFF"}
• Cadence: Every ${config.policy.autopostCadence} minutes
• Max calls/day: ${config.policy.maxCallsPerDay}
• Quiet hours: ${config.policy.quietHoursStart !== undefined ? `${config.policy.quietHoursStart}:00 - ${config.policy.quietHoursEnd}:00 UTC` : "None"}

Usage:
\`/clawcord autopost on\` - Enable autoposting
\`/clawcord autopost off\` - Disable autoposting
\`/clawcord autopost cadence <minutes>\` - Set posting interval`,
            ephemeral: true,
        };
    }
    if (setting === "on") {
        if (config.watchlist.length === 0) {
            return {
                content: "Please add items to your watchlist first with `/clawcord watch add`",
                error: true,
                ephemeral: true,
            };
        }
        config.policy.autopostEnabled = true;
        config.updatedAt = new Date();
        await storage.saveGuildConfig(config);
        return {
            content: `✅ **Autopost enabled**\n\nCalls will be posted every ${config.policy.autopostCadence} minutes when watchlist tokens meet criteria.`,
        };
    }
    if (setting === "off") {
        config.policy.autopostEnabled = false;
        config.updatedAt = new Date();
        await storage.saveGuildConfig(config);
        return {
            content: "✅ Autopost disabled",
        };
    }
    if (setting === "cadence") {
        const minutes = parseInt(args[0], 10);
        if (isNaN(minutes) || minutes < 5 || minutes > 1440) {
            return {
                content: "Cadence must be between 5 and 1440 minutes.",
                error: true,
                ephemeral: true,
            };
        }
        config.policy.autopostCadence = minutes;
        config.updatedAt = new Date();
        await storage.saveGuildConfig(config);
        return {
            content: `✅ Autopost cadence set to ${minutes} minutes`,
        };
    }
    return {
        content: "Usage: `/clawcord autopost [on|off|cadence <minutes>]`",
        ephemeral: true,
    };
}
async function handleThresholds(ctx, config, storage) {
    if (!config) {
        return {
            content: "Please run `/clawcord install` first.",
            error: true,
            ephemeral: true,
        };
    }
    const [setting, value] = ctx.args;
    if (!setting) {
        return {
            content: `**Current Thresholds:**
• \`minLiquidity\`: $${config.policy.thresholds.minLiquidity.toLocaleString()}
• \`minVolume24h\`: $${config.policy.thresholds.minVolume24h.toLocaleString()}
• \`maxTokenAge\`: ${config.policy.thresholds.maxTokenAge}h
• \`minHolders\`: ${config.policy.thresholds.minHolders}
• \`maxTopHolderConcentration\`: ${config.policy.thresholds.maxTopHolderConcentration}%
• \`minConfidenceScore\`: ${config.policy.thresholds.minConfidenceScore}/10

**Adjust:**
\`/clawcord thresholds minLiquidity 10000\`
\`/clawcord thresholds maxTokenAge 24\``,
            ephemeral: true,
        };
    }
    const validSettings = [
        "minLiquidity",
        "minVolume24h",
        "maxTokenAge",
        "minHolders",
        "maxTopHolderConcentration",
        "minConfidenceScore",
    ];
    if (!validSettings.includes(setting)) {
        return {
            content: `Invalid threshold. Valid options: ${validSettings.join(", ")}`,
            error: true,
            ephemeral: true,
        };
    }
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
        return {
            content: "Please provide a numeric value.",
            error: true,
            ephemeral: true,
        };
    }
    const newThresholds = { ...config.policy.thresholds, [setting]: numValue };
    const errors = (0, policies_1.validateThresholds)(newThresholds);
    if (errors.length > 0) {
        return {
            content: `Invalid value:\n${errors.join("\n")}`,
            error: true,
            ephemeral: true,
        };
    }
    config.policy.thresholds = newThresholds;
    config.updatedAt = new Date();
    await storage.saveGuildConfig(config);
    return {
        content: `✅ Threshold \`${setting}\` set to ${numValue}`,
    };
}
async function handleLogs(ctx, config, storage) {
    if (!config) {
        return {
            content: "Please run `/clawcord install` first.",
            error: true,
            ephemeral: true,
        };
    }
    const logs = await storage.getCallLogs(ctx.guildId, 20);
    if (logs.length === 0) {
        return {
            content: "**No calls logged yet.**\n\nGenerate your first call with `/clawcord call now <token>`",
            ephemeral: true,
        };
    }
    const formattedLogs = logs
        .slice(0, 10)
        .map((log, i) => {
        const l = log;
        return `${i + 1}. **$${l.callCard?.token?.symbol || "???"}** - ${l.callCard?.confidence || 0}/10 - \`${l.callCard?.callId || "N/A"}\` - ${l.createdAt ? new Date(l.createdAt).toLocaleDateString() : "N/A"}`;
    })
        .join("\n");
    return {
        content: `**📜 Recent Calls (${logs.length} total):**\n\n${formattedLogs}`,
        ephemeral: true,
    };
}
// Export command definitions for Discord slash command registration
exports.commandDefinitions = [
    {
        name: "clawcord",
        description: "ClawCord signal caller commands",
        options: [
            {
                name: "install",
                description: "Setup ClawCord in this server",
                type: 1,
            },
            {
                name: "policy",
                description: "View or set signal policy",
                type: 1,
                options: [
                    {
                        name: "action",
                        description: "view or set",
                        type: 3,
                        choices: [
                            { name: "view", value: "view" },
                            { name: "set", value: "set" },
                        ],
                    },
                    {
                        name: "preset",
                        description: "Policy preset name",
                        type: 3,
                        choices: [
                            { name: "Fresh Scanner", value: "fresh-scanner" },
                            { name: "Momentum", value: "momentum" },
                            { name: "Dip Hunter", value: "dip-hunter" },
                            { name: "Whale Follow", value: "whale-follow" },
                            { name: "Deployer Reputation", value: "deployer-reputation" },
                            { name: "Community Strength", value: "community-strength" },
                        ],
                    },
                ],
            },
            {
                name: "watch",
                description: "Manage watchlist",
                type: 1,
                options: [
                    {
                        name: "action",
                        description: "list, add, or remove",
                        type: 3,
                        required: true,
                        choices: [
                            { name: "list", value: "list" },
                            { name: "add", value: "add" },
                            { name: "remove", value: "remove" },
                        ],
                    },
                    {
                        name: "value",
                        description: "Token address or ticker",
                        type: 3,
                    },
                ],
            },
            {
                name: "call",
                description: "Generate a call",
                type: 1,
                options: [
                    {
                        name: "action",
                        description: "now",
                        type: 3,
                        required: true,
                        choices: [{ name: "now", value: "now" }],
                    },
                    {
                        name: "token",
                        description: "Token address or ticker",
                        type: 3,
                        required: true,
                    },
                ],
            },
            {
                name: "autopost",
                description: "Configure autoposting",
                type: 1,
                options: [
                    {
                        name: "setting",
                        description: "on, off, or cadence",
                        type: 3,
                        choices: [
                            { name: "on", value: "on" },
                            { name: "off", value: "off" },
                            { name: "cadence", value: "cadence" },
                        ],
                    },
                    {
                        name: "value",
                        description: "Value for the setting",
                        type: 3,
                    },
                ],
            },
            {
                name: "thresholds",
                description: "View or adjust thresholds",
                type: 1,
                options: [
                    {
                        name: "setting",
                        description: "Threshold to adjust",
                        type: 3,
                        choices: [
                            { name: "minLiquidity", value: "minLiquidity" },
                            { name: "minVolume24h", value: "minVolume24h" },
                            { name: "maxTokenAge", value: "maxTokenAge" },
                            { name: "minHolders", value: "minHolders" },
                            { name: "maxTopHolderConcentration", value: "maxTopHolderConcentration" },
                            { name: "minConfidenceScore", value: "minConfidenceScore" },
                        ],
                    },
                    {
                        name: "value",
                        description: "New value",
                        type: 3,
                    },
                ],
            },
            {
                name: "logs",
                description: "View recent calls",
                type: 1,
            },
        ],
    },
];
//# sourceMappingURL=discord-commands.js.map
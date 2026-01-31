"use strict";
// Discord OAuth2 Helper for Bot Invites
Object.defineProperty(exports, "__esModule", { value: true });
exports.BOT_PERMISSIONS = void 0;
exports.calculatePermissions = calculatePermissions;
exports.generateBotInviteUrl = generateBotInviteUrl;
exports.generateOAuthUrl = generateOAuthUrl;
exports.exchangeCodeForToken = exchangeCodeForToken;
exports.getGuildInfo = getGuildInfo;
exports.getGuildChannels = getGuildChannels;
exports.registerSlashCommands = registerSlashCommands;
const DISCORD_API = "https://discord.com/api/v10";
// Required bot permissions for ClawCord (as decimal values)
// See: https://discord.com/developers/docs/topics/permissions
exports.BOT_PERMISSIONS = {
    SEND_MESSAGES: 2048, // 1 << 11
    EMBED_LINKS: 16384, // 1 << 14
    READ_MESSAGE_HISTORY: 65536, // 1 << 16
    USE_EXTERNAL_EMOJIS: 262144, // 1 << 18
    ADD_REACTIONS: 64, // 1 << 6
    USE_SLASH_COMMANDS: 2147483648, // 1 << 31
};
function calculatePermissions() {
    let permissions = 0;
    for (const perm of Object.values(exports.BOT_PERMISSIONS)) {
        permissions |= perm;
    }
    return permissions.toString();
}
function generateBotInviteUrl(config) {
    const clientId = config.clientId || process.env.DISCORD_APPLICATION_ID;
    if (!clientId) {
        throw new Error("Discord Application ID not configured");
    }
    const permissions = config.permissions || calculatePermissions();
    const scopes = ["bot", "applications.commands"].join("%20");
    let url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=${scopes}`;
    if (config.redirectUri) {
        url += `&redirect_uri=${encodeURIComponent(config.redirectUri)}&response_type=code`;
    }
    return url;
}
function generateOAuthUrl(config) {
    const clientId = config.clientId || process.env.DISCORD_APPLICATION_ID;
    if (!clientId) {
        throw new Error("Discord Application ID not configured");
    }
    const params = new URLSearchParams({
        client_id: clientId,
        permissions: config.permissions || calculatePermissions(),
        scope: "bot applications.commands guilds",
        response_type: "code",
    });
    if (config.redirectUri) {
        params.set("redirect_uri", config.redirectUri);
    }
    if (config.state) {
        params.set("state", config.state);
    }
    return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}
async function exchangeCodeForToken(code, clientId, clientSecret, redirectUri) {
    const response = await fetch(`${DISCORD_API}/oauth2/token`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: "authorization_code",
            code,
            redirect_uri: redirectUri,
        }),
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to exchange code: ${error}`);
    }
    return response.json();
}
async function getGuildInfo(guildId, botToken) {
    const response = await fetch(`${DISCORD_API}/guilds/${guildId}?with_counts=true`, {
        headers: {
            Authorization: `Bot ${botToken}`,
        },
    });
    if (!response.ok) {
        throw new Error(`Failed to get guild info: ${response.status}`);
    }
    return response.json();
}
async function getGuildChannels(guildId, botToken) {
    const response = await fetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
        headers: {
            Authorization: `Bot ${botToken}`,
        },
    });
    if (!response.ok) {
        throw new Error(`Failed to get guild channels: ${response.status}`);
    }
    const channels = await response.json();
    // Filter to text channels (type 0) and sort by position
    return channels
        .filter((c) => c.type === 0)
        .sort((a, b) => a.position - b.position);
}
async function registerSlashCommands(applicationId, botToken, guildId) {
    const commands = [
        {
            name: "clawcord",
            description: "ClawCord signal caller commands",
            options: [
                {
                    name: "install",
                    description: "Setup ClawCord in this channel",
                    type: 1, // SUB_COMMAND
                },
                {
                    name: "policy",
                    description: "View or change the active policy",
                    type: 1,
                    options: [
                        {
                            name: "preset",
                            description: "Policy preset to use",
                            type: 3, // STRING
                            required: false,
                            choices: [
                                { name: "Fresh Scanner (0-2h)", value: "fresh-scanner" },
                                { name: "Momentum (2h-48h)", value: "momentum" },
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
                    description: "Add a token to watchlist",
                    type: 1,
                    options: [
                        {
                            name: "token",
                            description: "Token address or $TICKER",
                            type: 3,
                            required: true,
                        },
                    ],
                },
                {
                    name: "call",
                    description: "Generate a call for a token",
                    type: 1,
                    options: [
                        {
                            name: "token",
                            description: "Token address or $TICKER",
                            type: 3,
                            required: true,
                        },
                    ],
                },
                {
                    name: "scan",
                    description: "Scan for new PumpFun graduations",
                    type: 1,
                },
                {
                    name: "autopost",
                    description: "Configure automatic posting",
                    type: 1,
                    options: [
                        {
                            name: "enabled",
                            description: "Enable or disable autopost",
                            type: 5, // BOOLEAN
                            required: true,
                        },
                    ],
                },
                {
                    name: "logs",
                    description: "View recent calls",
                    type: 1,
                    options: [
                        {
                            name: "limit",
                            description: "Number of logs to show (default 5)",
                            type: 4, // INTEGER
                            required: false,
                        },
                    ],
                },
            ],
        },
    ];
    // Register globally or to specific guild
    const url = guildId
        ? `${DISCORD_API}/applications/${applicationId}/guilds/${guildId}/commands`
        : `${DISCORD_API}/applications/${applicationId}/commands`;
    const response = await fetch(url, {
        method: "PUT",
        headers: {
            Authorization: `Bot ${botToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(commands),
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to register commands: ${error}`);
    }
}
//# sourceMappingURL=discord-oauth.js.map
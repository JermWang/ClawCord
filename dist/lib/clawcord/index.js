"use strict";
// ClawCord - Signal Caller as a Policy Engine
// A Discord-integrated signal caller for Solana tokens
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePermissions = exports.BOT_PERMISSIONS = exports.getGuildChannels = exports.getGuildInfo = exports.registerSlashCommands = exports.generateOAuthUrl = exports.generateBotInviteUrl = exports.getAutopostService = exports.AutopostService = exports.CONSERVATIVE_GRADUATION_FILTER = exports.AGGRESSIVE_GRADUATION_FILTER = exports.DEFAULT_GRADUATION_FILTER = exports.GraduationWatcher = exports.DexScreenerProvider = exports.getStorage = exports.commandDefinitions = exports.handleCommand = exports.processCallRequest = exports.formatCallCardCompact = exports.formatCallCardForDiscord = exports.generateCallCard = exports.generateCallId = exports.generateInvalidationConditions = exports.generateRiskFlags = exports.scoreToken = exports.createDataProvider = exports.getHeliusProvider = exports.HeliusProvider = exports.BirdeyeProvider = exports.SolanaDataProvider = exports.hashPolicy = exports.validateThresholds = exports.getDefaultPolicy = exports.getPolicyPresets = exports.createPolicy = void 0;
// Core Types
__exportStar(require("./types"), exports);
// Policy System
var policies_1 = require("./policies");
Object.defineProperty(exports, "createPolicy", { enumerable: true, get: function () { return policies_1.createPolicy; } });
Object.defineProperty(exports, "getPolicyPresets", { enumerable: true, get: function () { return policies_1.getPolicyPresets; } });
Object.defineProperty(exports, "getDefaultPolicy", { enumerable: true, get: function () { return policies_1.getDefaultPolicy; } });
Object.defineProperty(exports, "validateThresholds", { enumerable: true, get: function () { return policies_1.validateThresholds; } });
Object.defineProperty(exports, "hashPolicy", { enumerable: true, get: function () { return policies_1.hashPolicy; } });
// Data Providers
var data_providers_1 = require("./data-providers");
Object.defineProperty(exports, "SolanaDataProvider", { enumerable: true, get: function () { return data_providers_1.SolanaDataProvider; } });
Object.defineProperty(exports, "BirdeyeProvider", { enumerable: true, get: function () { return data_providers_1.BirdeyeProvider; } });
Object.defineProperty(exports, "HeliusProvider", { enumerable: true, get: function () { return data_providers_1.HeliusProvider; } });
Object.defineProperty(exports, "getHeliusProvider", { enumerable: true, get: function () { return data_providers_1.getHeliusProvider; } });
Object.defineProperty(exports, "createDataProvider", { enumerable: true, get: function () { return data_providers_1.createDataProvider; } });
// Scoring Engine
var scoring_1 = require("./scoring");
Object.defineProperty(exports, "scoreToken", { enumerable: true, get: function () { return scoring_1.scoreToken; } });
Object.defineProperty(exports, "generateRiskFlags", { enumerable: true, get: function () { return scoring_1.generateRiskFlags; } });
Object.defineProperty(exports, "generateInvalidationConditions", { enumerable: true, get: function () { return scoring_1.generateInvalidationConditions; } });
// Call Card Generator
var call_card_1 = require("./call-card");
Object.defineProperty(exports, "generateCallId", { enumerable: true, get: function () { return call_card_1.generateCallId; } });
Object.defineProperty(exports, "generateCallCard", { enumerable: true, get: function () { return call_card_1.generateCallCard; } });
Object.defineProperty(exports, "formatCallCardForDiscord", { enumerable: true, get: function () { return call_card_1.formatCallCardForDiscord; } });
Object.defineProperty(exports, "formatCallCardCompact", { enumerable: true, get: function () { return call_card_1.formatCallCardCompact; } });
Object.defineProperty(exports, "processCallRequest", { enumerable: true, get: function () { return call_card_1.processCallRequest; } });
// Discord Commands
var discord_commands_1 = require("./discord-commands");
Object.defineProperty(exports, "handleCommand", { enumerable: true, get: function () { return discord_commands_1.handleCommand; } });
Object.defineProperty(exports, "commandDefinitions", { enumerable: true, get: function () { return discord_commands_1.commandDefinitions; } });
// Storage
var storage_1 = require("./storage");
Object.defineProperty(exports, "getStorage", { enumerable: true, get: function () { return storage_1.getStorage; } });
// DexScreener & PumpFun Graduations
var dexscreener_provider_1 = require("./dexscreener-provider");
Object.defineProperty(exports, "DexScreenerProvider", { enumerable: true, get: function () { return dexscreener_provider_1.DexScreenerProvider; } });
Object.defineProperty(exports, "GraduationWatcher", { enumerable: true, get: function () { return dexscreener_provider_1.GraduationWatcher; } });
Object.defineProperty(exports, "DEFAULT_GRADUATION_FILTER", { enumerable: true, get: function () { return dexscreener_provider_1.DEFAULT_GRADUATION_FILTER; } });
Object.defineProperty(exports, "AGGRESSIVE_GRADUATION_FILTER", { enumerable: true, get: function () { return dexscreener_provider_1.AGGRESSIVE_GRADUATION_FILTER; } });
Object.defineProperty(exports, "CONSERVATIVE_GRADUATION_FILTER", { enumerable: true, get: function () { return dexscreener_provider_1.CONSERVATIVE_GRADUATION_FILTER; } });
// Autopost Service
var autopost_service_1 = require("./autopost-service");
Object.defineProperty(exports, "AutopostService", { enumerable: true, get: function () { return autopost_service_1.AutopostService; } });
Object.defineProperty(exports, "getAutopostService", { enumerable: true, get: function () { return autopost_service_1.getAutopostService; } });
// Discord OAuth
var discord_oauth_1 = require("./discord-oauth");
Object.defineProperty(exports, "generateBotInviteUrl", { enumerable: true, get: function () { return discord_oauth_1.generateBotInviteUrl; } });
Object.defineProperty(exports, "generateOAuthUrl", { enumerable: true, get: function () { return discord_oauth_1.generateOAuthUrl; } });
Object.defineProperty(exports, "registerSlashCommands", { enumerable: true, get: function () { return discord_oauth_1.registerSlashCommands; } });
Object.defineProperty(exports, "getGuildInfo", { enumerable: true, get: function () { return discord_oauth_1.getGuildInfo; } });
Object.defineProperty(exports, "getGuildChannels", { enumerable: true, get: function () { return discord_oauth_1.getGuildChannels; } });
Object.defineProperty(exports, "BOT_PERMISSIONS", { enumerable: true, get: function () { return discord_oauth_1.BOT_PERMISSIONS; } });
Object.defineProperty(exports, "calculatePermissions", { enumerable: true, get: function () { return discord_oauth_1.calculatePermissions; } });
/**
 * ClawCord Product Overview
 *
 * ClawCord is a "Signal Caller as a Policy Engine" that:
 * - Integrates with Discord servers via bot
 * - Uses configurable Signal Policies (preferences + guardrails + data sources + thresholds)
 * - Watches specified tokens, wallets, and tickers
 * - Emits standardized "Call Cards" with structured analysis
 * - Maintains auditable logs with full reasoning
 *
 * Key Features:
 * - 6 built-in policy presets (Fresh Scanner, Momentum, Dip Hunter, etc.)
 * - Structured output format (no free-form financial advice)
 * - Per-guild configuration and isolation
 * - Autopost capabilities with rate limiting
 * - Full audit trail with receipts
 *
 * Security Defaults:
 * - requireMention: true (only responds when @mentioned)
 * - Per-channel admin allowlists
 * - Bot-to-bot loop prevention
 * - Explicit autopost opt-in
 *
 * See THREAT_MODEL.md and DEPLOYMENT.md for more details.
 */
//# sourceMappingURL=index.js.map
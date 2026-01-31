// ClawCord - Signal Caller as a Policy Engine
// A Discord-integrated signal caller for Solana tokens

// Core Types
export * from "./types";

// Policy System
export {
  createPolicy,
  getPolicyPresets,
  getDefaultPolicy,
  validateThresholds,
  hashPolicy,
} from "./policies";

// Data Providers
export {
  SolanaDataProvider,
  BirdeyeProvider,
  HeliusProvider,
  createDataProvider,
} from "./data-providers";

// Scoring Engine
export {
  scoreToken,
  generateRiskFlags,
  generateInvalidationConditions,
} from "./scoring";

// Call Card Generator
export {
  generateCallId,
  generateCallCard,
  formatCallCardForDiscord,
  formatCallCardCompact,
  processCallRequest,
} from "./call-card";

// Discord Commands
export {
  handleCommand,
  commandDefinitions,
} from "./discord-commands";

// Storage
export {
  getStorage,
  type Storage,
} from "./storage";

// DexScreener & PumpFun Graduations
export {
  DexScreenerProvider,
  GraduationWatcher,
  DEFAULT_GRADUATION_FILTER,
} from "./dexscreener-provider";

// Autopost Service
export {
  AutopostService,
  getAutopostService,
} from "./autopost-service";

// Discord OAuth
export {
  generateBotInviteUrl,
  generateOAuthUrl,
  registerSlashCommands,
  getGuildInfo,
  getGuildChannels,
  BOT_PERMISSIONS,
  calculatePermissions,
} from "./discord-oauth";

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

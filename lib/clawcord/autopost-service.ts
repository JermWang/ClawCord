import type { GraduationCandidate, GuildConfig, CallLog, DexScreenerPair } from "./types";
import { GraduationWatcher, DEFAULT_GRADUATION_FILTER } from "./dexscreener-provider";
import { scoreToken } from "./scoring";
import { generateCallCard } from "./call-card";
import { getStorage } from "./storage";

interface AutopostConfig {
  enabled: boolean;
  intervalMs: number;
  minScore: number;
}

const DEFAULT_AUTOPOST_CONFIG: AutopostConfig = {
  enabled: false,
  intervalMs: 60_000, // 1 minute
  minScore: 6.5,
};

interface SocialLink {
  label: string;
  url: string;
}

const SOCIAL_PRIORITY = ["twitter", "telegram", "discord", "medium", "github", "reddit"];
const SOCIAL_LABELS: Record<string, string> = {
  twitter: "X",
  telegram: "Telegram",
  discord: "Discord",
  medium: "Medium",
  github: "GitHub",
  reddit: "Reddit",
};

function normalizeSocialType(type?: string): string {
  const normalized = (type || "").toLowerCase();
  return normalized === "x" ? "twitter" : normalized;
}

function extractSocialLinks(pair: DexScreenerPair): SocialLink[] {
  const socials = pair.info?.socials ?? [];
  const websites = pair.info?.websites ?? [];
  const byType = new Map<string, string>();

  socials.forEach((social) => {
    const type = normalizeSocialType(social.type);
    if (!type || !social.url) {
      return;
    }
    if (!byType.has(type)) {
      byType.set(type, social.url);
    }
  });

  const ordered: SocialLink[] = [];
  SOCIAL_PRIORITY.forEach((type) => {
    const url = byType.get(type);
    if (!url) {
      return;
    }
    ordered.push({ label: SOCIAL_LABELS[type] || type, url });
    byType.delete(type);
  });

  byType.forEach((url, type) => {
    ordered.push({ label: SOCIAL_LABELS[type] || type, url });
  });

  const websiteUrl = websites.find((site) => Boolean(site?.url))?.url;
  if (websiteUrl) {
    ordered.push({ label: "Website", url: websiteUrl });
  }

  return ordered.slice(0, 4);
}

export class AutopostService {
  private watcher: GraduationWatcher;
  private intervalId: NodeJS.Timeout | null = null;
  private config: AutopostConfig;

  constructor(config?: Partial<AutopostConfig>) {
    this.watcher = new GraduationWatcher();
    this.config = { ...DEFAULT_AUTOPOST_CONFIG, ...config };
  }

  async sendDiscordMessage(channelId: string, content: string): Promise<boolean> {
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) {
      console.error("❌ No Discord bot token configured - cannot send messages");
      return false;
    }

    try {
      const response = await fetch(
        `https://discord.com/api/v10/channels/${channelId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bot ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content }),
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`❌ Discord API error ${response.status}: ${errorBody}`);
        if (response.status === 403) {
          console.error(`   → Bot lacks permission to post in channel ${channelId}`);
        } else if (response.status === 404) {
          console.error(`   → Channel ${channelId} not found - may have been deleted`);
        }
        return false;
      }

      return true;
    } catch (error) {
      console.error("❌ Failed to send Discord message:", error);
      return false;
    }
  }

  formatGraduationCall(candidate: GraduationCandidate): string {
    const { graduation, pair, score } = candidate;
    const priceChange = pair.priceChange?.m5 || 0;
    const buySellRatio = pair.txns?.m5?.sells 
      ? (pair.txns.m5.buys / pair.txns.m5.sells).toFixed(2) 
      : "∞";
    const socialLinks = extractSocialLinks(pair)
      .map((social) => `[${social.label}](${social.url})`)
      .join(" • ");

    const lines = [
      `🎓 **$${graduation.symbol}** just graduated from PumpFun`,
      ``,
      `**Score:** ${score.toFixed(1)}/10`,
      `**Price:** $${parseFloat(pair.priceUsd).toFixed(8)} (${priceChange > 0 ? "+" : ""}${priceChange.toFixed(1)}% 5m)`,
      `**Liquidity:** $${(pair.liquidity?.usd || 0).toLocaleString()}`,
      `**Volume 5m:** $${(pair.volume?.m5 || 0).toLocaleString()}`,
      `**MCap:** $${(pair.marketCap || 0).toLocaleString()}`,
      `**Buys/Sells 5m:** ${pair.txns?.m5?.buys || 0}/${pair.txns?.m5?.sells || 0} (${buySellRatio}x)`,
      ``,
      socialLinks ? `🔗 ${socialLinks}` : null,
      `📊 [DexScreener](${pair.url}) | \`${graduation.mint.slice(0, 8)}...${graduation.mint.slice(-4)}\``,
    ];

    // Add risk warnings
    if ((pair.liquidity?.usd || 0) < 10000) {
      lines.push(`⚠️ Low liquidity`);
    }
    if (priceChange < -10) {
      lines.push(`⚠️ Price dropping`);
    }

    return lines.filter(Boolean).join("\n");
  }

  async scanAndNotify(): Promise<{ sent: number; candidates: number }> {
    const scanStart = new Date().toISOString();
    console.log(`\n🔍 [${scanStart}] Starting autopost scan cycle...`);
    
    const storage = getStorage();
    const guilds = await storage.getAllGuilds();
    console.log(`📋 Found ${guilds.length} total guilds in storage`);
    
    // Scan for new graduations
    console.log(`🎓 Scanning for PumpFun graduations...`);
    const candidates = await this.watcher.scanForGraduations(DEFAULT_GRADUATION_FILTER);
    console.log(`📊 Found ${candidates.length} graduation candidates`);
    
    // Filter to high-potential candidates
    const highPotential = candidates.filter(
      (c) => c.passesFilter && c.score >= this.config.minScore
    );
    console.log(`✅ ${highPotential.length} candidates pass filters (minScore: ${this.config.minScore})`);
    
    if (highPotential.length > 0) {
      console.log(`🏆 High potential tokens:`);
      highPotential.forEach((c, i) => {
        console.log(`   ${i + 1}. $${c.graduation.symbol} | Score: ${c.score.toFixed(1)} | MCap: $${(c.pair.marketCap || 0).toLocaleString()} | Liq: $${(c.pair.liquidity?.usd || 0).toLocaleString()}`);
      });
    }

    let sent = 0;
    const autopostGuilds = guilds.filter(g => g.policy.autopostEnabled);
    console.log(`\n📢 ${autopostGuilds.length} guilds have autopost ENABLED`);
    
    if (autopostGuilds.length === 0) {
      console.log(`⚠️  No guilds have autopost enabled. Use /settings autopost enabled:true to enable.`);
    }

    // Send to all subscribed guilds with autopost enabled
    for (const guild of guilds) {
      if (!guild.policy.autopostEnabled) {
        continue;
      }
      
      console.log(`\n🏠 Processing guild: ${guild.guildName} (${guild.guildId})`);
      console.log(`   📍 Channel ID: ${guild.channelId || 'NOT SET'}`);
      
      if (!guild.channelId) {
        console.log(`   ❌ Skipping - no channel configured. Use /setchannel to set one.`);
        continue;
      }
      
      // Check quiet hours
      if (this.isQuietHours(guild)) {
        console.log(`   🌙 Skipping - quiet hours active`);
        continue;
      }

      // Check daily limit
      const today = new Date().toDateString();
      const allLogs = await storage.getCallLogs(guild.guildId);
      const callsToday = allLogs.filter(
        (log: CallLog) => new Date(log.createdAt).toDateString() === today
      ).length;
      
      console.log(`   📈 Calls today: ${callsToday}/${guild.policy.maxCallsPerDay}`);
      
      if (callsToday >= guild.policy.maxCallsPerDay) {
        console.log(`   ⏸️  Skipping - daily limit reached`);
        continue;
      }

      if (highPotential.length === 0) {
        console.log(`   📭 No high-potential candidates to post`);
        continue;
      }

      for (const candidate of highPotential) {
        console.log(`   📤 Sending call for $${candidate.graduation.symbol} to channel ${guild.channelId}...`);
        const message = this.formatGraduationCall(candidate);
        const success = await this.sendDiscordMessage(guild.channelId, message);
        
        if (success) {
          sent++;
          console.log(`   ✅ Message sent successfully!`);
          // Log the call - use scoring to generate proper ScoringResult
          const scoringResult = scoreToken(candidate.metrics, guild.policy);
          const callCard = generateCallCard(
            candidate.metrics,
            guild.policy,
            scoringResult
          );
          
          await storage.addCallLog(guild.guildId, {
            id: `auto-${Date.now()}-${candidate.graduation.mint}`,
            guildId: guild.guildId,
            channelId: guild.channelId,
            callCard,
            triggeredBy: "auto",
            createdAt: new Date(),
          });
        } else {
          console.log(`   ❌ Failed to send message - check bot permissions`);
        }
      }
    }

    console.log(`\n📊 Scan complete: ${sent} messages sent for ${highPotential.length} candidates`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
    return { sent, candidates: highPotential.length };
  }

  private isQuietHours(guild: GuildConfig): boolean {
    if (guild.policy.quietHoursStart === undefined) return false;
    if (guild.policy.quietHoursEnd === undefined) return false;

    const hour = new Date().getUTCHours();
    const start = guild.policy.quietHoursStart;
    const end = guild.policy.quietHoursEnd;

    if (start < end) {
      return hour >= start && hour < end;
    } else {
      return hour >= start || hour < end;
    }
  }

  start() {
    if (this.intervalId) {
      console.log('⚠️  Autopost service already running');
      return;
    }
    
    console.log('🚀 Starting Autopost Service...');
    console.log(`   ⏱️  Scan interval: ${this.config.intervalMs / 1000}s`);
    console.log(`   📊 Min score threshold: ${this.config.minScore}`);
    console.log(`   🔑 Discord token: ${process.env.DISCORD_BOT_TOKEN ? 'SET' : 'MISSING'}`);
    
    this.config.enabled = true;
    this.intervalId = setInterval(
      () => this.scanAndNotify(),
      this.config.intervalMs
    );
    
    // Run immediately
    console.log('🔄 Running initial scan...');
    this.scanAndNotify();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.config.enabled = false;
  }

  isRunning(): boolean {
    return this.config.enabled && this.intervalId !== null;
  }
}

// Singleton instance for the app
let autopostInstance: AutopostService | null = null;

export function getAutopostService(): AutopostService {
  if (!autopostInstance) {
    autopostInstance = new AutopostService();
  }
  return autopostInstance;
}

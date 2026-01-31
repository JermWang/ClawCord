import type { GraduationCandidate, GuildConfig, CallLog } from "./types";
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
      console.error("No Discord bot token configured");
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
        console.error(`Discord API error: ${response.status}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Failed to send Discord message:", error);
      return false;
    }
  }

  formatGraduationCall(candidate: GraduationCandidate): string {
    const { graduation, pair, score } = candidate;
    const priceChange = pair.priceChange?.m5 || 0;
    const buySellRatio = pair.txns?.m5?.sells 
      ? (pair.txns.m5.buys / pair.txns.m5.sells).toFixed(2) 
      : "∞";

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
      `🔗 [DexScreener](${pair.url}) | \`${graduation.mint.slice(0, 8)}...${graduation.mint.slice(-4)}\``,
    ];

    // Add risk warnings
    if ((pair.liquidity?.usd || 0) < 10000) {
      lines.push(`⚠️ Low liquidity`);
    }
    if (priceChange < -10) {
      lines.push(`⚠️ Price dropping`);
    }

    return lines.join("\n");
  }

  async scanAndNotify(): Promise<{ sent: number; candidates: number }> {
    const storage = getStorage();
    const guilds = await storage.getAllGuilds();
    
    // Scan for new graduations
    const candidates = await this.watcher.scanForGraduations(DEFAULT_GRADUATION_FILTER);
    
    // Filter to high-potential candidates
    const highPotential = candidates.filter(
      (c) => c.passesFilter && c.score >= this.config.minScore
    );

    let sent = 0;

    // Send to all subscribed guilds with autopost enabled
    for (const guild of guilds) {
      if (!guild.policy.autopostEnabled) continue;
      
      // Check quiet hours
      if (this.isQuietHours(guild)) continue;

      // Check daily limit
      const today = new Date().toDateString();
      const allLogs = await storage.getCallLogs(guild.guildId);
      const callsToday = allLogs.filter(
        (log: CallLog) => new Date(log.createdAt).toDateString() === today
      ).length;
      
      if (callsToday >= guild.policy.maxCallsPerDay) continue;

      for (const candidate of highPotential) {
        const message = this.formatGraduationCall(candidate);
        const success = await this.sendDiscordMessage(guild.channelId, message);
        
        if (success) {
          sent++;
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
        }
      }
    }

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
    if (this.intervalId) return;
    
    this.config.enabled = true;
    this.intervalId = setInterval(
      () => this.scanAndNotify(),
      this.config.intervalMs
    );
    
    // Run immediately
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

import { Client, GatewayIntentBits, Events, REST, Routes, ActivityType } from 'discord.js';
import type { DexScreenerPair, DisplaySettings, GuildConfig } from '../lib/clawcord/types';
import { createPolicy } from '../lib/clawcord/policies';
import { getStorage } from '../lib/clawcord/storage';
import { getAutopostService } from '../lib/clawcord/autopost-service';
import { DexScreenerProvider } from '../lib/clawcord/dexscreener-provider';

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;
const DISCORD_APPLICATION_ID = process.env.DISCORD_APPLICATION_ID!;

if (!DISCORD_BOT_TOKEN) {
  console.error('❌ DISCORD_BOT_TOKEN is required');
  process.exit(1);
}

if (!DISCORD_APPLICATION_ID) {
  console.error('❌ DISCORD_APPLICATION_ID is required');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

const commands = [
  {
    name: 'clawcord',
    description: 'ClawCord signal caller commands',
    options: [
      {
        name: 'scan',
        description: 'Scan for new PumpFun graduations',
        type: 1,
        options: [
          {
            name: 'window',
            description: 'Time window to scan',
            type: 3,
            required: false,
            choices: [
              { name: 'Last 1 hour', value: '1h' },
              { name: 'Last 8 hours', value: '8h' },
              { name: 'Last 24 hours', value: '24h' },
            ],
          },
          {
            name: 'source',
            description: 'Show live scans or posted calls',
            type: 3,
            required: false,
            choices: [
              { name: 'Live scans', value: 'live' },
              { name: 'Posted calls', value: 'posted' },
            ],
          },
        ],
      },
      {
        name: 'policy',
        description: 'View or change the active policy',
        type: 1,
        options: [
          {
            name: 'preset',
            description: 'Policy preset to use',
            type: 3,
            required: false,
            choices: [
              { name: 'Default', value: 'default' },
              { name: 'Aggressive', value: 'aggressive' },
              { name: 'Conservative', value: 'conservative' },
            ],
          },
        ],
      },
      {
        name: 'help',
        description: 'Show help information',
        type: 1,
      },
    ],
  },
  {
    name: 'settings',
    description: 'Configure call/signal message settings',
    options: [
      {
        name: 'view',
        description: 'View current settings',
        type: 1,
      },
      {
        name: 'minscore',
        description: 'Set minimum score for calls (1-10)',
        type: 1,
        options: [
          {
            name: 'score',
            description: 'Minimum score threshold',
            type: 4, // INTEGER
            required: true,
            min_value: 1,
            max_value: 10,
          },
        ],
      },
      {
        name: 'autopost',
        description: 'Enable or disable automatic posting',
        type: 1,
        options: [
          {
            name: 'enabled',
            description: 'Enable autopost',
            type: 5, // BOOLEAN
            required: true,
          },
        ],
      },
      {
        name: 'display',
        description: 'Configure what info to show in calls',
        type: 1,
        options: [
          {
            name: 'volume',
            description: 'Show volume data',
            type: 5,
            required: false,
          },
          {
            name: 'holders',
            description: 'Show holder count',
            type: 5,
            required: false,
          },
          {
            name: 'links',
            description: 'Show DexScreener links',
            type: 5,
            required: false,
          },
        ],
      },
    ],
  },
  {
    name: 'setchannel',
    description: 'Set which channel ClawCord posts calls to',
    options: [
      {
        name: 'channel',
        description: 'The channel for call alerts',
        type: 7, // CHANNEL
        required: true,
        channel_types: [0], // Text channels only
      },
    ],
  },
];

const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  minScore: 6.5,
  showVolume: true,
  showHolders: true,
  showLinks: true,
};

function ensureDisplaySettings(config: GuildConfig): DisplaySettings {
  if (!config.display) {
    config.display = {
      minScore: config.policy.thresholds.minConfidenceScore ?? DEFAULT_DISPLAY_SETTINGS.minScore,
      showVolume: DEFAULT_DISPLAY_SETTINGS.showVolume,
      showHolders: DEFAULT_DISPLAY_SETTINGS.showHolders,
      showLinks: DEFAULT_DISPLAY_SETTINGS.showLinks,
    };
  }
  return config.display;
}

async function getOrCreateGuildConfig(options: {
  guildId: string;
  guildName?: string | null;
  channelId?: string | null;
  channelName?: string | null;
  userId?: string | null;
}): Promise<GuildConfig> {
  const storage = getStorage();
  const existing = await storage.getGuildConfig(options.guildId);

  if (existing) {
    const hadDisplay = Boolean(existing.display);
    ensureDisplaySettings(existing);
    if (!hadDisplay) {
      await storage.saveGuildConfig(existing);
    }
    return existing;
  }

  const config: GuildConfig = {
    guildId: options.guildId,
    guildName: options.guildName || 'Server',
    channelId: options.channelId || '',
    channelName: options.channelName || 'channel',
    policy: createPolicy(options.guildId, 'momentum'),
    watchlist: [],
    adminUsers: options.userId ? [options.userId] : [],
    requireMention: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    callCount: 0,
    display: {
      minScore: DEFAULT_DISPLAY_SETTINGS.minScore,
      showVolume: DEFAULT_DISPLAY_SETTINGS.showVolume,
      showHolders: DEFAULT_DISPLAY_SETTINGS.showHolders,
      showLinks: DEFAULT_DISPLAY_SETTINGS.showLinks,
    },
  };

  await storage.saveGuildConfig(config);
  return config;
}

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN);
  
  try {
    console.log('🔄 Registering slash commands...');
    await rest.put(
      Routes.applicationCommands(DISCORD_APPLICATION_ID),
      { body: commands }
    );
    console.log('✅ Slash commands registered');
  } catch (error) {
    console.error('❌ Failed to register commands:', error);
  }
}

interface GraduationResult {
  tokenAddress: string;
  symbol: string;
  name: string;
  priceUsd: string;
  marketCap: number;
  liquidity: number;
  volume24h: number;
  pairCreatedAt: number;
  url: string;
  ageMinutes: number;
  socials: SocialLink[];
}

interface SocialLink {
  label: string;
  url: string;
}

const SOCIAL_PRIORITY = ['twitter', 'telegram', 'discord', 'medium', 'github', 'reddit'];
const SOCIAL_LABELS: Record<string, string> = {
  twitter: 'X',
  telegram: 'Telegram',
  discord: 'Discord',
  medium: 'Medium',
  github: 'GitHub',
  reddit: 'Reddit',
};

function normalizeSocialType(type?: string): string {
  const normalized = (type || '').toLowerCase();
  if (normalized === 'x') {
    return 'twitter';
  }
  return normalized;
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
    ordered.push({ label: 'Website', url: websiteUrl });
  }

  return ordered.slice(0, 4);
}

const manualDexProvider = new DexScreenerProvider();

async function scanGraduations(windowMinutes = 60): Promise<GraduationResult[]> {
  try {
    const limit = windowMinutes >= 1440 ? 250 : windowMinutes >= 480 ? 200 : 120;
    const cutoff = Date.now() - windowMinutes * 60 * 1000;
    const pairs = await manualDexProvider.getLatestPumpFunGraduations(limit);

    return pairs
      .filter((pair) => pair.pairCreatedAt && pair.pairCreatedAt >= cutoff)
      .filter((pair) => (pair.liquidity?.usd || 0) > 5000)
      .map((pair) => ({
        tokenAddress: pair.baseToken?.address || '',
        symbol: pair.baseToken?.symbol || 'UNKNOWN',
        name: pair.baseToken?.name || 'Unknown Token',
        priceUsd: pair.priceUsd || '0',
        marketCap: pair.marketCap || 0,
        liquidity: pair.liquidity?.usd || 0,
        volume24h: pair.volume?.h24 || 0,
        pairCreatedAt: pair.pairCreatedAt || 0,
        url: pair.url || `https://dexscreener.com/solana/${pair.baseToken?.address}`,
        ageMinutes: Math.floor((Date.now() - (pair.pairCreatedAt || 0)) / 60000),
        socials: extractSocialLinks(pair),
      }))
      .sort((a, b) => {
        const aHasSocials = a.socials.length > 0 ? 1 : 0;
        const bHasSocials = b.socials.length > 0 ? 1 : 0;
        if (aHasSocials !== bHasSocials) {
          return bHasSocials - aHasSocials;
        }
        return b.pairCreatedAt - a.pairCreatedAt;
      })
      .slice(0, 10);
  } catch (error) {
    console.error('Scan error:', error);
    return [];
  }
}

client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Bot is online as ${c.user.tag}`);
  console.log(`📊 Serving ${c.guilds.cache.size} servers`);
  
  c.user.setActivity('for graduations', { type: ActivityType.Watching });
  
  await registerCommands();

  // Start the autopost service to scan for graduations and post calls automatically
  const autopostService = getAutopostService();
  autopostService.start();
  console.log('🔄 Autopost service started - scanning every 60 seconds');
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  
  if (interaction.commandName === 'clawcord') {
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === 'scan') {
      await interaction.deferReply();
      
      try {
        const window = interaction.options.getString('window') || '1h';
        const source = interaction.options.getString('source') || 'live';
        const windowMinutes = window === '24h' ? 1440 : window === '8h' ? 480 : 60;
        const windowLabel = window === '1h' ? 'last hour' : `last ${windowMinutes / 60} hours`;

        if (source === 'posted') {
          if (!interaction.guildId) {
            await interaction.editReply('❌ Posted call history is only available in a server.');
            return;
          }

          const storage = getStorage();
          const since = new Date(Date.now() - windowMinutes * 60 * 1000);
          const logs = await storage.getCallLogsSince(interaction.guildId, since, 25);

          if (logs.length === 0) {
            await interaction.editReply(`📭 No calls posted in the ${windowLabel}.`);
            return;
          }

          const messages = logs.slice(0, 10).map((log, i) => {
            const card = log.callCard;
            const symbol = card?.token?.symbol || 'UNKNOWN';
            const mint = card?.token?.mint || '';
            const confidence = card?.confidence ?? 0;
            const liquidity = card?.metrics?.liquidity ?? 0;
            const liqFormatted = liquidity >= 1000000
              ? `$${(liquidity / 1000000).toFixed(2)}M`
              : `$${(liquidity / 1000).toFixed(0)}K`;
            const ageMinutes = Math.max(0, Math.floor((Date.now() - log.createdAt.getTime()) / 60000));
            const ageLabel = ageMinutes >= 60
              ? `${Math.floor(ageMinutes / 60)}h`
              : `${ageMinutes}m`;
            const sourceLabel = log.triggeredBy === 'auto'
              ? 'auto'
              : log.triggeredBy === 'mention'
                ? 'mention'
                : 'manual';
            const dexUrl = mint ? `https://dexscreener.com/solana/${mint}` : '';

            return [
              `**${i + 1}. $${symbol}** — ${ageLabel} ago (${sourceLabel})`,
              `   ⭐ Score: ${confidence.toFixed(1)} | 💧 Liq: ${liqFormatted}`,
              dexUrl ? `   📊 [DexScreener](${dexUrl}) | \`${mint.slice(0, 6)}...${mint.slice(-4)}\`` : null,
            ]
              .filter(Boolean)
              .join('\n');
          });

          await interaction.editReply({
            content: [
              `📌 **Posted Calls** (${windowLabel})`,
              '',
              messages.join('\n\n'),
              '',
              `_Found ${logs.length} posted call${logs.length !== 1 ? 's' : ''} in the ${windowLabel}_`,
            ].join('\n'),
          });
          return;
        }

        const graduations = await scanGraduations(windowMinutes);
        
        if (graduations.length === 0) {
          await interaction.editReply(`📭 No graduations found in the ${windowLabel}.`);
          return;
        }
        
        const top5 = graduations.slice(0, 5);
        const messages = top5.map((g, i) => {
          const mcapFormatted = g.marketCap >= 1000000 
            ? `$${(g.marketCap / 1000000).toFixed(2)}M` 
            : `$${(g.marketCap / 1000).toFixed(0)}K`;
          const liqFormatted = `$${(g.liquidity / 1000).toFixed(0)}K`;
          const socialLinks = g.socials
            .map((social) => `[${social.label}](${social.url})`)
            .join(' • ');
          
          return [
            `**${i + 1}. $${g.symbol}** — ${g.ageMinutes}m ago`,
            `   💰 MCap: ${mcapFormatted} | 💧 Liq: ${liqFormatted}`,
            socialLinks ? `   🔗 ${socialLinks}` : null,
            `   📊 [DexScreener](${g.url}) | \`${g.tokenAddress.slice(0, 6)}...${g.tokenAddress.slice(-4)}\``,
          ]
            .filter(Boolean)
            .join('\n');
        });
        
        await interaction.editReply({
          content: [
            `🎓 **Recent Graduations** (${windowLabel})`,
            '',
            messages.join('\n\n'),
            '',
            `_Found ${graduations.length} graduation${graduations.length !== 1 ? 's' : ''} in the ${windowLabel}_`,
          ].join('\n'),
        });
      } catch (error) {
        console.error('Scan error:', error);
        await interaction.editReply('❌ Failed to scan. Please try again.');
      }
    }
    
    if (subcommand === 'policy') {
      const preset = interaction.options.getString('preset');
      
      if (preset) {
        await interaction.reply(`✅ Policy set to **${preset}**`);
      } else {
        await interaction.reply([
          '📋 **Current Policy: Default**',
          '',
          'Available presets:',
          '• `default` — Balanced settings',
          '• `aggressive` — Early entry, higher risk',
          '• `conservative` — Safer plays',
          '',
          'Use `/clawcord policy preset:<name>` to change.',
        ].join('\n'));
      }
    }
    
    if (subcommand === 'help') {
      await interaction.reply({
        content: [
          '🦀 **ClawCord Commands**',
          '',
          '`/clawcord scan` — Scan for new PumpFun graduations',
          '`/clawcord policy` — View or change policy preset',
          '`/clawcord help` — Show this help message',
          '',
          '`/settings view` — View current settings',
          '`/settings minscore` — Set minimum score for calls',
          '`/settings autopost` — Enable/disable auto-posting',
          '`/settings display` — Configure call display options',
          '',
          '`/setchannel` — Set the channel for call alerts',
          'Reminder: Move the ClawCord bot role above public roles so it can post.',
          '',
          '**Links:**',
          '• Website: https://clawcord.xyz',
          '• Twitter: https://x.com/ClawCordSOL',
          '• Discord: https://discord.gg/NZEKBbqj2q',
        ].join('\n'),
        ephemeral: true,
      });
    }
  }

  // Handle /settings command
  if (interaction.commandName === 'settings') {
    if (!interaction.guildId) {
      await interaction.reply({ content: '❌ This command can only be used in a server.', ephemeral: true });
      return;
    }

    const storage = getStorage();
    const config = await getOrCreateGuildConfig({
      guildId: interaction.guildId,
      guildName: interaction.guild?.name,
      channelId: interaction.channelId,
      channelName: interaction.channel && 'name' in interaction.channel ? interaction.channel.name : undefined,
      userId: interaction.user?.id,
    });
    const display = ensureDisplaySettings(config);
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'view') {
      const channelMention = config.channelId ? `<#${config.channelId}>` : 'Not set';
      await interaction.reply({
        content: [
          '⚙️ **ClawCord Settings**',
          '',
          `📢 **Call Channel:** ${channelMention}`,
          `📊 **Min Score:** ${display.minScore}/10`,
          `🔄 **Autopost:** ${config.policy.autopostEnabled ? '✅ Enabled' : '❌ Disabled'}`,
          '',
          '**Display Options:**',
          `• Volume: ${display.showVolume ? '✅' : '❌'}`,
          `• Holders: ${display.showHolders ? '✅' : '❌'}`,
          `• Links: ${display.showLinks ? '✅' : '❌'}`,
        ].join('\n'),
        ephemeral: true,
      });
    }

    if (subcommand === 'minscore') {
      const score = interaction.options.getInteger('score', true);
      display.minScore = score;
      config.policy.thresholds.minConfidenceScore = score;
      config.updatedAt = new Date();
      await storage.saveGuildConfig(config);
      await interaction.reply({
        content: `✅ Minimum score set to **${score}/10**\n\nOnly calls with score ≥ ${score} will be posted.`,
        ephemeral: true,
      });
    }

    if (subcommand === 'autopost') {
      const enabled = interaction.options.getBoolean('enabled', true);
      config.policy.autopostEnabled = enabled;
      config.updatedAt = new Date();
      await storage.saveGuildConfig(config);
      await interaction.reply({
        content: enabled 
          ? '✅ **Autopost enabled!**\n\nClawCord will automatically post graduation calls to your configured channel.'
          : '❌ **Autopost disabled.**\n\nUse `/clawcord scan` to manually scan for graduations.',
        ephemeral: true,
      });
    }

    if (subcommand === 'display') {
      const volume = interaction.options.getBoolean('volume');
      const holders = interaction.options.getBoolean('holders');
      const links = interaction.options.getBoolean('links');

      if (volume !== null) display.showVolume = volume;
      if (holders !== null) display.showHolders = holders;
      if (links !== null) display.showLinks = links;
      config.updatedAt = new Date();
      await storage.saveGuildConfig(config);

      await interaction.reply({
        content: [
          '✅ **Display settings updated!**',
          '',
          `• Volume: ${display.showVolume ? '✅ Shown' : '❌ Hidden'}`,
          `• Holders: ${display.showHolders ? '✅ Shown' : '❌ Hidden'}`,
          `• Links: ${display.showLinks ? '✅ Shown' : '❌ Hidden'}`,
        ].join('\n'),
        ephemeral: true,
      });
    }
  }

  // Handle /setchannel command
  if (interaction.commandName === 'setchannel') {
    if (!interaction.guildId) {
      await interaction.reply({ content: '❌ This command can only be used in a server.', ephemeral: true });
      return;
    }

    const channel = interaction.options.getChannel('channel', true);
    const storage = getStorage();
    const config = await getOrCreateGuildConfig({
      guildId: interaction.guildId,
      guildName: interaction.guild?.name,
      channelId: interaction.channelId,
      channelName: interaction.channel && 'name' in interaction.channel ? interaction.channel.name : undefined,
      userId: interaction.user?.id,
    });
    config.channelId = channel.id;
    config.channelName = 'name' in channel && channel.name ? channel.name : config.channelName;
    config.guildName = interaction.guild?.name || config.guildName;
    config.updatedAt = new Date();
    await storage.saveGuildConfig(config);

    await interaction.reply({
      content: [
        `✅ **Call channel set to ${channel}**`,
        '',
        'ClawCord will post graduation alerts to this channel.',
        '',
        '**Next steps:**',
        '• Use `/settings autopost enabled:true` to enable automatic posting',
        '• Use `/settings minscore` to set minimum score threshold',
        '• Use `/clawcord scan` to manually scan for graduations',
      ].join('\n'),
    });

    console.log(`📢 Channel set for ${interaction.guild?.name}: #${channel.name} (${channel.id})`);
  }
});

client.on(Events.GuildCreate, (guild) => {
  console.log(`➕ Joined server: ${guild.name} (${guild.id})`);
});

client.on(Events.GuildDelete, (guild) => {
  console.log(`➖ Left server: ${guild.name} (${guild.id})`);
});

console.log('🚀 Starting ClawCord bot...');
client.login(DISCORD_BOT_TOKEN);

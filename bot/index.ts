import { Client, GatewayIntentBits, Events, REST, Routes, ActivityType } from 'discord.js';
import { getGuildSettings, updateGuildSettings, supabase } from './supabase';

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
}

async function scanGraduations(): Promise<GraduationResult[]> {
  try {
    // Use DexScreener search for recent PumpFun graduated tokens (Raydium pairs)
    const response = await fetch('https://api.dexscreener.com/latest/dex/search?q=pump');
    const data = await response.json() as any;
    
    if (!data.pairs || !Array.isArray(data.pairs)) {
      return [];
    }

    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    // Filter for:
    // 1. Solana chain
    // 2. Raydium DEX (where PumpFun tokens graduate to)
    // 3. Created within the last hour
    // 4. Has liquidity
    const recentGraduations = data.pairs
      .filter((pair: any) => {
        const isRecentEnough = pair.pairCreatedAt && pair.pairCreatedAt >= oneHourAgo;
        const isSolana = pair.chainId === 'solana';
        const isRaydium = pair.dexId === 'raydium';
        const hasLiquidity = (pair.liquidity?.usd || 0) > 5000;
        return isRecentEnough && isSolana && isRaydium && hasLiquidity;
      })
      .map((pair: any) => ({
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
      }))
      .sort((a: GraduationResult, b: GraduationResult) => b.pairCreatedAt - a.pairCreatedAt)
      .slice(0, 10);

    return recentGraduations;
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
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  
  if (interaction.commandName === 'clawcord') {
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === 'scan') {
      await interaction.deferReply();
      
      try {
        const graduations = await scanGraduations();
        
        if (graduations.length === 0) {
          await interaction.editReply('📭 No graduations found in the last hour.');
          return;
        }
        
        const top5 = graduations.slice(0, 5);
        const messages = top5.map((g, i) => {
          const mcapFormatted = g.marketCap >= 1000000 
            ? `$${(g.marketCap / 1000000).toFixed(2)}M` 
            : `$${(g.marketCap / 1000).toFixed(0)}K`;
          const liqFormatted = `$${(g.liquidity / 1000).toFixed(0)}K`;
          
          return [
            `**${i + 1}. $${g.symbol}** — ${g.ageMinutes}m ago`,
            `   💰 MCap: ${mcapFormatted} | 💧 Liq: ${liqFormatted}`,
            `   🔗 [DexScreener](${g.url}) | \`${g.tokenAddress.slice(0, 6)}...${g.tokenAddress.slice(-4)}\``,
          ].join('\n');
        });
        
        await interaction.editReply({
          content: [
            `🎓 **Recent Graduations** (last hour)`,
            '',
            messages.join('\n\n'),
            '',
            `_Found ${graduations.length} graduation${graduations.length !== 1 ? 's' : ''} in the last hour_`,
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

    const settings = await getGuildSettings(interaction.guildId, interaction.guild?.name);
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'view') {
      const channelMention = settings.channel_id ? `<#${settings.channel_id}>` : 'Not set';
      await interaction.reply({
        content: [
          '⚙️ **ClawCord Settings**',
          '',
          `📢 **Call Channel:** ${channelMention}`,
          `📊 **Min Score:** ${settings.min_score}/10`,
          `🔄 **Autopost:** ${settings.autopost ? '✅ Enabled' : '❌ Disabled'}`,
          '',
          '**Display Options:**',
          `• Volume: ${settings.show_volume ? '✅' : '❌'}`,
          `• Holders: ${settings.show_holders ? '✅' : '❌'}`,
          `• Links: ${settings.show_links ? '✅' : '❌'}`,
        ].join('\n'),
        ephemeral: true,
      });
    }

    if (subcommand === 'minscore') {
      const score = interaction.options.getInteger('score', true);
      await updateGuildSettings(interaction.guildId, { min_score: score });
      await interaction.reply({
        content: `✅ Minimum score set to **${score}/10**\n\nOnly calls with score ≥ ${score} will be posted.`,
        ephemeral: true,
      });
    }

    if (subcommand === 'autopost') {
      const enabled = interaction.options.getBoolean('enabled', true);
      await updateGuildSettings(interaction.guildId, { autopost: enabled });
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

      const updates: Record<string, boolean> = {};
      if (volume !== null) updates.show_volume = volume;
      if (holders !== null) updates.show_holders = holders;
      if (links !== null) updates.show_links = links;

      await updateGuildSettings(interaction.guildId, updates);
      const newSettings = await getGuildSettings(interaction.guildId);

      await interaction.reply({
        content: [
          '✅ **Display settings updated!**',
          '',
          `• Volume: ${newSettings.show_volume ? '✅ Shown' : '❌ Hidden'}`,
          `• Holders: ${newSettings.show_holders ? '✅ Shown' : '❌ Hidden'}`,
          `• Links: ${newSettings.show_links ? '✅ Shown' : '❌ Hidden'}`,
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
    await updateGuildSettings(interaction.guildId, { 
      channel_id: channel.id,
      guild_name: interaction.guild?.name 
    });

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

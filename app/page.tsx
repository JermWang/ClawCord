"use client";

import { motion } from "framer-motion";
import { Github, Twitter, Zap, Shield, BarChart3, Users, Terminal, Play, Bot, TrendingUp, Target, Clock } from "lucide-react";
import Image from "next/image";
import { Header } from "@/components/clawcord/header";
import { AsciiShader } from "@/components/ascii-shader";

// Floating icons for hero section
const floatingIcons = [
  { icon: "🦀", x: "10%", y: "20%", delay: 0 },
  { icon: "📊", x: "85%", y: "15%", delay: 0.2 },
  { icon: "🚀", x: "5%", y: "60%", delay: 0.4 },
  { icon: "💎", x: "90%", y: "55%", delay: 0.6 },
  { icon: "⚡", x: "15%", y: "80%", delay: 0.8 },
  { icon: "🎯", x: "80%", y: "75%", delay: 1.0 },
  { icon: "🔔", x: "25%", y: "10%", delay: 0.3 },
  { icon: "📈", x: "70%", y: "25%", delay: 0.5 },
];

// Command examples for code boxes
const commandExamples = [
  {
    title: "Scan for Graduations",
    command: `/clawcord scan`,
    description: "Find newly graduated PumpFun tokens with high potential",
    output: `🎓 $CRAB just graduated from PumpFun
Score: 8.2/10 | Liq: $18.5k | Vol: $2.3k
Holders: 156 | Top 10: 23%
🔗 View on DexScreener`,
  },
  {
    title: "Generate a Call",
    command: `/clawcord call $TICKER`,
    description: "Get a full analysis with pros, risks, and confidence score",
    output: `━━━━━━━━━━━━━━━━━━━━━
$CRAB • 8x2f...4k9a
Policy: Fresh Scanner v1.0
━━━━━━━━━━━━━━━━━━━━━
✅ Pros: Strong volume, LP locked
⚠️ Risks: 🟡 New deployer
📈 Confidence: ████████░░ 8/10`,
  },
  {
    title: "Enable Autopost",
    command: `/clawcord autopost enabled:true`,
    description: "Automatically post high-scoring tokens to your channel",
    output: `✅ Autopost enabled!
Channel: #alpha-calls
Policy: Momentum
Min Score: 7.0
Daily Limit: 10 calls`,
  },
];

// Feature blocks data
const features = [
  {
    title: "Policy Engine",
    subtitle: "Configure once, run forever.",
    description: "Set your thresholds for liquidity, volume, holders, and more. ClawCord applies your rules to every token automatically.",
    icon: Shield,
    color: "text-red-500",
    stats: ["6 preset policies", "Custom thresholds", "Per-server configs"],
  },
  {
    title: "Real-time Scanning",
    subtitle: "Catch graduations as they happen.",
    description: "Monitor PumpFun → Raydium migrations in real-time. Get notified within minutes of graduation, not hours.",
    icon: Zap,
    color: "text-amber-500",
    stats: ["45 min max age", "30s cache refresh", "100+ pairs/scan"],
  },
  {
    title: "Deep Analytics",
    subtitle: "Data from multiple sources.",
    description: "Helius for holder data, DexScreener for price action, on-chain for authorities. All combined into one score.",
    icon: BarChart3,
    color: "text-emerald-500",
    stats: ["Holder counts", "Whale detection", "Buy/sell ratios"],
  },
  {
    title: "Community First",
    subtitle: "Built for Discord alpha groups.",
    description: "Structured call cards, audit logs, quiet hours, daily limits. Everything you need to run a professional signal channel.",
    icon: Users,
    color: "text-blue-500",
    stats: ["Call receipts", "Full audit trail", "Rate limiting"],
  },
];

export default function ClawCordLanding() {
  return (
    <div className="flex min-h-screen flex-col bg-[#1a1a1a] relative overflow-hidden">
      <Header />

      {/* ===== HERO SECTION ===== */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        {/* ASCII Shader Background - Dark mode */}
        <div className="absolute inset-0 z-0">
          <AsciiShader
            mode="plasma"
            color="#4a2020"
            bgColor="#1a1a1a"
            density={1.0}
            speed={0.3}
            charRamp=" .:-=+*#%@"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a1a]/50 via-transparent to-[#1a1a1a]" />
        </div>

        {/* Floating Icons */}
        {floatingIcons.map((item, i) => (
          <motion.div
            key={i}
            className="absolute text-3xl md:text-4xl opacity-60 pointer-events-none"
            style={{ left: item.x, top: item.y }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: [0.4, 0.7, 0.4],
              scale: 1,
              y: [0, -10, 0],
            }}
            transition={{
              delay: item.delay,
              duration: 3,
              repeat: Infinity,
              repeatType: "reverse",
            }}
          >
            {item.icon}
          </motion.div>
        ))}

        {/* Hero Content */}
        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <p className="text-red-400 text-sm uppercase tracking-widest mb-4 font-medium">
              A Signal Caller&apos;s Best Friend
            </p>
            
            <h1 
              className="text-5xl md:text-7xl font-bold text-white mb-6"
              style={{ fontFamily: "var(--font-figtree), Figtree" }}
            >
              <span className="text-red-400">Claw</span>Cord
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-400 mb-8 max-w-2xl mx-auto leading-relaxed">
              Policy-driven signal caller for Solana tokens.
              <br />
              <span className="text-gray-500">Automate your Discord calls with real-time data.</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/api/discord/invite"
                className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-8 py-4 rounded-full text-lg font-semibold transition-all duration-200 shadow-lg shadow-red-500/25"
              >
                <Bot className="w-5 h-5" />
                Add to Discord
              </a>
              <a
                href="#try-commands"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-full text-lg font-semibold transition-all duration-200 border border-white/20"
              >
                <Terminal className="w-5 h-5" />
                Try Commands
              </a>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator - positioned at bottom of section */}
        <motion.div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-2">
            <div className="w-1 h-2 bg-white/50 rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* ===== TRANSITION FADE ===== */}
      <div className="relative h-32 -mt-16 z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a1a] via-[#1a1a1a]/50 to-[#f5f0e8]" />
      </div>

      {/* ===== WHY CLAWCORD SECTION ===== */}
      <section className="py-24 bg-[#f5f0e8] relative -mt-16">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 
              className="text-4xl font-bold text-[#202020] mb-4"
              style={{ fontFamily: "var(--font-figtree), Figtree" }}
            >
              Why ClawCord?
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Stop manually scanning DexScreener. Let ClawCord watch PumpFun graduations 24/7 and alert your community to the best opportunities.
            </p>
          </motion.div>

          {/* Feature Grid - 2x2 */}
          <div className="grid md:grid-cols-2 gap-12">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex gap-6"
              >
                <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center ${feature.color}`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 
                    className="text-2xl font-semibold text-[#202020] mb-1"
                    style={{ fontFamily: "var(--font-figtree), Figtree" }}
                  >
                    {feature.title}
                  </h3>
                  <p className="text-red-500 text-sm font-medium mb-3">{feature.subtitle}</p>
                  <p className="text-gray-600 mb-4 leading-relaxed">{feature.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {feature.stats.map((stat) => (
                      <span key={stat} className="text-xs bg-white px-3 py-1 rounded-full text-gray-600 border border-gray-200">
                        {stat}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TRY COMMANDS SECTION ===== */}
      <section id="try-commands" className="py-24 bg-[#1a1a1a]">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 
              className="text-4xl font-bold text-white mb-4"
              style={{ fontFamily: "var(--font-figtree), Figtree" }}
            >
              Try These Commands
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Simple slash commands that do the heavy lifting. Add the bot and start calling in minutes.
            </p>
          </motion.div>

          {/* Command Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            {commandExamples.map((cmd, index) => (
              <motion.div
                key={cmd.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-[#252525] rounded-2xl border border-[#333] overflow-hidden group hover:border-red-500/50 transition-colors"
              >
                {/* Header */}
                <div className="px-5 py-4 border-b border-[#333] flex items-center justify-between">
                  <h3 className="text-white font-semibold">{cmd.title}</h3>
                  <span className="text-xs text-gray-500">{cmd.description}</span>
                </div>
                
                {/* Command Input */}
                <div className="px-5 py-3 bg-[#1a1a1a] border-b border-[#333] font-mono text-sm">
                  <span className="text-gray-500">$</span>{" "}
                  <span className="text-red-400">{cmd.command}</span>
                </div>
                
                {/* Output */}
                <div className="px-5 py-4 font-mono text-xs text-gray-400 whitespace-pre-line leading-relaxed">
                  {cmd.output}
                </div>

                {/* CTA */}
                <div className="px-5 py-4 border-t border-[#333] bg-[#202020]">
                  <a
                    href="/api/discord/invite"
                    className="flex items-center justify-center gap-2 w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Try This Command
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== JOIN COMMUNITY CTA ===== */}
      <section className="py-20 bg-gradient-to-r from-red-600 to-red-500 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        </div>
        
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 
              className="text-3xl md:text-4xl font-bold text-white mb-4"
              style={{ fontFamily: "var(--font-figtree), Figtree" }}
            >
              Join the Community &gt;
            </h2>
            <p className="text-white/80 mb-8 text-lg">
              Used by alpha groups tracking PumpFun graduations.
              <br />
              Add ClawCord to your server and start calling today.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/api/discord/invite"
                className="inline-flex items-center gap-2 bg-white text-red-600 px-8 py-4 rounded-full text-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg"
              >
                <Bot className="w-5 h-5" />
                Add to Discord — It&apos;s Free
              </a>
            </div>

            <p className="mt-6 text-white/60 text-sm">
              No credit card required • Setup in 2 minutes • Works with any server
            </p>
          </motion.div>
        </div>
      </section>

      {/* ===== STATS BAR ===== */}
      <section className="py-12 bg-[#f5f0e8] border-y border-[#e5e0d8]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "12k+", label: "Tokens Scanned", icon: Target },
              { value: "< 45m", label: "Max Token Age", icon: Clock },
              { value: "75+", label: "Min Holders", icon: Users },
              { value: "8.2", label: "Avg Call Score", icon: TrendingUp },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="flex flex-col items-center"
              >
                <stat.icon className="w-6 h-6 text-red-500 mb-2" />
                <div className="text-3xl font-bold text-[#202020]">{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="w-full bg-[#1a1a1a] border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {/* Brand Column */}
            <div className="col-span-2 md:col-span-1">
              <h3
                className="text-xl font-semibold text-white mb-2"
                style={{ fontFamily: "var(--font-figtree), Figtree" }}
              >
                <span className="text-red-400">Claw</span>Cord
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Policy-driven signal caller for Solana tokens.
              </p>
              <div className="flex items-center gap-3">
                <a
                  href="https://x.com/ClawCordSOL"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-gray-400 hover:text-white hover:bg-white/20 transition-colors"
                  aria-label="Twitter"
                >
                  <Twitter className="w-4 h-4" />
                </a>
                <a
                  href="https://github.com/JermWang/ClawCord"
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-gray-400 hover:text-white hover:bg-white/20 transition-colors"
                  aria-label="GitHub"
                >
                  <Github className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Link Sections */}
            {[
              { title: "Product", links: ["Features", "Commands", "API Docs"] },
              { title: "Resources", links: ["Documentation", "Discord", "Status"] },
              { title: "Legal", links: ["Privacy", "Terms", "Security"] },
            ].map((section) => (
              <div key={section.title}>
                <h4 className="text-sm font-medium text-white mb-4 uppercase tracking-wide">
                  {section.title}
                </h4>
                <ul className="space-y-2">
                  {section.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 mt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} ClawCord. All rights reserved.
            </p>
            <div className="flex items-center gap-2 text-sm">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-gray-500">All systems operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

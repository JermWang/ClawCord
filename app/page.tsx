"use client";

import { motion } from "framer-motion";
import { Github, Twitter } from "lucide-react";
import { Header } from "@/components/clawcord/header";
import { StatsCards } from "@/components/clawcord/stats-cards";
import { CallLogsTable } from "@/components/clawcord/call-logs-table";
import { ServersSidebar } from "@/components/clawcord/servers-sidebar";
import { PolicyPresets } from "@/components/clawcord/policy-presets";
import { LiveCallDemo } from "@/components/clawcord/live-call-demo";
import { AsciiShader } from "@/components/ascii-shader";

export default function ClawCordDashboard() {
  return (
    <div className="flex min-h-screen flex-col bg-[#fafafa] relative">
      {/* ASCII Shader Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <AsciiShader
          mode="plasma"
          color="#f8a5a5"
          bgColor="#fff8f8"
          density={1.3}
          speed={0.5}
          charRamp=" .:-=+*#%@"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/50 to-white/80" />
      </div>
      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />

      {/* Main Content */}
      <main className="flex-1 pt-28 pb-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <h2
              className="text-[40px] font-normal leading-tight tracking-tight text-[#202020] mb-4"
              style={{ fontFamily: "var(--font-figtree), Figtree", fontWeight: "400" }}
            >
              Signal Caller Dashboard{" "}
              <span className="opacity-40">
                for Solana tokens with policy-driven intelligence.
              </span>
            </h2>
            <p
              className="text-lg leading-7 text-[#666666] max-w-2xl"
              style={{ fontFamily: "var(--font-figtree), Figtree" }}
            >
              Monitor your connected Discord servers, generate calls with configurable policies, and track performance across all your signal channels.
            </p>
          </motion.div>

          {/* Stats Overview */}
          <section className="mb-8">
            <StatsCards />
          </section>

          {/* Main Content Grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column - Main Content */}
            <div className="flex flex-col gap-6 lg:col-span-2">
              <LiveCallDemo />
              <CallLogsTable />
            </div>

            {/* Right Column - Sidebar */}
            <div className="flex flex-col gap-6">
              <ServersSidebar />
              <PolicyPresets />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-[#e5e5e5]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            {/* Brand Column */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="col-span-2"
            >
              <div className="mb-4">
                <h3
                  className="text-2xl font-semibold text-[#202020] mb-2"
                  style={{ fontFamily: "var(--font-figtree), Figtree", fontWeight: "600" }}
                >
                  ClawCord
                </h3>
                <p
                  className="text-sm leading-5 text-[#666666] max-w-xs"
                  style={{ fontFamily: "var(--font-figtree), Figtree" }}
                >
                  Policy-driven signal caller for Solana tokens. Automate your Discord calls with configurable policies and real-time data.
                </p>
              </div>

              {/* Social Links */}
              <div className="flex items-center gap-3 mt-6">
                <a
                  href="#"
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-[#e5e5e5] text-[#666666] hover:text-[#202020] hover:border-[#202020] transition-colors duration-150"
                  aria-label="Twitter"
                >
                  <Twitter className="w-4 h-4" />
                </a>
                <a
                  href="#"
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-[#e5e5e5] text-[#666666] hover:text-[#202020] hover:border-[#202020] transition-colors duration-150"
                  aria-label="GitHub"
                >
                  <Github className="w-4 h-4" />
                </a>
              </div>
            </motion.div>

            {/* Link Sections */}
            {[
              {
                title: "Product",
                links: ["Features", "Pricing", "API Docs", "Changelog"],
              },
              {
                title: "Resources",
                links: ["Documentation", "Help Center", "Discord", "Status"],
              },
              {
                title: "Legal",
                links: ["Privacy Policy", "Terms of Service", "Security"],
              },
            ].map((section, index) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
                className="col-span-1"
              >
                <h4
                  className="text-sm font-medium text-[#202020] mb-4 uppercase tracking-wide"
                  style={{ fontFamily: "var(--font-figtree), Figtree", fontWeight: "500" }}
                >
                  {section.title}
                </h4>
                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-sm text-[#666666] hover:text-[#202020] transition-colors duration-150"
                        style={{ fontFamily: "var(--font-figtree), Figtree" }}
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          {/* Bottom Bar */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="pt-8 mt-8 border-t border-[#e5e5e5]"
          >
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p
                className="text-sm text-[#666666]"
                style={{ fontFamily: "var(--font-figtree), Figtree" }}
              >
                {`© ${new Date().getFullYear()} ClawCord. All rights reserved.`}
              </p>
              <div className="flex items-center gap-2 text-sm">
                <span
                  className="h-2 w-2 rounded-full bg-green-500"
                  aria-hidden="true"
                />
                <span
                  className="text-[#666666]"
                  style={{ fontFamily: "var(--font-figtree), Figtree" }}
                >
                  All systems operational
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </footer>
      </div>
    </div>
  );
}

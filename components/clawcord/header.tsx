"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Activity, Bell, Settings, Menu, X, Plus } from "lucide-react";

const navigationLinks = [
  { name: "Overview", href: "#overview", active: true },
  { name: "Servers", href: "#servers" },
  { name: "Policies", href: "#policies" },
  { name: "Logs", href: "#logs" },
];

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-card/95 backdrop-blur-md shadow-sm border-b border-border"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Image
              src="/clawcord-logo.png"
              alt="ClawCord Logo"
              width={48}
              height={48}
              className="h-12 w-auto"
            />
            <div>
              <h1
                className="text-xl font-semibold text-foreground"
                style={{ fontFamily: "var(--font-figtree), Figtree", fontWeight: "600" }}
              >
                ClawCord
              </h1>
              <p
                className="text-xs text-muted-foreground"
                style={{ fontFamily: "var(--font-figtree), Figtree" }}
              >
                Signal Caller
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-1">
              {navigationLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className={`px-4 py-2 text-base transition-colors duration-200 relative group rounded-full ${
                    link.active
                      ? "text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  style={{ fontFamily: "var(--font-figtree), Figtree", fontWeight: link.active ? "500" : "400" }}
                >
                  <span>{link.name}</span>
                  {link.active && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 bg-secondary rounded-full -z-10"
                    />
                  )}
                </a>
              ))}
            </div>
          </div>

          {/* Right Actions */}
          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative rounded-full">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Activity className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Settings className="h-4 w-4" />
            </Button>
            <a
              href="/api/discord/invite"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 flex items-center gap-2 bg-[#5865F2] text-white px-[18px] py-[12px] rounded-full text-sm font-medium hover:bg-[#4752C4] transition-all duration-200"
              style={{ fontFamily: "var(--font-figtree), Figtree", fontWeight: "500" }}
            >
              <Plus className="h-4 w-4" />
              Add to Discord
            </a>
            <a
              href="#dashboard"
              className="bg-primary text-primary-foreground px-[18px] py-[12px] rounded-full text-sm font-medium hover:opacity-90 transition-all duration-200 hover:rounded-2xl"
              style={{ fontFamily: "var(--font-figtree), Figtree", fontWeight: "500" }}
            >
              Open Dashboard
            </a>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-foreground hover:text-primary p-2 rounded-md transition-colors duration-200"
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="md:hidden bg-card/95 backdrop-blur-md border-t border-border"
          >
            <div className="px-6 py-6 space-y-4">
              {navigationLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block w-full text-left py-3 text-lg transition-colors duration-200 ${
                    link.active ? "text-foreground font-medium" : "text-muted-foreground"
                  }`}
                  style={{ fontFamily: "var(--font-figtree), Figtree" }}
                >
                  {link.name}
                </a>
              ))}
              <div className="pt-4 border-t border-border">
                <a
                  href="#dashboard"
                  className="block w-full bg-primary text-primary-foreground px-[18px] py-[15px] rounded-full text-base font-medium text-center"
                >
                  Open Dashboard
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

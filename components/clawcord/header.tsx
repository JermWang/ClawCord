"use client";

import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Activity, Bell, Settings } from "lucide-react";

export function Header() {
  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
      <div className="flex items-center gap-3">
        <Image 
          src="/clawcord-logo.png" 
          alt="ClawCord Logo" 
          width={44} 
          height={44}
          className="h-11 w-auto"
        />
        <div>
          <h1 className="text-lg font-semibold text-foreground">ClawCord</h1>
          <p className="text-xs text-muted-foreground">Signal Caller Dashboard</p>
        </div>
      </div>

      <nav className="hidden items-center gap-6 md:flex">
        <NavLink href="#" active>Overview</NavLink>
        <NavLink href="#">Servers</NavLink>
        <NavLink href="#">Policies</NavLink>
        <NavLink href="#">Logs</NavLink>
      </nav>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
        </Button>
        <Button variant="ghost" size="icon">
          <Activity className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
        <div className="ml-2 h-8 w-8 rounded-full bg-secondary" />
      </div>
    </header>
  );
}

function NavLink({ href, children, active }: { href: string; children: React.ReactNode; active?: boolean }) {
  return (
    <a
      href={href}
      className={`text-sm transition-colors ${
        active
          ? "font-medium text-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </a>
  );
}

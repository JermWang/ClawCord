import { NextRequest, NextResponse } from "next/server";
import {
  GraduationWatcher,
  DEFAULT_GRADUATION_FILTER,
} from "@/lib/clawcord/dexscreener-provider";
import type { GraduationFilter } from "@/lib/clawcord/types";

const watcher = new GraduationWatcher();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Build filter from query params
  const filter: GraduationFilter = {
    minLiquidity: Number(searchParams.get("minLiq")) || DEFAULT_GRADUATION_FILTER.minLiquidity,
    minVolume5m: Number(searchParams.get("minVol")) || DEFAULT_GRADUATION_FILTER.minVolume5m,
    minHolders: Number(searchParams.get("minHolders")) || DEFAULT_GRADUATION_FILTER.minHolders,
    maxAgeMinutes: Number(searchParams.get("maxAge")) || DEFAULT_GRADUATION_FILTER.maxAgeMinutes,
    excludeRuggedDeployers: searchParams.get("excludeRugs") !== "false",
  };

  try {
    const candidates = await watcher.scanForGraduations(filter);

    // Return only passing candidates by default
    const passingOnly = searchParams.get("all") !== "true";
    const results = passingOnly
      ? candidates.filter((c) => c.passesFilter)
      : candidates;

    return NextResponse.json({
      success: true,
      count: results.length,
      filter,
      candidates: results.map((c) => ({
        mint: c.graduation.mint,
        symbol: c.graduation.symbol,
        name: c.graduation.name,
        score: c.score.toFixed(1),
        passesFilter: c.passesFilter,
        filterFailures: c.filterFailures,
        graduatedAt: c.graduation.graduatedAt,
        liquidity: c.pair.liquidity?.usd,
        volume5m: c.pair.volume?.m5,
        volume1h: c.pair.volume?.h1,
        priceUsd: c.pair.priceUsd,
        priceChange5m: c.pair.priceChange?.m5,
        priceChange1h: c.pair.priceChange?.h1,
        marketCap: c.pair.marketCap,
        buys5m: c.pair.txns?.m5?.buys,
        sells5m: c.pair.txns?.m5?.sells,
        dexScreenerUrl: c.pair.url,
        imageUrl: c.graduation.imageUrl,
      })),
    });
  } catch (error) {
    console.error("Graduation scan error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to scan graduations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Clear seen mints to rescan everything
  watcher.clearSeenMints();
  return NextResponse.json({ success: true, message: "Cache cleared" });
}

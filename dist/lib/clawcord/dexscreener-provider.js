"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONSERVATIVE_GRADUATION_FILTER = exports.AGGRESSIVE_GRADUATION_FILTER = exports.DEFAULT_GRADUATION_FILTER = exports.GraduationWatcher = exports.DexScreenerProvider = void 0;
const data_providers_1 = require("./data-providers");
const DEXSCREENER_API = process.env.DEXSCREENER_BASE_URL || "https://api.dexscreener.com";
const PUMPFUN_PROGRAM_ID = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
const RAYDIUM_V4 = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";
class DexScreenerProvider {
    cache = new Map();
    cacheTTL = 30_000; // 30 seconds
    async getLatestPumpFunGraduations(limit = 50) {
        const cacheKey = `pumpfun-graduations-${limit}`;
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            return cached.data;
        }
        try {
            // DexScreener's token profiles endpoint for new Solana pairs
            // Filter for Raydium pairs (where PumpFun tokens graduate to)
            const response = await fetch(`${DEXSCREENER_API}/latest/dex/pairs/solana?limit=${limit}`, {
                headers: {
                    "Accept": "application/json",
                    "User-Agent": "ClawCord/1.0",
                },
            });
            if (!response.ok) {
                throw new Error(`DexScreener API error: ${response.status}`);
            }
            const data = await response.json();
            const pairs = data.pairs || [];
            // Filter for Raydium pairs (PumpFun graduates here)
            const raydiumPairs = pairs.filter((pair) => pair.dexId === "raydium");
            this.cache.set(cacheKey, { data: raydiumPairs, timestamp: Date.now() });
            return raydiumPairs;
        }
        catch (error) {
            console.error("Failed to fetch DexScreener pairs:", error);
            return [];
        }
    }
    async getPairByMint(mint) {
        try {
            const response = await fetch(`${DEXSCREENER_API}/latest/dex/tokens/${mint}`, {
                headers: {
                    "Accept": "application/json",
                    "User-Agent": "ClawCord/1.0",
                },
            });
            if (!response.ok) {
                return null;
            }
            const data = await response.json();
            const pairs = data.pairs || [];
            // Return the most liquid Raydium pair
            const raydiumPairs = pairs
                .filter((p) => p.dexId === "raydium" && p.chainId === "solana")
                .sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
            return raydiumPairs[0] || null;
        }
        catch (error) {
            console.error(`Failed to fetch pair for ${mint}:`, error);
            return null;
        }
    }
    async searchTokens(query) {
        try {
            const response = await fetch(`${DEXSCREENER_API}/latest/dex/search?q=${encodeURIComponent(query)}`, {
                headers: {
                    "Accept": "application/json",
                    "User-Agent": "ClawCord/1.0",
                },
            });
            if (!response.ok) {
                return [];
            }
            const data = await response.json();
            const pairs = data.pairs || [];
            return pairs.filter((p) => p.chainId === "solana" && p.dexId === "raydium");
        }
        catch (error) {
            console.error(`Failed to search tokens:`, error);
            return [];
        }
    }
    pairToMetrics(pair) {
        const ageMs = Date.now() - pair.pairCreatedAt;
        const ageHours = ageMs / (1000 * 60 * 60);
        return {
            mint: pair.baseToken.address,
            symbol: pair.baseToken.symbol,
            name: pair.baseToken.name,
            price: parseFloat(pair.priceUsd) || 0,
            priceChange24h: pair.priceChange?.h24 || 0,
            volume24h: pair.volume?.h24 || 0,
            volumeChange: pair.volume?.h1
                ? ((pair.volume.h1 * 24) / (pair.volume.h24 || 1) - 1) * 100
                : 0,
            liquidity: pair.liquidity?.usd || 0,
            liquidityChange: 0, // Would need historical data
            holders: 0, // DexScreener doesn't provide this, need Helius
            holdersChange: 0,
            topHolderConcentration: 0, // Need on-chain data
            tokenAgeHours: ageHours,
            mintAuthority: false, // Need on-chain verification
            freezeAuthority: false,
            lpLocked: false, // Need to check LP token burns
            lpAge: ageHours,
            deployerAddress: "", // Need to trace deployer
            deployerPriorTokens: 0,
            deployerRugCount: 0,
        };
    }
}
exports.DexScreenerProvider = DexScreenerProvider;
class GraduationWatcher {
    dexProvider;
    seenMints = new Set();
    subscribers = new Map();
    constructor() {
        this.dexProvider = new DexScreenerProvider();
    }
    async scanForGraduations(filter) {
        const pairs = await this.dexProvider.getLatestPumpFunGraduations(100);
        const candidates = [];
        const helius = (0, data_providers_1.getHeliusProvider)();
        for (const pair of pairs) {
            // Skip if we've already seen this token
            if (this.seenMints.has(pair.baseToken.address)) {
                continue;
            }
            const metrics = this.dexProvider.pairToMetrics(pair);
            // Enrich metrics with Helius holder data
            try {
                const [holderCount, topHolderConcentration] = await Promise.all([
                    helius.getTokenHolderCount(pair.baseToken.address),
                    helius.getTopHolderConcentration(pair.baseToken.address, 10),
                ]);
                metrics.holders = holderCount;
                metrics.topHolderConcentration = topHolderConcentration;
            }
            catch (error) {
                // Continue with default values if Helius fails
                console.warn(`Failed to fetch Helius data for ${pair.baseToken.symbol}:`, error);
            }
            const { passes, failures } = this.applyFilter(pair, metrics, filter);
            // Create graduation info
            const graduation = {
                mint: pair.baseToken.address,
                symbol: pair.baseToken.symbol,
                name: pair.baseToken.name,
                graduatedAt: new Date(pair.pairCreatedAt),
                bondingCurveAddress: "", // Would need PumpFun API
                raydiumPairAddress: pair.pairAddress,
                initialLiquidity: pair.liquidity?.usd || 0,
                initialMarketCap: pair.marketCap || 0,
                creatorAddress: "", // Would need on-chain trace
                imageUrl: pair.info?.imageUrl,
            };
            // Calculate a simple score based on metrics
            const score = this.calculateScore(pair, metrics);
            candidates.push({
                graduation,
                pair,
                metrics,
                score,
                passesFilter: passes,
                filterFailures: failures,
            });
            // Mark as seen
            this.seenMints.add(pair.baseToken.address);
        }
        // Sort by score descending
        return candidates.sort((a, b) => b.score - a.score);
    }
    applyFilter(pair, metrics, filter) {
        const failures = [];
        // Check liquidity
        if ((pair.liquidity?.usd || 0) < filter.minLiquidity) {
            failures.push(`Liquidity $${pair.liquidity?.usd?.toFixed(0) || 0} < $${filter.minLiquidity}`);
        }
        // Check 5m volume
        if ((pair.volume?.m5 || 0) < filter.minVolume5m) {
            failures.push(`5m volume $${pair.volume?.m5?.toFixed(0) || 0} < $${filter.minVolume5m}`);
        }
        // Check age
        const ageMinutes = (Date.now() - pair.pairCreatedAt) / (1000 * 60);
        if (ageMinutes > filter.maxAgeMinutes) {
            failures.push(`Age ${ageMinutes.toFixed(0)}m > ${filter.maxAgeMinutes}m`);
        }
        // Check holder count (now available via Helius)
        if (metrics.holders > 0 && metrics.holders < filter.minHolders) {
            failures.push(`Holders ${metrics.holders} < ${filter.minHolders}`);
        }
        // Check top holder concentration (whale risk)
        if (metrics.topHolderConcentration > 50) {
            failures.push(`Top 10 holders own ${metrics.topHolderConcentration.toFixed(1)}% (high concentration)`);
        }
        return {
            passes: failures.length === 0,
            failures,
        };
    }
    calculateScore(pair, metrics) {
        let score = 5; // Base score
        // Volume momentum (5m vs 1h average)
        const vol5m = pair.volume?.m5 || 0;
        const vol1hAvg = (pair.volume?.h1 || 0) / 12;
        if (vol5m > vol1hAvg * 2)
            score += 1.5;
        else if (vol5m > vol1hAvg * 1.5)
            score += 1;
        else if (vol5m < vol1hAvg * 0.5)
            score -= 1;
        // Liquidity health
        const liq = pair.liquidity?.usd || 0;
        if (liq > 50000)
            score += 1;
        else if (liq > 20000)
            score += 0.5;
        else if (liq < 5000)
            score -= 1;
        // Buy/sell ratio
        const buys = pair.txns?.m5?.buys || 0;
        const sells = pair.txns?.m5?.sells || 0;
        const ratio = sells > 0 ? buys / sells : buys > 0 ? 2 : 1;
        if (ratio > 2)
            score += 1;
        else if (ratio > 1.5)
            score += 0.5;
        else if (ratio < 0.5)
            score -= 1.5;
        // Price momentum
        const priceChange5m = pair.priceChange?.m5 || 0;
        if (priceChange5m > 20)
            score += 1;
        else if (priceChange5m > 10)
            score += 0.5;
        else if (priceChange5m < -20)
            score -= 1;
        // Market cap sanity
        const mcap = pair.marketCap || 0;
        if (mcap > 100000 && mcap < 5000000)
            score += 0.5;
        else if (mcap > 10000000)
            score -= 0.5;
        // Holder distribution (from Helius)
        const holders = metrics.holders;
        if (holders > 200)
            score += 1;
        else if (holders > 100)
            score += 0.5;
        else if (holders < 30 && holders > 0)
            score -= 0.5;
        // Top holder concentration (lower is better)
        const concentration = metrics.topHolderConcentration;
        if (concentration > 0) {
            if (concentration < 20)
                score += 1;
            else if (concentration < 35)
                score += 0.5;
            else if (concentration > 60)
                score -= 1;
            else if (concentration > 45)
                score -= 0.5;
        }
        return Math.max(0, Math.min(10, score));
    }
    subscribe(id, callback) {
        this.subscribers.set(id, callback);
    }
    unsubscribe(id) {
        this.subscribers.delete(id);
    }
    clearSeenMints() {
        this.seenMints.clear();
    }
}
exports.GraduationWatcher = GraduationWatcher;
// Optimized defaults based on PumpFun graduation research:
// - Tokens graduate at ~$75k mcap with ~$12-15k initial liquidity
// - Best entry window is 15-45 minutes post-graduation
// - Only ~1-2% of tokens graduate, so these are already filtered
exports.DEFAULT_GRADUATION_FILTER = {
    minLiquidity: 12000, // Post-graduation baseline from bonding curve
    minVolume5m: 1000, // Active trading, not dead on arrival
    minHolders: 75, // Healthy distribution, avoid dev-heavy tokens
    maxAgeMinutes: 45, // Catch early but after initial dump settles
    excludeRuggedDeployers: true,
};
// Aggressive preset for early snipers (higher risk, higher reward)
exports.AGGRESSIVE_GRADUATION_FILTER = {
    minLiquidity: 8000,
    minVolume5m: 500,
    minHolders: 40,
    maxAgeMinutes: 20, // Very early entry
    excludeRuggedDeployers: true,
};
// Conservative preset for safer plays
exports.CONSERVATIVE_GRADUATION_FILTER = {
    minLiquidity: 20000, // Well-established liquidity
    minVolume5m: 2000, // Strong trading activity
    minHolders: 150, // Wide distribution
    maxAgeMinutes: 120, // More time to prove itself
    excludeRuggedDeployers: true,
};
//# sourceMappingURL=dexscreener-provider.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreToken = scoreToken;
exports.generateRiskFlags = generateRiskFlags;
exports.generateInvalidationConditions = generateInvalidationConditions;
// Signal weights by type
const signalWeights = {
    "volume-spike": 1.5,
    "liquidity-change": 1.2,
    "holder-growth": 1.3,
    "whale-accumulation": 1.4,
    "deployer-activity": 1.6,
    "social-velocity": 1.0,
    "price-momentum": 1.2,
    "drawdown-reclaim": 1.4,
    "lp-stability": 1.3,
    "distribution-pattern": 1.5,
};
function scoreToken(metrics, policy) {
    const signals = [];
    const failedThresholds = [];
    // Check basic thresholds
    if (metrics.liquidity < policy.thresholds.minLiquidity) {
        failedThresholds.push(`Liquidity $${metrics.liquidity.toFixed(0)} < min $${policy.thresholds.minLiquidity}`);
    }
    if (metrics.volume24h < policy.thresholds.minVolume24h) {
        failedThresholds.push(`Volume $${metrics.volume24h.toFixed(0)} < min $${policy.thresholds.minVolume24h}`);
    }
    if (metrics.tokenAgeHours > policy.thresholds.maxTokenAge) {
        failedThresholds.push(`Token age ${metrics.tokenAgeHours.toFixed(1)}h > max ${policy.thresholds.maxTokenAge}h`);
    }
    if (metrics.holders < policy.thresholds.minHolders) {
        failedThresholds.push(`Holders ${metrics.holders} < min ${policy.thresholds.minHolders}`);
    }
    if (metrics.topHolderConcentration > policy.thresholds.maxTopHolderConcentration) {
        failedThresholds.push(`Top holder concentration ${metrics.topHolderConcentration.toFixed(1)}% > max ${policy.thresholds.maxTopHolderConcentration}%`);
    }
    // Score each enabled signal
    for (const signal of policy.enabledSignals) {
        const result = scoreSignal(signal, metrics);
        signals.push({
            signal,
            score: result.score,
            weight: signalWeights[signal],
            triggered: result.triggered,
            reason: result.reason,
        });
    }
    // Calculate overall score (weighted average of triggered signals)
    const triggeredSignals = signals.filter((s) => s.triggered);
    let overallScore = 0;
    if (triggeredSignals.length > 0) {
        const totalWeight = triggeredSignals.reduce((sum, s) => sum + s.weight, 0);
        overallScore =
            triggeredSignals.reduce((sum, s) => sum + s.score * s.weight, 0) / totalWeight;
    }
    // Apply penalties
    if (metrics.mintAuthority)
        overallScore *= 0.7;
    if (metrics.freezeAuthority)
        overallScore *= 0.6;
    if (metrics.deployerRugCount > 0)
        overallScore *= Math.max(0.5, 1 - metrics.deployerRugCount * 0.15);
    return {
        overallScore: Math.min(10, Math.max(0, overallScore)),
        signals,
        passesThresholds: failedThresholds.length === 0,
        failedThresholds,
    };
}
function scoreSignal(signal, metrics) {
    switch (signal) {
        case "volume-spike":
            return scoreVolumeSpike(metrics);
        case "liquidity-change":
            return scoreLiquidityChange(metrics);
        case "holder-growth":
            return scoreHolderGrowth(metrics);
        case "whale-accumulation":
            return scoreWhaleAccumulation(metrics);
        case "deployer-activity":
            return scoreDeployerActivity(metrics);
        case "price-momentum":
            return scorePriceMomentum(metrics);
        case "drawdown-reclaim":
            return scoreDrawdownReclaim(metrics);
        case "lp-stability":
            return scoreLpStability(metrics);
        case "distribution-pattern":
            return scoreDistributionPattern(metrics);
        case "social-velocity":
            return { score: 5, triggered: false, reason: "Social data not available" };
        default:
            return { score: 0, triggered: false, reason: "Unknown signal" };
    }
}
function scoreVolumeSpike(metrics) {
    const triggered = metrics.volumeChange > 50;
    const score = Math.min(10, metrics.volumeChange / 20);
    return {
        score,
        triggered,
        reason: triggered
            ? `Volume +${metrics.volumeChange.toFixed(0)}% spike detected`
            : `Volume change ${metrics.volumeChange.toFixed(0)}% below threshold`,
    };
}
function scoreLiquidityChange(metrics) {
    const triggered = metrics.liquidityChange > 10;
    const score = Math.min(10, 5 + metrics.liquidityChange / 5);
    return {
        score,
        triggered,
        reason: triggered
            ? `Liquidity +${metrics.liquidityChange.toFixed(1)}% increase`
            : `Liquidity stable at ${metrics.liquidityChange.toFixed(1)}%`,
    };
}
function scoreHolderGrowth(metrics) {
    const triggered = metrics.holdersChange > 5;
    const score = Math.min(10, metrics.holdersChange);
    return {
        score,
        triggered,
        reason: triggered
            ? `Holders +${metrics.holdersChange.toFixed(1)}% growth`
            : `Holder growth ${metrics.holdersChange.toFixed(1)}% below threshold`,
    };
}
function scoreWhaleAccumulation(metrics) {
    // Lower concentration change could indicate whale accumulation without domination
    const triggered = metrics.topHolderConcentration < 25 && metrics.holdersChange > 3;
    const score = triggered ? 7 : 4;
    return {
        score,
        triggered,
        reason: triggered
            ? `Healthy accumulation pattern detected`
            : `No clear whale accumulation signal`,
    };
}
function scoreDeployerActivity(metrics) {
    const hasGoodHistory = metrics.deployerRugCount === 0 && metrics.deployerPriorTokens > 0;
    const triggered = hasGoodHistory;
    const score = hasGoodHistory ? 8 : metrics.deployerRugCount > 0 ? 2 : 5;
    return {
        score,
        triggered,
        reason: hasGoodHistory
            ? `Deployer has clean history (${metrics.deployerPriorTokens} prior tokens, 0 rugs)`
            : metrics.deployerRugCount > 0
                ? `WARNING: Deployer has ${metrics.deployerRugCount} prior rugs`
                : `New deployer - no history`,
    };
}
function scorePriceMomentum(metrics) {
    const triggered = metrics.priceChange24h > 20;
    const score = Math.min(10, Math.max(0, 5 + metrics.priceChange24h / 20));
    return {
        score,
        triggered,
        reason: triggered
            ? `Strong momentum +${metrics.priceChange24h.toFixed(1)}%`
            : `Price change ${metrics.priceChange24h.toFixed(1)}%`,
    };
}
function scoreDrawdownReclaim(metrics) {
    // Would need historical data for proper implementation
    const triggered = metrics.priceChange24h > 10 && metrics.priceChange24h < 50;
    return {
        score: triggered ? 7 : 4,
        triggered,
        reason: triggered
            ? `Potential reclaim pattern detected`
            : `No clear drawdown reclaim`,
    };
}
function scoreLpStability(metrics) {
    const isStable = metrics.lpLocked || metrics.lpAge > 6;
    const triggered = isStable && Math.abs(metrics.liquidityChange) < 15;
    const score = triggered ? 8 : isStable ? 6 : 3;
    return {
        score,
        triggered,
        reason: triggered
            ? `LP stable${metrics.lpLocked ? " (locked)" : ""}, age ${metrics.lpAge.toFixed(1)}h`
            : metrics.lpLocked
                ? `LP locked but volatile`
                : `LP not locked, age ${metrics.lpAge.toFixed(1)}h`,
    };
}
function scoreDistributionPattern(metrics) {
    const healthyDistribution = metrics.topHolderConcentration < 20;
    const triggered = healthyDistribution && metrics.holders > 100;
    const score = healthyDistribution ? 8 : 4;
    return {
        score,
        triggered,
        reason: triggered
            ? `Healthy distribution (top holder ${metrics.topHolderConcentration.toFixed(1)}%)`
            : `Concentrated distribution (${metrics.topHolderConcentration.toFixed(1)}%)`,
    };
}
function generateRiskFlags(metrics) {
    const flags = [];
    if (metrics.mintAuthority) {
        flags.push({
            type: "high",
            message: "Mint authority enabled - supply can be inflated",
            signal: "general",
        });
    }
    if (metrics.freezeAuthority) {
        flags.push({
            type: "high",
            message: "Freeze authority enabled - tokens can be frozen",
            signal: "general",
        });
    }
    if (metrics.deployerRugCount > 0) {
        flags.push({
            type: "high",
            message: `Deployer has ${metrics.deployerRugCount} prior rug(s)`,
            signal: "deployer-activity",
        });
    }
    if (metrics.topHolderConcentration > 30) {
        flags.push({
            type: "high",
            message: `Top holder concentration very high (${metrics.topHolderConcentration.toFixed(1)}%)`,
            signal: "distribution-pattern",
        });
    }
    else if (metrics.topHolderConcentration > 20) {
        flags.push({
            type: "medium",
            message: `Top holder concentration elevated (${metrics.topHolderConcentration.toFixed(1)}%)`,
            signal: "distribution-pattern",
        });
    }
    if (!metrics.lpLocked && metrics.lpAge < 6) {
        flags.push({
            type: "medium",
            message: `LP not locked and young (${metrics.lpAge.toFixed(1)}h)`,
            signal: "lp-stability",
        });
    }
    if (metrics.tokenAgeHours < 1) {
        flags.push({
            type: "medium",
            message: `Very new token (${(metrics.tokenAgeHours * 60).toFixed(0)} minutes old)`,
            signal: "general",
        });
    }
    if (metrics.holders < 100) {
        flags.push({
            type: "low",
            message: `Low holder count (${metrics.holders})`,
            signal: "holder-growth",
        });
    }
    if (metrics.deployerPriorTokens === 0) {
        flags.push({
            type: "low",
            message: "First-time deployer - no track record",
            signal: "deployer-activity",
        });
    }
    return flags;
}
function generateInvalidationConditions(metrics, policy) {
    const conditions = [];
    // Price-based invalidations
    conditions.push(`Price drops >30% from current level ($${metrics.price.toFixed(8)})`);
    // Volume-based
    conditions.push(`24h volume drops below $${(policy.thresholds.minVolume24h * 0.5).toFixed(0)}`);
    // Liquidity-based
    conditions.push(`Liquidity drops below $${(metrics.liquidity * 0.7).toFixed(0)}`);
    // Holder-based
    conditions.push(`Holder count decreases by >10%`);
    // LP-based
    if (!metrics.lpLocked) {
        conditions.push("LP is removed or significantly reduced");
    }
    return conditions;
}
//# sourceMappingURL=scoring.js.map
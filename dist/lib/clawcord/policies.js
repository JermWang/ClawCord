"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPolicy = createPolicy;
exports.getPolicyPresets = getPolicyPresets;
exports.getDefaultPolicy = getDefaultPolicy;
exports.validateThresholds = validateThresholds;
exports.hashPolicy = hashPolicy;
// Default thresholds for each policy preset
const policyConfigs = {
    "fresh-scanner": {
        name: "Fresh Scanner",
        description: "Ultra-new launches (0-2h), strict rug filters, conservative post rate",
        thresholds: {
            minLiquidity: 5000,
            minVolume24h: 1000,
            maxTokenAge: 2,
            minHolders: 50,
            maxTopHolderConcentration: 30,
            minConfidenceScore: 6,
        },
        enabledSignals: [
            "volume-spike",
            "holder-growth",
            "deployer-activity",
            "distribution-pattern",
            "lp-stability",
        ],
        autopostCadence: 30,
        maxCallsPerDay: 10,
    },
    momentum: {
        name: "Momentum",
        description: "Volume acceleration + social velocity + chart structure (2h-48h tokens)",
        thresholds: {
            minLiquidity: 10000,
            minVolume24h: 5000,
            maxTokenAge: 48,
            minHolders: 100,
            maxTopHolderConcentration: 25,
            minConfidenceScore: 5,
        },
        enabledSignals: [
            "volume-spike",
            "price-momentum",
            "holder-growth",
            "social-velocity",
            "liquidity-change",
        ],
        autopostCadence: 15,
        maxCallsPerDay: 20,
    },
    "dip-hunter": {
        name: "Dip Hunter",
        description: "Drawdown + reclaim conditions + liquidity stability",
        thresholds: {
            minLiquidity: 15000,
            minVolume24h: 3000,
            maxTokenAge: 168,
            minHolders: 200,
            maxTopHolderConcentration: 20,
            minConfidenceScore: 6,
        },
        enabledSignals: [
            "drawdown-reclaim",
            "lp-stability",
            "holder-growth",
            "volume-spike",
            "price-momentum",
        ],
        autopostCadence: 60,
        maxCallsPerDay: 8,
    },
    "whale-follow": {
        name: "Whale Follow",
        description: "Wallet-cluster watchlist + accumulation patterns",
        thresholds: {
            minLiquidity: 20000,
            minVolume24h: 10000,
            maxTokenAge: 720,
            minHolders: 300,
            maxTopHolderConcentration: 35,
            minConfidenceScore: 5,
        },
        enabledSignals: [
            "whale-accumulation",
            "volume-spike",
            "holder-growth",
            "liquidity-change",
        ],
        autopostCadence: 30,
        maxCallsPerDay: 15,
    },
    "deployer-reputation": {
        name: "Deployer Reputation",
        description: "Deployer history + prior rugs/abandoned charts flags",
        thresholds: {
            minLiquidity: 8000,
            minVolume24h: 2000,
            maxTokenAge: 24,
            minHolders: 75,
            maxTopHolderConcentration: 25,
            minConfidenceScore: 7,
        },
        enabledSignals: [
            "deployer-activity",
            "distribution-pattern",
            "lp-stability",
            "holder-growth",
        ],
        autopostCadence: 45,
        maxCallsPerDay: 12,
    },
    "community-strength": {
        name: "Community Strength",
        description: "Holder growth, retention, distribution, chatter quality",
        thresholds: {
            minLiquidity: 12000,
            minVolume24h: 4000,
            maxTokenAge: 336,
            minHolders: 500,
            maxTopHolderConcentration: 15,
            minConfidenceScore: 6,
        },
        enabledSignals: [
            "holder-growth",
            "social-velocity",
            "distribution-pattern",
            "volume-spike",
            "lp-stability",
        ],
        autopostCadence: 120,
        maxCallsPerDay: 5,
    },
};
function createPolicy(guildId, preset, overrides) {
    const config = policyConfigs[preset];
    return {
        id: `${guildId}-${preset}-${Date.now()}`,
        name: config.name,
        preset,
        description: config.description,
        thresholds: {
            ...config.thresholds,
            ...overrides,
        },
        enabledSignals: config.enabledSignals,
        autopostEnabled: false,
        autopostCadence: config.autopostCadence,
        maxCallsPerDay: config.maxCallsPerDay,
    };
}
function getPolicyPresets() {
    return Object.entries(policyConfigs).map(([preset, config]) => ({
        preset: preset,
        name: config.name,
        description: config.description,
    }));
}
function getDefaultPolicy(guildId) {
    return createPolicy(guildId, "momentum");
}
function validateThresholds(thresholds) {
    const errors = [];
    if (thresholds.minLiquidity !== undefined && thresholds.minLiquidity < 0) {
        errors.push("Minimum liquidity must be positive");
    }
    if (thresholds.minVolume24h !== undefined && thresholds.minVolume24h < 0) {
        errors.push("Minimum volume must be positive");
    }
    if (thresholds.maxTokenAge !== undefined && thresholds.maxTokenAge < 0) {
        errors.push("Max token age must be positive");
    }
    if (thresholds.minHolders !== undefined && thresholds.minHolders < 1) {
        errors.push("Minimum holders must be at least 1");
    }
    if (thresholds.maxTopHolderConcentration !== undefined &&
        (thresholds.maxTopHolderConcentration < 0 || thresholds.maxTopHolderConcentration > 100)) {
        errors.push("Top holder concentration must be between 0-100%");
    }
    if (thresholds.minConfidenceScore !== undefined &&
        (thresholds.minConfidenceScore < 0 || thresholds.minConfidenceScore > 10)) {
        errors.push("Confidence score must be between 0-10");
    }
    return errors;
}
function hashPolicy(policy) {
    const data = JSON.stringify({
        preset: policy.preset,
        thresholds: policy.thresholds,
        enabledSignals: policy.enabledSignals,
    });
    // Simple hash for demo - in production use crypto
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, "0");
}
//# sourceMappingURL=policies.js.map
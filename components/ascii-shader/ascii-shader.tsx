"use client";

import { useEffect, useRef, useCallback } from "react";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type ShaderMode =
  | "waves"
  | "spiral"
  | "metaballs"
  | "plasma"
  | "tunnel"
  | "moire"
  | "pulse"
  | "grid";

export interface AsciiShaderConfig {
  mode?: ShaderMode;
  color?: string;
  bgColor?: string;
  density?: number; // 1-3, affects cell size
  speed?: number; // 0.1-2
  seed?: number;
  charRamp?: string;
}

interface ShaderState {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  atlas: HTMLCanvasElement;
  atlasCtx: CanvasRenderingContext2D;
  charRamp: string;
  cellWidth: number;
  cellHeight: number;
  cols: number;
  rows: number;
  brightnessBuffer: Float32Array;
  indexBuffer: Uint8Array;
  time: number;
  lastFrameTime: number;
  frameTimeAvg: number;
  baseCellSize: number;
  adaptiveCellSize: number;
  running: boolean;
  mode: ShaderMode;
  speed: number;
  seed: number;
  color: string;
  bgColor: string;
  animationId: number | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CHAR_RAMP = " .:-=+*#%@";
const DEFAULT_CELL_SIZE = 12;
const FRAME_TIME_SAMPLES = 10;
const TARGET_FRAME_TIME = 16.67; // 60fps
const MAX_FRAME_TIME = 22; // Trigger quality reduction
const MIN_CELL_SIZE = 8;
const MAX_CELL_SIZE = 24;

// Precomputed sin/cos tables for performance
const SIN_TABLE_SIZE = 1024;
const SIN_TABLE = new Float32Array(SIN_TABLE_SIZE);
const COS_TABLE = new Float32Array(SIN_TABLE_SIZE);
for (let i = 0; i < SIN_TABLE_SIZE; i++) {
  const angle = (i / SIN_TABLE_SIZE) * Math.PI * 2;
  SIN_TABLE[i] = Math.sin(angle);
  COS_TABLE[i] = Math.cos(angle);
}

// Fast sin/cos using lookup tables
function fastSin(x: number): number {
  const normalized = ((x % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const index = (normalized / (Math.PI * 2)) * SIN_TABLE_SIZE;
  const i0 = Math.floor(index) & (SIN_TABLE_SIZE - 1);
  const i1 = (i0 + 1) & (SIN_TABLE_SIZE - 1);
  const t = index - Math.floor(index);
  return SIN_TABLE[i0] * (1 - t) + SIN_TABLE[i1] * t;
}

function fastCos(x: number): number {
  return fastSin(x + Math.PI * 0.5);
}

// ============================================================================
// SHADER FIELD FUNCTIONS
// ============================================================================

type FieldFunction = (x: number, y: number, t: number, seed: number) => number;

const shaderFields: Record<ShaderMode, FieldFunction> = {
  waves: (x, y, t, seed) => {
    const wave1 = fastSin(x * 3 + t * 2 + seed);
    const wave2 = fastSin(y * 4 - t * 1.5 + seed * 0.7);
    const wave3 = fastSin((x + y) * 2 + t + seed * 1.3);
    return (wave1 + wave2 + wave3) / 3 * 0.5 + 0.5;
  },

  spiral: (x, y, t, seed) => {
    const angle = Math.atan2(y, x);
    const dist = Math.sqrt(x * x + y * y);
    const spiral = fastSin(angle * 3 + dist * 4 - t * 2 + seed);
    return spiral * 0.5 + 0.5;
  },

  metaballs: (x, y, t, seed) => {
    let sum = 0;
    const balls = [
      { cx: fastSin(t * 0.7 + seed), cy: fastCos(t * 0.9 + seed * 0.5), r: 0.4 },
      { cx: fastCos(t * 0.5 + seed * 0.3), cy: fastSin(t * 0.8 + seed * 0.7), r: 0.35 },
      { cx: fastSin(t * 0.6 + seed * 0.9), cy: fastCos(t * 1.1 + seed * 0.2), r: 0.3 },
    ];
    for (const ball of balls) {
      const dx = x - ball.cx;
      const dy = y - ball.cy;
      const distSq = dx * dx + dy * dy;
      sum += (ball.r * ball.r) / (distSq + 0.01);
    }
    return Math.min(sum * 0.3, 1);
  },

  plasma: (x, y, t, seed) => {
    const v1 = fastSin(x * 5 + t + seed);
    const v2 = fastSin(5 * (x * fastSin(t * 0.5) + y * fastCos(t * 0.3)) + t + seed * 0.5);
    const cx = x + 0.5 * fastSin(t * 0.3);
    const cy = y + 0.5 * fastCos(t * 0.5);
    const v3 = fastSin(Math.sqrt(cx * cx + cy * cy + 1) * 4 + t);
    return (v1 + v2 + v3) / 3 * 0.5 + 0.5;
  },

  tunnel: (x, y, t, seed) => {
    const angle = Math.atan2(y, x);
    const dist = Math.sqrt(x * x + y * y) + 0.001;
    const tunnel = fastSin(1 / dist * 2 + angle * 2 - t * 2 + seed);
    const fade = Math.min(1, dist * 2);
    return tunnel * fade * 0.5 + 0.5;
  },

  moire: (x, y, t, seed) => {
    const pattern1 = fastSin(x * 15 + t * 0.5 + seed);
    const pattern2 = fastSin(y * 15 - t * 0.7 + seed * 0.6);
    const rotX = x * fastCos(t * 0.2) - y * fastSin(t * 0.2);
    const rotY = x * fastSin(t * 0.2) + y * fastCos(t * 0.2);
    const pattern3 = fastSin((rotX + rotY) * 10 + seed * 0.3);
    return (pattern1 * pattern2 + pattern3) * 0.25 + 0.5;
  },

  pulse: (x, y, t, seed) => {
    const dist = Math.sqrt(x * x + y * y);
    const pulse1 = fastSin(dist * 8 - t * 4 + seed);
    const pulse2 = fastSin(dist * 6 - t * 3 + seed * 0.5);
    const bar = Math.abs(y) < 0.1 ? fastSin(x * 10 + t * 5) * 0.3 : 0;
    return (pulse1 + pulse2) * 0.25 + 0.5 + bar;
  },

  grid: (x, y, t, seed) => {
    const rotSpeed = t * 0.3;
    const rx = x * fastCos(rotSpeed) - y * fastSin(rotSpeed);
    const ry = x * fastSin(rotSpeed) + y * fastCos(rotSpeed);
    const gridX = fastSin(rx * 8 + t + seed);
    const gridY = fastSin(ry * 8 - t * 0.7 + seed * 0.5);
    const combined = gridX * gridY;
    const pulse = fastSin(t * 2) * 0.2;
    return combined * 0.5 + 0.5 + pulse * (1 - Math.sqrt(x * x + y * y));
  },
};

// ============================================================================
// GLYPH ATLAS CREATION
// ============================================================================

function createGlyphAtlas(
  charRamp: string,
  cellWidth: number,
  cellHeight: number,
  color: string
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = cellWidth * charRamp.length;
  canvas.height = cellHeight;
  const ctx = canvas.getContext("2d", { alpha: true })!;

  ctx.fillStyle = "transparent";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = color;
  ctx.font = `${cellHeight - 2}px monospace`;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  for (let i = 0; i < charRamp.length; i++) {
    ctx.fillText(charRamp[i], i * cellWidth + 1, 1);
  }

  return { canvas, ctx };
}

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

function createState(
  canvas: HTMLCanvasElement,
  config: AsciiShaderConfig
): ShaderState {
  const ctx = canvas.getContext("2d", { alpha: false })!;
  const charRamp = config.charRamp || DEFAULT_CHAR_RAMP;
  const density = config.density || 1.5;
  const baseCellSize = Math.round(DEFAULT_CELL_SIZE / density);
  const cellSize = Math.max(MIN_CELL_SIZE, Math.min(MAX_CELL_SIZE, baseCellSize));

  const cols = Math.ceil(canvas.width / cellSize);
  const rows = Math.ceil(canvas.height / cellSize);
  const cellWidth = canvas.width / cols;
  const cellHeight = canvas.height / rows;

  const { canvas: atlasCanvas, ctx: atlasCtx } = createGlyphAtlas(
    charRamp,
    Math.ceil(cellWidth),
    Math.ceil(cellHeight),
    config.color || "#ff6b6b"
  );

  const bufferSize = cols * rows;

  return {
    canvas,
    ctx,
    atlas: atlasCanvas,
    atlasCtx,
    charRamp,
    cellWidth,
    cellHeight,
    cols,
    rows,
    brightnessBuffer: new Float32Array(bufferSize),
    indexBuffer: new Uint8Array(bufferSize),
    time: 0,
    lastFrameTime: performance.now(),
    frameTimeAvg: TARGET_FRAME_TIME,
    baseCellSize,
    adaptiveCellSize: cellSize,
    running: true,
    mode: config.mode || "waves",
    speed: config.speed || 1,
    seed: config.seed || Math.random() * 100,
    color: config.color || "#ff6b6b",
    bgColor: config.bgColor || "#fef2f2",
    animationId: null,
  };
}

function resizeState(state: ShaderState): void {
  const { canvas, adaptiveCellSize, charRamp, color } = state;

  state.cols = Math.ceil(canvas.width / adaptiveCellSize);
  state.rows = Math.ceil(canvas.height / adaptiveCellSize);
  state.cellWidth = canvas.width / state.cols;
  state.cellHeight = canvas.height / state.rows;

  const bufferSize = state.cols * state.rows;
  if (state.brightnessBuffer.length < bufferSize) {
    state.brightnessBuffer = new Float32Array(bufferSize);
    state.indexBuffer = new Uint8Array(bufferSize);
  }

  const { canvas: atlasCanvas, ctx: atlasCtx } = createGlyphAtlas(
    charRamp,
    Math.ceil(state.cellWidth),
    Math.ceil(state.cellHeight),
    color
  );
  state.atlas = atlasCanvas;
  state.atlasCtx = atlasCtx;
}

// ============================================================================
// ADAPTIVE QUALITY
// ============================================================================

function updateAdaptiveQuality(state: ShaderState, frameTime: number): void {
  state.frameTimeAvg =
    state.frameTimeAvg * (1 - 1 / FRAME_TIME_SAMPLES) +
    frameTime * (1 / FRAME_TIME_SAMPLES);

  if (state.frameTimeAvg > MAX_FRAME_TIME && state.adaptiveCellSize < MAX_CELL_SIZE) {
    state.adaptiveCellSize = Math.min(MAX_CELL_SIZE, state.adaptiveCellSize + 1);
    resizeState(state);
  } else if (
    state.frameTimeAvg < TARGET_FRAME_TIME * 0.8 &&
    state.adaptiveCellSize > state.baseCellSize
  ) {
    state.adaptiveCellSize = Math.max(state.baseCellSize, state.adaptiveCellSize - 0.5);
    resizeState(state);
  }
}

// ============================================================================
// RENDER LOOP
// ============================================================================

function render(state: ShaderState): void {
  const now = performance.now();
  const dt = (now - state.lastFrameTime) / 1000;
  state.lastFrameTime = now;
  state.time += dt * state.speed;

  updateAdaptiveQuality(state, dt * 1000);

  const { ctx, canvas, cols, rows, cellWidth, cellHeight, brightnessBuffer, indexBuffer, charRamp, atlas, mode, seed, bgColor } = state;

  // Clear with background color
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const fieldFn = shaderFields[mode];
  const rampLen = charRamp.length;
  const atlasGlyphWidth = Math.ceil(cellWidth);
  const atlasGlyphHeight = Math.ceil(cellHeight);

  // Sample field and compute brightness
  let idx = 0;
  for (let row = 0; row < rows; row++) {
    const ny = (row / rows) * 2 - 1;
    for (let col = 0; col < cols; col++) {
      const nx = (col / cols) * 2 - 1;
      const brightness = fieldFn(nx, ny, state.time, seed);
      brightnessBuffer[idx] = brightness;
      indexBuffer[idx] = Math.floor(Math.max(0, Math.min(1, brightness)) * (rampLen - 1));
      idx++;
    }
  }

  // Draw glyphs from atlas
  idx = 0;
  for (let row = 0; row < rows; row++) {
    const dy = row * cellHeight;
    for (let col = 0; col < cols; col++) {
      const charIdx = indexBuffer[idx];
      if (charIdx > 0) { // Skip spaces (index 0)
        const sx = charIdx * atlasGlyphWidth;
        const dx = col * cellWidth;
        ctx.drawImage(
          atlas,
          sx, 0, atlasGlyphWidth, atlasGlyphHeight,
          dx, dy, cellWidth, cellHeight
        );
      }
      idx++;
    }
  }
}

function animate(state: ShaderState): void {
  if (!state.running) return;

  render(state);
  state.animationId = requestAnimationFrame(() => animate(state));
}

// ============================================================================
// REACT COMPONENT
// ============================================================================

export interface AsciiShaderProps extends AsciiShaderConfig {
  className?: string;
  style?: React.CSSProperties;
}

export function AsciiShader({
  mode = "waves",
  color = "#ff6b6b",
  bgColor = "#fef2f2",
  density = 1.5,
  speed = 1,
  seed,
  charRamp = DEFAULT_CHAR_RAMP,
  className = "",
  style = {},
}: AsciiShaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<ShaderState | null>(null);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !stateRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    resizeState(stateRef.current);
  }, []);

  const handleVisibilityChange = useCallback(() => {
    if (!stateRef.current) return;

    if (document.hidden) {
      stateRef.current.running = false;
      if (stateRef.current.animationId) {
        cancelAnimationFrame(stateRef.current.animationId);
        stateRef.current.animationId = null;
      }
    } else {
      stateRef.current.running = true;
      stateRef.current.lastFrameTime = performance.now();
      animate(stateRef.current);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const state = createState(canvas, {
      mode,
      color,
      bgColor,
      density,
      speed,
      seed: seed ?? Math.random() * 100,
      charRamp,
    });
    stateRef.current = state;

    animate(state);

    window.addEventListener("resize", handleResize);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      state.running = false;
      if (state.animationId) {
        cancelAnimationFrame(state.animationId);
      }
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [mode, color, bgColor, density, speed, seed, charRamp, handleResize, handleVisibilityChange]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        ...style,
      }}
    />
  );
}

export default AsciiShader;

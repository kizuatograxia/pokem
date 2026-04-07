import React, { useEffect, useRef, useState } from "react";
import type { ActivePokemonView } from "./types.js";
import type { AnimMap, SpriteAnim } from "./useBattleAnimations.js";

interface BattleSelectionState {
  player: Partial<Record<number, 1 | 2>>;
  foe: Partial<Record<number, 1 | 2>>;
}

interface Props {
  playerActive: ActivePokemonView[];
  foeActive: ActivePokemonView[];
  sideSize: number;
  selection?: BattleSelectionState;
  indoor?: boolean;
  spriteAnims?: AnimMap;
  keepVisible?: Set<string>;
}

const SCREEN_WIDTH = 512;
const BATTLE_HEIGHT = 288;
const PLAYER_BASE_CENTER = { x: 128, y: 304 };
const FOE_BASE_CENTER = { x: 384, y: 176 };
const SPRITE_SIZE = 96;
const SHADOW_WIDTH = 136;
const SHADOW_HEIGHT = 24;
const SHADOW_SPRITE = "/assets/sprites/pokemon/shadow";

// ─── Spritesheet loader ───────────────────────────────────────────────────────

interface FrameRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AxisRun {
  start: number;
  end: number;
  weight: number;
}

interface SheetInfo {
  source: HTMLCanvasElement;
  frames: FrameRect[];
  maxFrameWidth: number;
  maxFrameHeight: number;
  valid: boolean;
}

const sheetCache = new Map<string, SheetInfo>();

interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

function colorAt(data: Uint8ClampedArray, width: number, x: number, y: number): RgbaColor {
  const index = (y * width + x) * 4;
  return {
    r: data[index] ?? 0,
    g: data[index + 1] ?? 0,
    b: data[index + 2] ?? 0,
    a: data[index + 3] ?? 0,
  };
}

function colorsClose(left: RgbaColor, right: RgbaColor, tolerance: number): boolean {
  return (
    Math.abs(left.r - right.r) <= tolerance &&
    Math.abs(left.g - right.g) <= tolerance &&
    Math.abs(left.b - right.b) <= tolerance &&
    Math.abs(left.a - right.a) <= tolerance
  );
}

function detectBackgroundColor(data: Uint8ClampedArray, width: number, height: number): RgbaColor | null {
  const samples = [
    colorAt(data, width, 0, 0),
    colorAt(data, width, width - 1, 0),
    colorAt(data, width, 0, height - 1),
    colorAt(data, width, width - 1, height - 1),
  ];
  const base = samples[0];
  if (!base || base.a === 0) return null;
  return samples.every((sample) => colorsClose(sample, base, 16)) ? base : null;
}

function stripLeadingGuideColumns(data: Uint8ClampedArray, width: number, height: number): number {
  let trim = 0;
  const maxColumns = Math.min(4, width);

  for (let x = 0; x < maxColumns; x += 1) {
    let opaque = 0;
    let reddish = 0;

    for (let y = 0; y < height; y += 1) {
      const index = (y * width + x) * 4;
      const alpha = data[index + 3] ?? 0;
      if (alpha <= 16) continue;
      opaque += 1;
      if ((data[index] ?? 0) >= 180 && (data[index + 1] ?? 0) <= 96 && (data[index + 2] ?? 0) <= 96) {
        reddish += 1;
      }
    }

    if (opaque / height >= 0.8 && reddish / Math.max(1, opaque) >= 0.55) {
      trim += 1;
      continue;
    }
    break;
  }

  const sparseThreshold = Math.max(1, Math.floor(height * 0.08));
  while (trim < Math.min(width, 6)) {
    let opaque = 0;
    for (let y = 0; y < height; y += 1) {
      const alpha = data[(y * width + trim) * 4 + 3] ?? 0;
      if (alpha > 16) opaque += 1;
    }
    if (opaque > 0 && opaque <= sparseThreshold) {
      trim += 1;
      continue;
    }
    break;
  }

  return trim;
}

function stripTrailingGuideColumns(data: Uint8ClampedArray, width: number, height: number): number {
  let trim = 0;
  const sparseThreshold = Math.max(1, Math.floor(height * 0.08));

  while (trim < Math.min(width, 6)) {
    const x = width - 1 - trim;
    let opaque = 0;
    for (let y = 0; y < height; y += 1) {
      const alpha = data[(y * width + x) * 4 + 3] ?? 0;
      if (alpha > 16) opaque += 1;
    }
    if (opaque > 0 && opaque <= sparseThreshold) {
      trim += 1;
      continue;
    }
    break;
  }

  return trim;
}

function buildOccupancyRuns(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  axis: "x" | "y",
  startOffset = 0,
): AxisRun[] {
  const size = axis === "x" ? width - startOffset : height;
  const orthogonal = axis === "x" ? height : width;
  const threshold = Math.max(1, Math.floor(orthogonal * 0.04));
  const occupancy = Array.from({ length: size }, (_, index) => {
    let count = 0;
    const coordinate = index + startOffset;
    for (let other = 0; other < orthogonal; other += 1) {
      const x = axis === "x" ? coordinate : other;
      const y = axis === "x" ? other : coordinate;
      const alpha = data[(y * width + x) * 4 + 3] ?? 0;
      if (alpha > 16) count += 1;
    }
    return count;
  });

  const runs: AxisRun[] = [];
  let currentStart: number | null = null;
  let currentWeight = 0;

  occupancy.forEach((value, index) => {
    const occupied = value >= threshold;
    if (occupied && currentStart === null) {
      currentStart = index + startOffset;
      currentWeight = value;
      return;
    }
    if (occupied && currentStart !== null) {
      currentWeight += value;
      return;
    }
    if (!occupied && currentStart !== null) {
      runs.push({ start: currentStart, end: index + startOffset - 1, weight: currentWeight });
      currentStart = null;
      currentWeight = 0;
    }
  });

  if (currentStart !== null) {
    runs.push({ start: currentStart, end: startOffset + occupancy.length - 1, weight: currentWeight });
  }

  return runs.filter((run) => run.end - run.start >= 2);
}

function significantRuns(runs: AxisRun[]): AxisRun[] {
  if (runs.length <= 1) return runs;
  const maxWeight = Math.max(...runs.map((run) => run.weight));
  const filtered = runs.filter((run) => run.weight >= maxWeight * 0.12);
  return filtered.length > 0 ? filtered : runs;
}

function dominantRun(runs: AxisRun[]): AxisRun | null {
  if (runs.length === 0) return null;
  return runs.reduce((best, run) => (run.weight > best.weight ? run : best), runs[0]);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function repeatedFrameRuns(runs: AxisRun[]): AxisRun[] {
  if (runs.length < 3) return [];
  const widths = runs.map((run) => run.end - run.start + 1);
  const weights = runs.map((run) => run.weight);
  const medianWidth = median(widths);
  const medianWeight = median(weights);

  const filtered = runs.filter((run) => {
    const width = run.end - run.start + 1;
    return (
      width >= medianWidth * 0.45 &&
      width <= medianWidth * 1.8 &&
      run.weight >= medianWeight * 0.45 &&
      run.weight <= medianWeight * 1.8
    );
  });

  return filtered.length >= 3 ? filtered : [];
}

function buildHorizontalStripFrames(
  xStart: number,
  xEnd: number,
  yStart: number,
  yEnd: number,
): FrameRect[] {
  const usableWidth = Math.max(1, xEnd - xStart + 1);
  const usableHeight = Math.max(1, yEnd - yStart + 1);
  const frameCount = Math.max(1, Math.round(usableWidth / usableHeight));
  const frameWidth = Math.max(1, Math.floor(usableWidth / frameCount));

  return Array.from({ length: frameCount }, (_, index) => {
    const x = xStart + index * frameWidth;
    const nextX = index === frameCount - 1 ? xEnd + 1 : Math.min(xEnd + 1, xStart + (index + 1) * frameWidth);
    return {
      x,
      y: yStart,
      width: Math.max(1, nextX - x),
      height: usableHeight,
    };
  });
}

interface PixelComponent {
  left: number;
  right: number;
  top: number;
  bottom: number;
  pixels: number;
}

function boundsNearby(left: PixelComponent, right: PixelComponent, padding: number): boolean {
  return !(
    left.right + padding < right.left ||
    right.right + padding < left.left ||
    left.bottom + padding < right.top ||
    right.bottom + padding < left.top
  );
}

function refineFrameRect(
  data: Uint8ClampedArray,
  imageWidth: number,
  frame: FrameRect,
): FrameRect {
  const width = frame.width;
  const height = frame.height;
  const visited = new Uint8Array(width * height);
  const components: PixelComponent[] = [];

  for (let localY = 0; localY < height; localY += 1) {
    for (let localX = 0; localX < width; localX += 1) {
      const localIndex = localY * width + localX;
      if (visited[localIndex]) continue;
      visited[localIndex] = 1;

      const globalX = frame.x + localX;
      const globalY = frame.y + localY;
      const alpha = data[(globalY * imageWidth + globalX) * 4 + 3] ?? 0;
      if (alpha <= 16) continue;

      const queue = [[localX, localY]];
      let queueIndex = 0;
      const component: PixelComponent = {
        left: globalX,
        right: globalX,
        top: globalY,
        bottom: globalY,
        pixels: 0,
      };

      while (queueIndex < queue.length) {
        const [x, y] = queue[queueIndex]!;
        queueIndex += 1;
        const gx = frame.x + x;
        const gy = frame.y + y;
        const pixelAlpha = data[(gy * imageWidth + gx) * 4 + 3] ?? 0;
        if (pixelAlpha <= 16) continue;

        component.left = Math.min(component.left, gx);
        component.right = Math.max(component.right, gx);
        component.top = Math.min(component.top, gy);
        component.bottom = Math.max(component.bottom, gy);
        component.pixels += 1;

        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            const nextIndex = ny * width + nx;
            if (visited[nextIndex]) continue;
            visited[nextIndex] = 1;
            queue.push([nx, ny]);
          }
        }
      }

      if (component.pixels > 0) {
        components.push(component);
      }
    }
  }

  if (components.length <= 1) return frame;

  const dominant = components.reduce(
    (best, component) => (component.pixels > best.pixels ? component : best),
    components[0]!,
  );

  const kept = components.filter((component) =>
    component.pixels >= dominant.pixels * 0.18 || boundsNearby(component, dominant, 2),
  );

  const left = Math.max(frame.x, Math.min(...kept.map((component) => component.left)));
  const right = Math.min(frame.x + frame.width - 1, Math.max(...kept.map((component) => component.right)));
  const top = Math.max(frame.y, Math.min(...kept.map((component) => component.top)));
  const bottom = Math.min(frame.y + frame.height - 1, Math.max(...kept.map((component) => component.bottom)));

  const refined: FrameRect = {
    x: left,
    y: top,
    width: Math.max(1, right - left + 1),
    height: Math.max(1, bottom - top + 1),
  };

  const sparseColumnThreshold = Math.max(1, Math.floor(refined.height * 0.08));
  const sparseRowThreshold = Math.max(1, Math.floor(refined.width * 0.08));

  const countColumn = (x: number): number => {
    let count = 0;
    for (let y = refined.y; y < refined.y + refined.height; y += 1) {
      const alpha = data[(y * imageWidth + x) * 4 + 3] ?? 0;
      if (alpha > 16) count += 1;
    }
    return count;
  };

  const countRow = (y: number): number => {
    let count = 0;
    for (let x = refined.x; x < refined.x + refined.width; x += 1) {
      const alpha = data[(y * imageWidth + x) * 4 + 3] ?? 0;
      if (alpha > 16) count += 1;
    }
    return count;
  };

  while (refined.width > 1 && countColumn(refined.x) <= sparseColumnThreshold) {
    refined.x += 1;
    refined.width -= 1;
  }
  while (
    refined.width > 1 &&
    countColumn(refined.x + refined.width - 1) <= sparseColumnThreshold
  ) {
    refined.width -= 1;
  }
  while (refined.height > 1 && countRow(refined.y) <= sparseRowThreshold) {
    refined.y += 1;
    refined.height -= 1;
  }
  while (
    refined.height > 1 &&
    countRow(refined.y + refined.height - 1) <= sparseRowThreshold
  ) {
    refined.height -= 1;
  }

  return refined;
}

function expandFrameRect(frame: FrameRect, maxWidth: number, maxHeight: number, padding = 1): FrameRect {
  const left = Math.max(0, frame.x - padding);
  const top = Math.max(0, frame.y - padding);
  const right = Math.min(maxWidth - 1, frame.x + frame.width - 1 + padding);
  const bottom = Math.min(maxHeight - 1, frame.y + frame.height - 1 + padding);

  return {
    x: left,
    y: top,
    width: right - left + 1,
    height: bottom - top + 1,
  };
}

function analyzeSpriteSheet(img: HTMLImageElement): SheetInfo {
  const source = document.createElement("canvas");
  source.width = img.naturalWidth;
  source.height = img.naturalHeight;

  const context = source.getContext("2d");
  if (!context) {
    return {
      source,
      frames: [],
      maxFrameWidth: 0,
      maxFrameHeight: 0,
      valid: false,
    };
  }

  context.drawImage(img, 0, 0);

  let imageData = context.getImageData(0, 0, source.width, source.height);
  const backgroundColor = detectBackgroundColor(imageData.data, source.width, source.height);

  if (backgroundColor) {
    const next = imageData.data;
    for (let index = 0; index < next.length; index += 4) {
      const pixel = {
        r: next[index] ?? 0,
        g: next[index + 1] ?? 0,
        b: next[index + 2] ?? 0,
        a: next[index + 3] ?? 0,
      };
      if (pixel.a > 0 && colorsClose(pixel, backgroundColor, 20)) {
        next[index + 3] = 0;
      }
    }
    context.putImageData(imageData, 0, 0);
    imageData = context.getImageData(0, 0, source.width, source.height);
  }

  const trimLeft = stripLeadingGuideColumns(imageData.data, source.width, source.height);
  const trimRight = stripTrailingGuideColumns(imageData.data, source.width, source.height);
  const columnRuns = significantRuns(
    buildOccupancyRuns(imageData.data, source.width, source.height, "x", trimLeft),
  ).map((run) => ({
    ...run,
    end: Math.min(run.end, source.width - 1 - trimRight),
  })).filter((run) => run.end > run.start);
  const rowRuns = significantRuns(
    buildOccupancyRuns(imageData.data, source.width, source.height, "y"),
  );

  let frames: FrameRect[] = [];

  if (columnRuns.length > 1 && rowRuns.length > 1) {
    frames = rowRuns.flatMap((row) =>
      columnRuns.map((column) => ({
        x: column.start,
        y: row.start,
        width: column.end - column.start + 1,
        height: row.end - row.start + 1,
      })),
    );
  } else if (rowRuns.length <= 1 && columnRuns.length > 1) {
    const mainRun = dominantRun(columnRuns);
    const row = rowRuns[0] ?? { start: 0, end: source.height - 1, weight: 0 };
    const repeatedRuns = repeatedFrameRuns(columnRuns);
    if (repeatedRuns.length > 0) {
      frames = repeatedRuns.map((column) => ({
        x: column.start,
        y: row.start,
        width: column.end - column.start + 1,
        height: row.end - row.start + 1,
      }));
    } else if (mainRun) {
      frames = buildHorizontalStripFrames(mainRun.start, mainRun.end, row.start, row.end);
    }
  } else if (rowRuns.length > 1 && columnRuns.length <= 1) {
    const column = columnRuns[0] ?? { start: trimLeft, end: source.width - 1 - trimRight, weight: 0 };
    frames = rowRuns.flatMap((row) =>
      buildHorizontalStripFrames(column.start, column.end, row.start, row.end),
    );
  } else {
    const column = columnRuns[0] ?? { start: trimLeft, end: source.width - 1 - trimRight, weight: 0 };
    const row = rowRuns[0] ?? { start: 0, end: source.height - 1, weight: 0 };
    frames = buildHorizontalStripFrames(column.start, column.end, row.start, row.end);
  }

  frames = frames.map((frame) =>
    expandFrameRect(
      refineFrameRect(imageData.data, source.width, frame),
      source.width,
      source.height,
    ),
  );

  return {
    source,
    frames,
    maxFrameWidth: frames.reduce((max, frame) => Math.max(max, frame.width), 0),
    maxFrameHeight: frames.reduce((max, frame) => Math.max(max, frame.height), 0),
    valid: frames.length >= 2,
  };
}

function useSpriteSheet(animSrc: string): SheetInfo | null {
  const [info, setInfo] = useState<SheetInfo | null>(() => sheetCache.get(animSrc) ?? null);
  const latestSrc = useRef(animSrc);

  useEffect(() => {
    latestSrc.current = animSrc;
    if (sheetCache.has(animSrc)) {
      setInfo(sheetCache.get(animSrc)!);
      return;
    }

    const img = new window.Image();
    img.onload = () => {
      if (latestSrc.current !== animSrc) return;
      const result = analyzeSpriteSheet(img);
      sheetCache.set(animSrc, result);
      setInfo(result);
    };
    img.onerror = () => {
      if (latestSrc.current !== animSrc) return;
      const source = document.createElement("canvas");
      const result: SheetInfo = {
        source,
        frames: [],
        maxFrameWidth: 0,
        maxFrameHeight: 0,
        valid: false,
      };
      sheetCache.set(animSrc, result);
      setInfo(result);
    };
    img.src = animSrc;
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [animSrc]);

  return info;
}

// ─── Animated sprite component ────────────────────────────────────────────────

const AnimatedPokemonSprite: React.FC<{
  pokemon: ActivePokemonView;
  isBack: boolean;
  displaySize: number;
  wrapperStyle?: React.CSSProperties;
}> = ({ pokemon, isBack, displaySize, wrapperStyle }) => {
  const folder = isBack ? "back" : "front";
  const animSrc = `/assets/sprites/pokemon/animated/${folder}/${pokemon.speciesId.toUpperCase()}.png`;
  const staticSrc = `/assets/sprites/pokemon/${folder}/${pokemon.speciesId.toUpperCase()}.png`;
  const fallbackSrc = `/assets/sprites/pokemon/${folder}/000.png`;

  const info = useSpriteSheet(animSrc);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!info?.valid || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;

    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(displaySize * pixelRatio));
    canvas.height = Math.max(1, Math.round(displaySize * pixelRatio));
    canvas.style.width = `${displaySize}px`;
    canvas.style.height = `${displaySize}px`;

    let frameIndex = 0;

    const drawFrame = () => {
      const frame = info.frames[frameIndex];
      if (!frame) return;

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, displaySize, displaySize);
      context.imageSmoothingEnabled = false;

      const scale = Math.min(
        displaySize / Math.max(1, info.maxFrameWidth),
        displaySize / Math.max(1, info.maxFrameHeight),
      );
      const drawWidth = Math.max(1, Math.round(frame.width * scale));
      const drawHeight = Math.max(1, Math.round(frame.height * scale));
      const dx = Math.floor((displaySize - drawWidth) / 2);
      const dy = displaySize - drawHeight;

      context.drawImage(
        info.source,
        frame.x,
        frame.y,
        frame.width,
        frame.height,
        dx,
        dy,
        drawWidth,
        drawHeight,
      );
    };

    drawFrame();
    const timer = window.setInterval(() => {
      frameIndex = (frameIndex + 1) % info.frames.length;
      drawFrame();
    }, 1000 / 12);

    return () => window.clearInterval(timer);
  }, [displaySize, info]);

  const content = !info ? (
    <div style={{ width: displaySize, height: displaySize }} />
  ) : !info.valid ? (
    <img
      src={staticSrc}
      alt={pokemon.speciesId}
      draggable={false}
      onError={(e) => { e.currentTarget.src = fallbackSrc; }}
      style={{
        width: displaySize,
        height: displaySize,
        imageRendering: "pixelated",
        objectFit: "contain",
        display: "block",
      }}
    />
  ) : (
    <canvas
      ref={canvasRef}
      style={{
        width: displaySize,
        height: displaySize,
        imageRendering: "pixelated",
        display: "block",
      }}
    />
  );

  return (
    <div
      style={{
        width: displaySize,
        height: displaySize,
        ...wrapperStyle,
      }}
    >
      {content}
    </div>
  );
};

// ─── Layout helpers ───────────────────────────────────────────────────────────

function battlerIndex(side: "player" | "foe", slot: number): number {
  return slot * 2 + (side === "foe" ? 1 : 0);
}

function battlerPosition(
  side: "player" | "foe",
  slot: number,
  sideSize: number,
): { x: number; y: number } {
  const index = battlerIndex(side, slot);
  const base =
    side === "player"
      ? { x: PLAYER_BASE_CENTER.x, y: PLAYER_BASE_CENTER.y }
      : { x: FOE_BASE_CENTER.x, y: FOE_BASE_CENTER.y };

  if (sideSize === 2) {
    base.x += [-48, 48, 32, -32][index] ?? 0;
    base.y += [0, 0, 16, -16][index] ?? 0;
  } else if (sideSize === 3) {
    base.x += [-80, 80, 0, 0, 80, -80][index] ?? 0;
    base.y += [0, 0, 8, -8, 16, -16][index] ?? 0;
  }

  return base;
}

function selectionAnimation(selectionMode: 1 | 2 | undefined): string | undefined {
  if (selectionMode === 1) return "battle-battler-bob 0.6s step-end infinite";
  if (selectionMode === 2) return "battle-battler-target 0.3s step-end infinite";
  return undefined;
}

function spriteAnimation(
  anim: SpriteAnim | undefined,
  selAnim: string | undefined,
): string | undefined {
  if (!anim) return selAnim;
  switch (anim.kind) {
    case "switch-in": {
      const from = anim.from ?? "below";
      const name =
        from === "right"
          ? "battle-enter-right"
          : from === "left"
            ? "battle-enter-left"
            : "battle-enter-below";
      return `${name} 0.35s ease-out forwards`;
    }
    case "faint":
      return "battle-faint 0.48s ease-in forwards";
    case "move-use":
      return "battle-move-use 0.22s ease-in-out";
    default:
      return selAnim;
  }
}

// ─── CSS keyframes ─────────────────────────────────────────────────────────────

const FieldStyles: React.FC = () => (
  <style>
    {`
      @keyframes battle-battler-bob {
        0%, 100% { transform: translateY(0px); }
        25%       { transform: translateY(2px); }
        75%       { transform: translateY(-2px); }
      }
      @keyframes battle-battler-target {
        0%, 33%  { opacity: 0; }
        34%, 100% { opacity: 1; }
      }
      @keyframes battle-enter-below {
        from { transform: translateY(40px); opacity: 0; }
        to   { transform: translateY(0);    opacity: 1; }
      }
      @keyframes battle-enter-right {
        from { transform: translateX(56px); opacity: 0; }
        to   { transform: translateX(0);    opacity: 1; }
      }
      @keyframes battle-enter-left {
        from { transform: translateX(-56px); opacity: 0; }
        to   { transform: translateX(0);     opacity: 1; }
      }
      @keyframes battle-faint {
        from { transform: translateY(0);    opacity: 1; }
        to   { transform: translateY(72px); opacity: 0; }
      }
      @keyframes battle-move-use {
        0%,  100% { transform: translateX(0); }
        25%       { transform: translateX(-4px) rotate(-2deg); }
        75%       { transform: translateX(4px)  rotate(2deg);  }
      }
      @keyframes battle-hit-flash {
        0%   { opacity: 0.85; }
        60%  { opacity: 0.4;  }
        100% { opacity: 0;    }
      }
    `}
  </style>
);

// ─── BattleSprite ─────────────────────────────────────────────────────────────

const BattleSprite: React.FC<{
  pokemon: ActivePokemonView | undefined;
  side: "player" | "foe";
  slot: number;
  sideSize: number;
  selectionMode?: 1 | 2;
  spriteAnim?: SpriteAnim;
  keepVisible?: boolean;
}> = ({ pokemon, side, slot, sideSize, selectionMode, spriteAnim, keepVisible }) => {
  if (!pokemon) return null;
  if (pokemon.hpStatus === "fainted" && !keepVisible) return null;

  const position = battlerPosition(side, slot, sideSize);
  const isBack = side === "player";
  const isFainting = spriteAnim?.kind === "faint";
  const selAnim = selectionAnimation(selectionMode);
  const animation = spriteAnimation(spriteAnim, selAnim);

  const spriteStyle: React.CSSProperties = {
    position: "absolute",
    left: position.x - SPRITE_SIZE / 2,
    top: position.y - SPRITE_SIZE,
    width: SPRITE_SIZE,
    height: SPRITE_SIZE,
    animation,
    imageRendering: "pixelated",
  };

  return (
    <>
      {/* Shadow — hidden during faint */}
      {!isFainting && (
        <img
          src={SHADOW_SPRITE}
          alt=""
          draggable={false}
          style={{
            position: "absolute",
            left: position.x - SHADOW_WIDTH / 2,
            top: position.y - 12,
            width: SHADOW_WIDTH,
            height: SHADOW_HEIGHT,
            imageRendering: "pixelated",
            animation: selAnim,
          }}
        />
      )}

      {/* Animated or static Pokemon sprite */}
      <AnimatedPokemonSprite
        pokemon={pokemon}
        isBack={isBack}
        displaySize={SPRITE_SIZE}
        wrapperStyle={spriteStyle}
      />

      {/* Hit flash overlay */}
      {spriteAnim?.kind === "hit" && (
        <div
          style={{
            position: "absolute",
            left: position.x - SPRITE_SIZE / 2,
            top: position.y - SPRITE_SIZE,
            width: SPRITE_SIZE,
            height: SPRITE_SIZE,
            backgroundColor: spriteAnim.flashColor ?? "#ffffff",
            animation: "battle-hit-flash 0.32s ease-out forwards",
            pointerEvents: "none",
          }}
        />
      )}
    </>
  );
};

// ─── BattleField ──────────────────────────────────────────────────────────────

export const BattleField: React.FC<Props> = ({
  playerActive,
  foeActive,
  sideSize,
  selection,
  indoor = false,
  spriteAnims,
  keepVisible,
}) => {
  const prefix = indoor ? "indoor1" : "field";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <FieldStyles />

      <img
        src={`/assets/battlebacks/${prefix}_bg.png`}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: SCREEN_WIDTH,
          height: BATTLE_HEIGHT,
          imageRendering: "pixelated",
          objectFit: "fill",
        }}
      />
      <img
        src={`/assets/battlebacks/${prefix}_base1.png`}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          left: FOE_BASE_CENTER.x - 128,
          top: FOE_BASE_CENTER.y - 64,
          imageRendering: "pixelated",
        }}
      />
      <img
        src={`/assets/battlebacks/${prefix}_base0.png`}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          left: PLAYER_BASE_CENTER.x - 256,
          top: PLAYER_BASE_CENTER.y - 64,
          imageRendering: "pixelated",
        }}
      />

      {Array.from({ length: sideSize }, (_, slot) => (
        <BattleSprite
          key={`foe-${slot}`}
          pokemon={foeActive[slot]}
          side="foe"
          slot={slot}
          sideSize={sideSize}
          selectionMode={selection?.foe[slot]}
          spriteAnim={spriteAnims?.get(`foe:${slot}`)}
          keepVisible={keepVisible?.has(`foe:${slot}`)}
        />
      ))}

      {Array.from({ length: sideSize }, (_, slot) => (
        <BattleSprite
          key={`player-${slot}`}
          pokemon={playerActive[slot]}
          side="player"
          slot={slot}
          sideSize={sideSize}
          selectionMode={selection?.player[slot]}
          spriteAnim={spriteAnims?.get(`player:${slot}`)}
          keepVisible={keepVisible?.has(`player:${slot}`)}
        />
      ))}
    </div>
  );
};

import { useState, useEffect, useRef } from "react";

interface AnimFrame {
  index: number;
  delay: number;
}

interface AnimMetadata {
  frame_width: number;
  frame_height: number;
  frames: AnimFrame[];
}

interface Props {
  dexId: number;
  facing?: "front" | "back";
  scale?: number;
  zoom?: boolean;
}

export function PokemonSprite({ dexId, facing = "front", scale = 2, zoom = false }: Props) {
  const [meta, setMeta] = useState<AnimMetadata | null>(null);
  const [currentFrameIdx, setCurrentFrameIdx] = useState(0);

  const requestRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number | undefined>(undefined);
  const frameAccumulatorRef = useRef<number>(0);

  // Constants to match Nintendo DS roughly 30 ticks per second (1 tick = ~33.3ms)
  const TICK_MS = 33.33;

  useEffect(() => {
    // Fetch JSON metadata
    let active = true;
    const fetchMeta = async () => {
      try {
        const response = await fetch(`/assets/sprites/pokemon/bw/${facing}/${dexId}.json`);
        if (!response.ok) throw new Error("Metadata missing");
        const json: AnimMetadata = await response.json();
        if (active) {
          setMeta(json);
          setCurrentFrameIdx(0);
          frameAccumulatorRef.current = 0;
        }
      } catch (err) {
        console.error("Failed to load pokemon sprite meta for Dex:", dexId, facing);
      }
    };
    fetchMeta();

    return () => {
      active = false;
    };
  }, [dexId, facing]);

  useEffect(() => {
    if (!meta || meta.frames.length === 0) return;

    const animate = (time: number) => {
      if (lastTimeRef.current !== undefined) {
        const deltaTime = time - lastTimeRef.current;
        frameAccumulatorRef.current += deltaTime;

        // Peak current frame delay limit in MS
        let currentFrameDelayMs = meta.frames[currentFrameIdx].delay * TICK_MS;

        if (frameAccumulatorRef.current >= currentFrameDelayMs) {
          // Time to advance frame
          setCurrentFrameIdx((prev) => (prev + 1) % meta.frames.length);
          // Consume accumulator, keeping possible lag remainder
          frameAccumulatorRef.current -= currentFrameDelayMs;
        }
      }
      lastTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [meta, currentFrameIdx]);

  if (!meta) {
    return <div style={{ width: 64, height: 64, backgroundColor: "transparent" }}></div>;
  }

  // Calculate coordinates.
  // The sheet is built with 4 columns per row.
  // The spacing formulas from the Python exporter are:
  // x = (index % columns) * (frame_width + 12) + 6
  // y = (index // columns) * (frame_height + 24)
  const columns = Math.min(4, meta.frames.length);
  const frameIndexNum = meta.frames[currentFrameIdx].index;
  const rawX = (frameIndexNum % columns) * (meta.frame_width + 12) + 6;
  const rawY = Math.floor(frameIndexNum / columns) * (meta.frame_height + 24);

  return (
    <div
      style={{
        width: meta.frame_width,
        height: meta.frame_height,
        backgroundImage: `url(/assets/sprites/pokemon/bw/${facing}/${dexId}-sheet.png)`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "auto",
        backgroundPosition: `-${rawX}px -${rawY}px`,
        transform: `scale(${scale})`,
        imageRendering: "pixelated",
        transformOrigin: "bottom center",
      }}
      className={zoom ? "pokemon-zoom-anim" : ""}
    />
  );
}

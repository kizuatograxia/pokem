import { useEffect, useRef } from "react";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

const WINDOWSKIN_SRC = "/assets/windowskins/001-Blue01.png";
const BORDER_SIZE = 16;
const BACKGROUND_SIZE = 128;

let cachedWindowskin: HTMLImageElement | null = null;
let windowskinPromise: Promise<HTMLImageElement> | null = null;

function loadWindowskin(): Promise<HTMLImageElement> {
  if (cachedWindowskin) {
    return Promise.resolve(cachedWindowskin);
  }

  if (windowskinPromise) {
    return windowskinPromise;
  }

  windowskinPromise = new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      cachedWindowskin = image;
      resolve(image);
    };

    image.onerror = () => {
      windowskinPromise = null;
      reject(new Error(`Failed to load windowskin: ${WINDOWSKIN_SRC}`));
    };

    image.src = WINDOWSKIN_SRC;
  });

  return windowskinPromise;
}

function drawWindow(ctx: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number): void {
  const innerWidth = Math.max(0, width - BORDER_SIZE * 2);
  const innerHeight = Math.max(0, height - BORDER_SIZE * 2);

  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = false;

  if (innerWidth > 0 && innerHeight > 0) {
    ctx.drawImage(
      image,
      0,
      0,
      BACKGROUND_SIZE,
      BACKGROUND_SIZE,
      BORDER_SIZE,
      BORDER_SIZE,
      innerWidth,
      innerHeight,
    );
  }

  ctx.drawImage(image, 128, 0, 16, 16, 0, 0, 16, 16);
  ctx.drawImage(image, 176, 0, 16, 16, width - 16, 0, 16, 16);
  ctx.drawImage(image, 128, 48, 16, 16, 0, height - 16, 16, 16);
  ctx.drawImage(image, 176, 48, 16, 16, width - 16, height - 16, 16, 16);

  if (innerWidth > 0) {
    ctx.drawImage(image, 144, 0, 32, 16, BORDER_SIZE, 0, innerWidth, 16);
    ctx.drawImage(image, 144, 48, 32, 16, BORDER_SIZE, height - 16, innerWidth, 16);
  }

  if (innerHeight > 0) {
    ctx.drawImage(image, 128, 16, 16, 32, 0, BORDER_SIZE, 16, innerHeight);
    ctx.drawImage(image, 176, 16, 16, 32, width - 16, BORDER_SIZE, 16, innerHeight);
  }
}

export interface PkeWindowProps extends HTMLAttributes<HTMLDivElement> {
  width: number;
  height: number;
  style?: CSSProperties;
  children?: ReactNode;
}

export function PkeWindow({ width, height, style, children, ...props }: PkeWindowProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    let cancelled = false;

    const render = (image: HTMLImageElement) => {
      if (cancelled) {
        return;
      }

      drawWindow(context, image, width, height);
    };

    if (cachedWindowskin) {
      render(cachedWindowskin);
    } else {
      void loadWindowskin().then(render).catch(() => undefined);
    }

    return () => {
      cancelled = true;
    };
  }, [height, width]);

  return (
    <div
      {...props}
      style={{
        position: "relative",
        width,
        height,
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          imageRendering: "pixelated",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: BORDER_SIZE,
          left: BORDER_SIZE,
          right: BORDER_SIZE,
          bottom: BORDER_SIZE,
        }}
      >
        {children}
      </div>
    </div>
  );
}

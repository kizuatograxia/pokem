import React, { useEffect, useState } from "react";

function getViewportSize(): { width: number; height: number } {
  if (typeof window !== "undefined" && window.visualViewport) {
    return {
      width: window.visualViewport.width,
      height: window.visualViewport.height,
    };
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

function calcScale(): number {
  const { width, height } = getViewportSize();
  const fitScale = Math.min(width / 512, height / 384);

  if (fitScale >= 1) {
    return Math.max(1, Math.floor(fitScale));
  }

  return Math.max(0.25, fitScale);
}

export const PixelScreen: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [scale, setScale] = useState<number>(() => (typeof window === "undefined" ? 1 : calcScale()));

  useEffect(() => {
    const onResize = () => setScale(calcScale());

    onResize();
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("scroll", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("scroll", onResize);
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: "100vw",
        height: "100dvh",
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: 512 * scale,
          height: 384 * scale,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: 512,
            height: 384,
            imageRendering: "pixelated",
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            position: "absolute",
            left: 0,
            top: 0,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

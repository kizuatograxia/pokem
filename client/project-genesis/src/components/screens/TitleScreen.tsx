import { useCallback, useEffect, useState } from "react";
import { PixelScreen, PixelText } from "@/components/pixel-ui";

const TitleScreen = () => {
  const [showPrompt, setShowPrompt] = useState(true);
  const [transitioning, setTransitioning] = useState(false);

  const handleStart = useCallback(() => {
    if (transitioning) return;
    setTransitioning(true);
    // TODO: transition to main menu
  }, [transitioning]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleStart();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleStart]);

  return (
    <PixelScreen>
      {/* Full title screen background — uses the real title.png asset */}
      <img
        src="/assets/reference-ui/titles/title.png"
        alt="Pokemon Essentials Title Screen"
        className="absolute inset-0 w-full h-full object-cover pixel-render"
        draggable={false}
      />

      {/* Press Enter prompt — positioned over the lower area */}
      <div className="absolute bottom-[15%] left-0 right-0 flex justify-center">
        <button
          onClick={handleStart}
          className="focus:outline-none bg-transparent border-none cursor-pointer"
        >
          <PixelText
            size="sm"
            shadow
            className={`text-pixel-white tracking-wider ${showPrompt ? "animate-retro-blink" : ""}`}
          >
            Press Enter
          </PixelText>
        </button>
      </div>

      {/* Fade-to-black transition overlay */}
      {transitioning && (
        <div
          className="absolute inset-0 bg-pixel-black animate-fade-in pointer-events-none"
          style={{
            animation: "fadeIn 0.8s ease-in forwards",
          }}
        />
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </PixelScreen>
  );
};

export default TitleScreen;

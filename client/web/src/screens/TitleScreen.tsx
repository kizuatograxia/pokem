import React, { useEffect, useState } from "react";
import { PixelScreen } from "../components/ui-pixel";
import { MainMenuScreen } from "./MainMenuScreen";

const TITLE_BACKGROUND_SRC = "/assets/reference-ui/titles/title.png";
const TITLE_PROMPT_SRC = "/assets/reference-ui/titles/start.png";

export const TitleScreen: React.FC = () => {
  const [showMenu, setShowMenu] = useState(false);
  const [showPrompt, setShowPrompt] = useState(true);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setShowPrompt((current) => !current);
    }, 600);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setShowMenu(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (showMenu) {
    return <MainMenuScreen onBack={() => setShowMenu(false)} />;
  }

  return (
    <PixelScreen>
      <div
        style={{
          position: "relative",
          width: 512,
          height: 384,
        }}
        onClick={() => setShowMenu(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setShowMenu(true);
          }
        }}
      >
        <img
          src={TITLE_BACKGROUND_SRC}
          alt="Pokemon Essentials title screen"
          draggable={false}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 512,
            height: 384,
            imageRendering: "pixelated",
          }}
        />

        <img
          src={TITLE_PROMPT_SRC}
          alt="Press Enter"
          draggable={false}
          style={{
            position: "absolute",
            top: 352,
            left: 0,
            width: 512,
            height: 10,
            opacity: showPrompt ? 1 : 0,
            imageRendering: "pixelated",
          }}
        />
      </div>
    </PixelScreen>
  );
};

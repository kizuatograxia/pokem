import { useEffect, useState } from "react";
import { PixelDialogueBox } from "../components/ui-pixel";
import { dispatchHubDialogueClosed, dispatchHubNurseMenu, dispatchHubPc } from "./hubEvents";

const ADVANCE_KEYS = new Set(["Enter", "Space", "Spacebar", "z", "Z"]);

export function HubDialogue() {
  const [activeNpcId, setActiveNpcId] = useState<string | null>(null);
  const [dialogueLines, setDialogueLines] = useState<string[]>([]);
  const [lineIndex, setLineIndex] = useState(0);
  const [open, setOpen] = useState(false);

  const closeDialogue = () => {
    setActiveNpcId(null);
    setDialogueLines([]);
    setLineIndex(0);
    setOpen(false);
  };

  useEffect(() => {
    const handleInteract = (event: WindowEventMap["hub:interact"]) => {
      setActiveNpcId(event.detail.npcId);
      setDialogueLines(event.detail.text);
      setLineIndex(0);
      setOpen(event.detail.text.length > 0);
    };

    window.addEventListener("hub:interact", handleInteract);
    return () => window.removeEventListener("hub:interact", handleInteract);
  }, []);

  useEffect(() => {
    const handleClosed = () => {
      closeDialogue();
    };

    window.addEventListener("hub:dialogue:closed", handleClosed);
    return () => window.removeEventListener("hub:dialogue:closed", handleClosed);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!ADVANCE_KEYS.has(event.key)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (lineIndex < dialogueLines.length - 1) {
        setLineIndex((current) => current + 1);
        return;
      }

      closeDialogue();

      if (activeNpcId === "pc") {
        dispatchHubPc();
        return;
      }

      if (activeNpcId === "nurse") {
        dispatchHubNurseMenu();
        return;
      }

      dispatchHubDialogueClosed();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeNpcId, dialogueLines.length, lineIndex, open]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: open ? "auto" : "none",
      }}
    >
      <style>
        {`@keyframes hub-dialogue-blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }`}
      </style>
      {open ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            width: 512,
            height: 96,
          }}
        >
          <PixelDialogueBox text={dialogueLines[lineIndex] ?? ""} />
          {lineIndex < dialogueLines.length - 1 ? (
            <img
              src="/assets/sprites/ui/common/down_arrow.png"
              alt=""
              aria-hidden="true"
              draggable={false}
              style={{
                position: "absolute",
                right: 20,
                bottom: 14,
                width: 16,
                height: 16,
                imageRendering: "pixelated",
                animation: "hub-dialogue-blink 1s steps(2, start) infinite",
              }}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

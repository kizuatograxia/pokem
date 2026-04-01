import React from "react";
import { PixelText } from "./PixelText";

export interface PixelDialogueBoxProps {
  text: string;
  speaker?: string;
  textColor?: string;
  textShadow?: string;
}

export const PixelDialogueBox: React.FC<PixelDialogueBoxProps> = ({
  text,
  speaker,
  textColor = "#ffffff",
  textShadow = "2px 2px 0 #000000",
}) => {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        width: 512,
        height: 96,
      }}
    >
      <img
        src="/assets/sprites/ui/battle/overlay_message.png"
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{
          position: "absolute",
          inset: 0,
          width: 512,
          height: 96,
          imageRendering: "pixelated",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 16,
          right: 16,
          bottom: 8,
        }}
      >
        {speaker ? (
          <PixelText color="#a0d0ff" size="sm" style={{ marginBottom: 4 }}>
            {speaker}
          </PixelText>
        ) : null}
        <PixelText
          fontSize={22}
          lineHeight={32}
          color={textColor}
          style={{ textShadow }}
        >
          {text}
        </PixelText>
      </div>
    </div>
  );
};

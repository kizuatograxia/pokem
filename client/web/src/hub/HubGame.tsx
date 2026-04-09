import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { HubDialogue } from "./HubDialogue";
import { HubMobileControls } from "./HubMobileControls";
import { HubScene } from "./HubScene";
import { NurseMenu } from "./NurseMenu";
import { PcMenu } from "./PcMenu";
import type { HubPartyMember, HubStorageBox } from "./pcStorageData";

const GAME_WIDTH = 512;
const GAME_HEIGHT = 384;

interface HubGameProps {
  party: Array<HubPartyMember | null>;
  setParty: React.Dispatch<React.SetStateAction<Array<HubPartyMember | null>>>;
  storageBoxes: HubStorageBox[];
  setStorageBoxes: React.Dispatch<React.SetStateAction<HubStorageBox[]>>;
}

export function HubGame({ party, setParty, storageBoxes, setStorageBoxes }: HubGameProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (containerRef.current === null) {
      return;
    }

    containerRef.current.replaceChildren();

    const game = new Phaser.Game({
      type: Phaser.CANVAS,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      parent: containerRef.current,
      backgroundColor: "#121c1a",
      pixelArt: true,
      antialias: false,
      scene: [HubScene],
      scale: {
        mode: Phaser.Scale.NONE,
      },
    });

    return () => {
      game.destroy(true);
    };
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: `${GAME_WIDTH}px`,
        height: `${GAME_HEIGHT}px`,
      }}
    >
      <div
        id="hub-canvas"
        ref={containerRef}
        style={{
          width: `${GAME_WIDTH}px`,
          height: `${GAME_HEIGHT}px`,
          imageRendering: "pixelated",
        }}
      />
      <HubDialogue />
      <NurseMenu />
      <PcMenu
        party={party}
        setParty={setParty}
        storageBoxes={storageBoxes}
        setStorageBoxes={setStorageBoxes}
      />
      <HubMobileControls />
    </div>
  );
}

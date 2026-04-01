import Phaser from "phaser";
import { dispatchHubInteract } from "./hubEvents";

declare global {
  interface Window {
    __hubHookOwner?: number;
    advanceTime?: (ms: number) => void;
    render_game_to_text?: () => string;
  }
}

const TILE_SIZE = 32;
const MAP_WIDTH = 20;
const MAP_HEIGHT = 15;
const WALK_DURATION_MS = 200;
const RUN_DURATION_MS = 100;
const INPUT_BUFFER_WINDOW_MS = 80;
const SCENE_KEY = "HubScene";
const BGM_KEY = "hub-bgm";
const BACKGROUND_TEXTURE_KEY = "battle-tower-lobby-map";
const PLAYER_TEXTURE_KEY = "battle-tower-player";
const NPC_CLERK_TEXTURE_KEY = "battle-tower-clerk";
const NPC_NURSE_TEXTURE_KEY = "battle-tower-nurse";
const DOOR_TEXTURE_KEY = "battle-tower-door";
const FRAME_WIDTH = 32;
const FRAME_HEIGHT = 48;
const PLAYER_FRAME_SEQUENCE = [0, 1, 2, 1];

type Direction = "down" | "left" | "right" | "up";
type DirectionKeyMap = Record<Direction, Phaser.Input.Keyboard.Key[]>;
type DirectionStampMap = Record<Direction, number>;

interface MoveIntent {
  direction: Direction;
  running: boolean;
}

interface VirtualDirectionEventDetail {
  direction: Direction;
  active: boolean;
}

interface VirtualRunEventDetail {
  active: boolean;
}

interface ActiveMove extends MoveIntent {
  fromTileX: number;
  fromTileY: number;
  toTileX: number;
  toTileY: number;
  elapsedMs: number;
  durationMs: number;
}

interface HubNpc {
  id: string;
  textureKey: string;
  tileX: number;
  tileY: number;
  direction: Direction;
  frameColumn: number;
}

interface HubTextState {
  scene: "battle-tower-lobby";
  coordinateSystem: string;
  dialogueOpen: boolean;
  map: {
    name: string;
    widthTiles: number;
    heightTiles: number;
    tileSize: number;
  };
  player: {
    tileX: number;
    tileY: number;
    worldX: number;
    worldY: number;
    facing: Direction;
    moving: boolean;
    queuedDirection: Direction | null;
    running: boolean;
  };
  npcs: Array<{
    id: string;
    tileX: number;
    tileY: number;
    facing: Direction;
  }>;
}

const DIRECTIONS: Direction[] = ["down", "left", "right", "up"];

const DIRECTION_VECTORS: Record<Direction, { x: number; y: number }> = {
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
};

const DIRECTION_ROWS: Record<Direction, number> = {
  down: 0,
  left: 1,
  right: 2,
  up: 3,
};

const COLLISION_ROWS = [
  "####################",
  "####################",
  ".....#########.....#",
  "####################",
  ".....#########.....#",
  ".....#########.....#",
  ".....#########.....#",
  "......####.##......#",
  ".....#########.....#",
  "...................#",
  ".................###",
  ".................###",
  "#.#..............###",
  "####################",
  "####################",
] as const;

function isWalkableTile(tileX: number, tileY: number): boolean {
  if (tileX < 0 || tileY < 0 || tileX >= MAP_WIDTH || tileY >= MAP_HEIGHT) {
    return false;
  }

  return COLLISION_ROWS[tileY][tileX] === ".";
}

const STATIC_NPCS: HubNpc[] = [
  {
    id: "single-battles-clerk",
    textureKey: NPC_CLERK_TEXTURE_KEY,
    tileX: 2,
    tileY: 3,
    direction: "down",
    frameColumn: 0,
  },
  {
    id: "double-battles-clerk",
    textureKey: NPC_CLERK_TEXTURE_KEY,
    tileX: 16,
    tileY: 3,
    direction: "down",
    frameColumn: 0,
  },
  {
    id: "nurse",
    textureKey: NPC_NURSE_TEXTURE_KEY,
    tileX: 9,
    tileY: 7,
    direction: "down",
    frameColumn: 0,
  },
  {
    id: "single-battles-door",
    textureKey: DOOR_TEXTURE_KEY,
    tileX: 2,
    tileY: 1,
    direction: "down",
    frameColumn: 1,
  },
  {
    id: "double-battles-door",
    textureKey: DOOR_TEXTURE_KEY,
    tileX: 16,
    tileY: 1,
    direction: "down",
    frameColumn: 1,
  },
] as const;

interface InteractiveTile {
  tileX: number;
  tileY: number;
  id: string;
}

// Map objects that are interactable but not NPCs (collision tiles).
// The Battle Tower lobby PC terminal sits on the left side of the front desk.
// The blocked event tile is x=5, y=8 and is accessed from the adjacent floor tile x=4, y=8.
const INTERACTIVE_TILES: InteractiveTile[] = [
  { tileX: 5, tileY: 8, id: "pc" },
];

function getNpcDialogue(npcId: string): string[] {
  switch (npcId) {
    case "single-battles-clerk":
      return [
        "Welcome to the Battle Tower!",
        "I oversee Single Battles here.",
        "Challenge me when you're ready.",
      ];
    case "double-battles-clerk":
      return [
        "The Double Battle format awaits.",
        "Two Pokemon fight side by side.",
        "Do you accept the challenge?",
      ];
    case "nurse":
      return [
        "Welcome to the Battle Tower!",
        "Shall I restore your\nPokemon to full health?",
      ];
    case "pc":
      return ["This is Bill's PC.", "Would you like to\naccess the PC?"];
    case "single-battles-door":
      return ["The Single Battle hall\nlies beyond this door."];
    case "double-battles-door":
      return ["The Double Battle hall\nlies beyond this door."];
    default:
      return ["..."];
  }
}

export class HubScene extends Phaser.Scene {
  private readonly hookOwner = Math.random();
  private readonly handleDialogueClosed = (): void => {
    this.dialogueOpen = false;
    this.bufferedMove = null;
  };
  private readonly handleWindowActionKey = (event: KeyboardEvent): void => {
    const key = event.key;
    const normalizedKey = key.length === 1 ? key.toLowerCase() : key;
    const isActionKey =
      normalizedKey === "Enter" ||
      normalizedKey === " " ||
      normalizedKey === "Spacebar" ||
      normalizedKey === "z";

    if (!isActionKey || event.repeat) {
      return;
    }

    event.preventDefault();
    this.handleActionPress();
  };
  private readonly handleVirtualDirection = (event: Event): void => {
    const customEvent = event as CustomEvent<VirtualDirectionEventDetail>;
    const detail = customEvent.detail;

    if (!detail) {
      return;
    }

    this.virtualDirectionHeld[detail.direction] = detail.active;

    if (detail.active) {
      this.directionStamps[detail.direction] = this.time.now;

      if (this.activeMove === null && !this.dialogueOpen) {
        this.facing = detail.direction;
        this.updateFacingVisual();
      }
    }
  };
  private readonly handleVirtualRun = (event: Event): void => {
    const customEvent = event as CustomEvent<VirtualRunEventDetail>;
    const detail = customEvent.detail;

    if (!detail) {
      return;
    }

    this.virtualRunHeld = detail.active;
  };
  private readonly handleVirtualAction = (): void => {
    this.handleActionPress();
  };

  private actionKeys: Phaser.Input.Keyboard.Key[] = [];
  private directionKeys!: DirectionKeyMap;
  private directionStamps: DirectionStampMap = {
    down: 0,
    left: 0,
    right: 0,
    up: 0,
  };
  private virtualDirectionHeld: Record<Direction, boolean> = {
    down: false,
    left: false,
    right: false,
    up: false,
  };
  private runKey!: Phaser.Input.Keyboard.Key;
  private virtualRunHeld = false;

  private player!: Phaser.GameObjects.Sprite;
  private tileX = 9;
  private tileY = 12;
  private facing: Direction = "up";

  private activeMove: ActiveMove | null = null;
  private bufferedMove: MoveIntent | null = null;
  private dialogueOpen = false;
  private manualStepMode = false;

  private bgmSound: Phaser.Sound.BaseSound | null = null;

  constructor() {
    super(SCENE_KEY);
  }

  preload(): void {
    this.load.audio(BGM_KEY, "assets/hub/bgm/Poke Center.ogg");
    this.load.image(BACKGROUND_TEXTURE_KEY, "assets/maps/battle-tower-lobby-base.png");
    this.load.spritesheet(PLAYER_TEXTURE_KEY, "assets/sprites/characters/overworld/boy_run.png", {
      frameWidth: FRAME_WIDTH,
      frameHeight: FRAME_HEIGHT,
    });
    this.load.spritesheet(NPC_CLERK_TEXTURE_KEY, "assets/sprites/characters/runtime/NPC23.png", {
      frameWidth: FRAME_WIDTH,
      frameHeight: FRAME_HEIGHT,
    });
    this.load.spritesheet(NPC_NURSE_TEXTURE_KEY, "assets/sprites/characters/runtime/NPC16.png", {
      frameWidth: FRAME_WIDTH,
      frameHeight: FRAME_HEIGHT,
    });
    this.load.spritesheet(DOOR_TEXTURE_KEY, "assets/sprites/characters/runtime/doors9.png", {
      frameWidth: FRAME_WIDTH,
      frameHeight: FRAME_HEIGHT,
    });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x000000);
    this.cameras.main.setRoundPixels(true);

    this.createBackground();
    this.createStaticNpcs();
    this.createPlayer();
    this.setupInput();
    this.snapPlayerToTile(this.tileX, this.tileY);
    this.updateFacingVisual();
    this.cameras.main.setBounds(0, 0, MAP_WIDTH * TILE_SIZE, MAP_HEIGHT * TILE_SIZE);
    this.cameras.main.startFollow(this.player, true, 1, 1);
    this.registerWindowHooks();

    this.bgmSound = this.sound.add(BGM_KEY, { loop: true, volume: 0.35 });
    if (!this.sound.locked) {
      this.bgmSound.play();
    } else {
      this.sound.once(Phaser.Sound.Events.UNLOCKED, () => {
        this.bgmSound?.play();
      });
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupScene, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanupScene, this);
  }

  update(_time: number, delta: number): void {
    if (this.manualStepMode) {
      return;
    }

    this.stepSimulation(delta);
  }

  private createBackground(): void {
    this.add.image(0, 0, BACKGROUND_TEXTURE_KEY).setOrigin(0, 0);
  }

  private createStaticNpcs(): void {
    for (const npc of STATIC_NPCS) {
      const sprite = this.add.sprite(
        this.tileToWorldX(npc.tileX),
        this.tileToWorldY(npc.tileY),
        npc.textureKey,
        this.getFrameIndex(npc.direction, npc.frameColumn),
      );
      sprite.setOrigin(0, 0);
      sprite.setDepth(npc.tileY + 5);
    }
  }

  private createPlayer(): void {
    this.player = this.add.sprite(
      this.tileToWorldX(this.tileX),
      this.tileToWorldY(this.tileY),
      PLAYER_TEXTURE_KEY,
      this.getFrameIndex(this.facing, 1),
    );
    this.player.setOrigin(0, 0);
    this.player.setDepth(this.tileY + 10);
  }

  private setupInput(): void {
    const keyboard = this.input.keyboard;

    if (keyboard === null) {
      throw new Error("Keyboard input unavailable.");
    }

    this.directionKeys = {
      down: [
        keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
        keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      ],
      left: [
        keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
        keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      ],
      right: [
        keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
        keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      ],
      up: [
        keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
        keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      ],
    };

    this.runKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.actionKeys = [
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
    ];

    for (const direction of DIRECTIONS) {
      for (const key of this.directionKeys[direction]) {
        key.on("down", () => {
          if (this.dialogueOpen) {
            return;
          }

          this.directionStamps[direction] = this.time.now;

          if (this.activeMove === null) {
            this.facing = direction;
            this.updateFacingVisual();
          }
        });
      }
    }

    for (const key of this.actionKeys) {
      key.on("down", () => {
        this.handleActionPress();
      });
    }
  }

  private stepSimulation(deltaMs: number): void {
    let timeLeft = deltaMs;

    while (timeLeft > 0) {
      const heldIntent = this.getHeldIntent();

      if (heldIntent !== null && this.activeMove === null) {
        this.facing = heldIntent.direction;
        this.updateFacingVisual();
      }

      if (this.activeMove !== null) {
        const timeToFinish = this.activeMove.durationMs - this.activeMove.elapsedMs;
        const step = Math.min(timeLeft, timeToFinish);

        this.activeMove.elapsedMs += step;
        timeLeft -= step;

        if (
          this.activeMove.durationMs - this.activeMove.elapsedMs <= INPUT_BUFFER_WINDOW_MS &&
          heldIntent !== null
        ) {
          this.bufferedMove = heldIntent;
        }

        const progress = Phaser.Math.Clamp(
          this.activeMove.elapsedMs / this.activeMove.durationMs,
          0,
          1,
        );

        this.interpolatePlayer(progress);
        this.updatePlayerFrame(progress);

        if (this.activeMove.elapsedMs >= this.activeMove.durationMs) {
          this.finishMove();
          continue;
        }

        break;
      }

      if (this.bufferedMove !== null) {
        const nextMove = this.bufferedMove;
        this.bufferedMove = null;

        if (this.tryStartMove(nextMove)) {
          continue;
        }
      }

      if (heldIntent !== null) {
        this.tryStartMove(heldIntent);
      }

      break;
    }
  }

  private getHeldIntent(): MoveIntent | null {
    if (this.dialogueOpen) {
      return null;
    }

    let latestDirection: Direction | null = null;
    let latestStamp = Number.NEGATIVE_INFINITY;

    for (const direction of DIRECTIONS) {
      const isHeld =
        this.directionKeys[direction].some((key) => key.isDown) || this.virtualDirectionHeld[direction];
      if (!isHeld) {
        continue;
      }

      const stamp = this.directionStamps[direction];
      if (stamp >= latestStamp) {
        latestStamp = stamp;
        latestDirection = direction;
      }
    }

    if (latestDirection === null) {
      return null;
    }

    return {
      direction: latestDirection,
      running: this.runKey.isDown || this.virtualRunHeld,
    };
  }

  private tryStartMove(intent: MoveIntent): boolean {
    if (this.dialogueOpen) {
      return false;
    }

    const vector = DIRECTION_VECTORS[intent.direction];
    const nextTileX = this.tileX + vector.x;
    const nextTileY = this.tileY + vector.y;

    this.facing = intent.direction;
    this.updateFacingVisual();

    if (!this.canEnter(nextTileX, nextTileY)) {
      return false;
    }

    this.activeMove = {
      direction: intent.direction,
      running: intent.running,
      fromTileX: this.tileX,
      fromTileY: this.tileY,
      toTileX: nextTileX,
      toTileY: nextTileY,
      elapsedMs: 0,
      durationMs: intent.running ? RUN_DURATION_MS : WALK_DURATION_MS,
    };

    return true;
  }

  private finishMove(): void {
    if (this.activeMove === null) {
      return;
    }

    this.tileX = this.activeMove.toTileX;
    this.tileY = this.activeMove.toTileY;
    this.snapPlayerToTile(this.tileX, this.tileY);
    this.player.setDepth(this.tileY + 10);
    this.activeMove = null;
    this.updateFacingVisual();
  }

  private interpolatePlayer(progress: number): void {
    if (this.activeMove === null) {
      return;
    }

    const startX = this.tileToWorldX(this.activeMove.fromTileX);
    const startY = this.tileToWorldY(this.activeMove.fromTileY);
    const endX = this.tileToWorldX(this.activeMove.toTileX);
    const endY = this.tileToWorldY(this.activeMove.toTileY);

    this.player.setPosition(
      Math.round(Phaser.Math.Linear(startX, endX, progress)),
      Math.round(Phaser.Math.Linear(startY, endY, progress)),
    );
  }

  private updatePlayerFrame(progress: number): void {
    const sequenceIndex = Math.min(
      PLAYER_FRAME_SEQUENCE.length - 1,
      Math.floor(progress * PLAYER_FRAME_SEQUENCE.length),
    );
    this.player.setFrame(this.getFrameIndex(this.facing, PLAYER_FRAME_SEQUENCE[sequenceIndex]));
  }

  private updateFacingVisual(): void {
    this.player.setFrame(this.getFrameIndex(this.facing, 1));
  }

  private canEnter(tileX: number, tileY: number): boolean {
    if (tileX < 0 || tileY < 0 || tileX >= MAP_WIDTH || tileY >= MAP_HEIGHT) {
      return false;
    }

    if (COLLISION_ROWS[tileY][tileX] !== ".") {
      return false;
    }

    return !STATIC_NPCS.some((npc) => npc.tileX === tileX && npc.tileY === tileY);
  }

  private snapPlayerToTile(tileX: number, tileY: number): void {
    this.player.setPosition(this.tileToWorldX(tileX), this.tileToWorldY(tileY));
  }

  private tileToWorldX(tileX: number): number {
    return tileX * TILE_SIZE;
  }

  private tileToWorldY(tileY: number): number {
    return tileY * TILE_SIZE - 16;
  }

  private getFrameIndex(direction: Direction, frameColumn: number): number {
    return DIRECTION_ROWS[direction] * 4 + frameColumn;
  }

  private registerWindowHooks(): void {
    window.__hubHookOwner = this.hookOwner;
    window.addEventListener("hub:dialogue:closed", this.handleDialogueClosed);
    window.addEventListener("keydown", this.handleWindowActionKey);
    window.addEventListener("hub:virtual:dir", this.handleVirtualDirection);
    window.addEventListener("hub:virtual:run", this.handleVirtualRun);
    window.addEventListener("hub:virtual:action", this.handleVirtualAction);
    window.render_game_to_text = () => JSON.stringify(this.getTextState());
    window.advanceTime = (ms: number) => {
      if (!Number.isFinite(ms) || ms <= 0) {
        return;
      }

      this.manualStepMode = true;
      const steps = Math.max(1, Math.ceil(ms / 16));
      const stepMs = ms / steps;

      for (let index = 0; index < steps; index += 1) {
        this.stepSimulation(stepMs);
      }
    };
  }

  private cleanupScene(): void {
    window.removeEventListener("hub:dialogue:closed", this.handleDialogueClosed);
    window.removeEventListener("keydown", this.handleWindowActionKey);
    window.removeEventListener("hub:virtual:dir", this.handleVirtualDirection);
    window.removeEventListener("hub:virtual:run", this.handleVirtualRun);
    window.removeEventListener("hub:virtual:action", this.handleVirtualAction);

    if (window.__hubHookOwner !== this.hookOwner) {
      return;
    }

    if (window.render_game_to_text !== undefined) {
      delete window.render_game_to_text;
    }

    if (window.advanceTime !== undefined) {
      delete window.advanceTime;
    }

    delete window.__hubHookOwner;
  }

  private getTextState(): HubTextState {
    return {
      scene: "battle-tower-lobby",
      coordinateSystem: "origin at top-left; x grows right; y grows down",
      dialogueOpen: this.dialogueOpen,
      map: {
        name: "Battle Tower Lobby",
        widthTiles: MAP_WIDTH,
        heightTiles: MAP_HEIGHT,
        tileSize: TILE_SIZE,
      },
      player: {
        tileX: this.tileX,
        tileY: this.tileY,
        worldX: Math.round(this.player.x),
        worldY: Math.round(this.player.y),
        facing: this.facing,
        moving: this.activeMove !== null,
        queuedDirection: this.bufferedMove?.direction ?? null,
        running: this.activeMove?.running ?? false,
      },
      npcs: STATIC_NPCS.map((npc) => ({
        id: npc.id,
        tileX: npc.tileX,
        tileY: npc.tileY,
        facing: npc.direction,
      })),
    };
  }

  private handleActionPress(): void {
    if (this.activeMove !== null || this.dialogueOpen) {
      return;
    }

    const vector = DIRECTION_VECTORS[this.facing];
    const targetTileX = this.tileX + vector.x;
    const targetTileY = this.tileY + vector.y;
    const npc = STATIC_NPCS.find((entry) => entry.tileX === targetTileX && entry.tileY === targetTileY);
    const interactable = npc ?? INTERACTIVE_TILES.find((t) => t.tileX === targetTileX && t.tileY === targetTileY);

    if (interactable === undefined) {
      return;
    }

    this.bufferedMove = null;
    this.dialogueOpen = true;
    dispatchHubInteract({
      npcId: interactable.id,
      text: getNpcDialogue(interactable.id),
    });
  }
}

import moveDex from "../../../../tools/dex-importer/output/datasets/moves.json";
import type {
  MoveRequestOption,
  PartySlotView,
  StatusCondition,
} from "../../../server/battle/src/view-model/types.js";

export const BATTLE_COMMANDS = [
  { id: "fight", label: "FIGHT" },
  { id: "pokemon", label: "POKEMON" },
  { id: "bag", label: "BAG" },
  { id: "run", label: "RUN" },
] as const;

export type PartyBallState = "ready" | "faint" | "status" | "empty";

const MOVE_TYPE_SHEET_ORDER = [
  "NORMAL",
  "FIGHTING",
  "FLYING",
  "POISON",
  "GROUND",
  "ROCK",
  "BUG",
  "GHOST",
  "STEEL",
  "???",
  "FIRE",
  "WATER",
  "GRASS",
  "ELECTRIC",
  "PSYCHIC",
  "ICE",
  "DRAGON",
  "DARK",
  "FAIRY",
] as const;

const MOVE_TYPE_TO_CURSOR_ROW = new Map(
  MOVE_TYPE_SHEET_ORDER.map((type, index) => [type, index] as const),
);

const STATUS_ICON_ROW: Record<Exclude<StatusCondition, null>, number> = {
  slp: 0,
  psn: 1,
  tox: 1,
  brn: 2,
  par: 3,
  frz: 4,
};

type MoveDexRecord = {
  type?: string;
};

const moveTypeById = new Map(
  Object.entries(moveDex as Record<string, MoveDexRecord>).map(([id, record]) => [
    id.toUpperCase(),
    (record.type ?? "???").toUpperCase(),
  ]),
);

export function getMoveTypeForRequest(move: MoveRequestOption | undefined): string {
  if (!move) {
    return "???";
  }

  return moveTypeById.get(move.id.toUpperCase()) ?? "???";
}

export function getTypeIconOffsetY(type: string): number {
  const row = MOVE_TYPE_TO_CURSOR_ROW.get(type.toUpperCase()) ?? MOVE_TYPE_TO_CURSOR_ROW.get("???") ?? 9;
  return row * 28;
}

export function getMoveCursorOffsetY(type: string, selected: boolean): number {
  const row = MOVE_TYPE_TO_CURSOR_ROW.get(type.toUpperCase()) ?? MOVE_TYPE_TO_CURSOR_ROW.get("???") ?? 9;
  return row * 92 + (selected ? 46 : 0);
}

export function getHpBarColor(ratio: number): string {
  if (ratio > 0.5) {
    return "#48c860";
  }

  if (ratio > 0.2) {
    return "#f0c028";
  }

  return "#f06038";
}

export function getStatusIconOffsetY(status: StatusCondition): number | null {
  if (!status) {
    return null;
  }

  return STATUS_ICON_ROW[status] * 16;
}

export function createPartyBalls(party: PartySlotView[] | undefined): PartyBallState[] {
  const balls = (party ?? []).slice(0, 6).map<PartyBallState>((member) => {
    if (member.hpStatus === "fainted") {
      return "faint";
    }

    if (member.status) {
      return "status";
    }

    return "ready";
  });

  while (balls.length < 6) {
    balls.push("empty");
  }

  return balls;
}

export function getPartyBallSrc(state: PartyBallState): string {
  switch (state) {
    case "ready":
      return "/assets/sprites/ui/battle/icon_ball.png";
    case "faint":
      return "/assets/sprites/ui/battle/icon_ball_faint.png";
    case "status":
      return "/assets/sprites/ui/battle/icon_ball_status.png";
    default:
      return "/assets/sprites/ui/battle/icon_ball_empty.png";
  }
}

import React from "react";
import type { ActivePokemonView } from "../../../server/battle/src/view-model/types.js";

// ─── HP bar ──────────────────────────────────────────────────────────────────

function hpColor(pct: number): string {
  if (pct > 0.5) return "#50c840";
  if (pct > 0.25) return "#f8d030";
  return "#f85030";
}

interface HpBarProps {
  current: number;
  max: number;
  width: number;
  height?: number;
}

const HpBar: React.FC<HpBarProps> = ({ current, max, width, height = 4 }) => {
  const pct = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  return (
    <div
      style={{
        width,
        height,
        background: "#484840",
        borderRadius: 1,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: Math.round(pct * width),
          height,
          background: hpColor(pct),
          transition: "width 0.3s ease",
        }}
      />
    </div>
  );
};

// ─── Status chip ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  psn: "#a050a0",
  tox: "#a050a0",
  brn: "#f08030",
  par: "#f8d030",
  slp: "#a0a070",
  frz: "#98d8d8",
};

const STATUS_LABELS: Record<string, string> = {
  psn: "PSN",
  tox: "TOX",
  brn: "BRN",
  par: "PAR",
  slp: "SLP",
  frz: "FRZ",
};

const StatusChip: React.FC<{ status: string | null }> = ({ status }) => {
  if (!status) return null;
  return (
    <div
      style={{
        background: STATUS_COLORS[status] ?? "#808080",
        color: "#fff",
        fontSize: 8,
        fontFamily: "monospace",
        padding: "1px 3px",
        borderRadius: 2,
        lineHeight: "10px",
      }}
    >
      {STATUS_LABELS[status] ?? status.toUpperCase()}
    </div>
  );
};

// ─── Foe databox ─────────────────────────────────────────────────────────────

interface FoeDataboxProps {
  pokemon: ActivePokemonView;
}

export const FoeDatabox: React.FC<FoeDataboxProps> = ({ pokemon }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      top: 36,
      width: 240,
      height: 46,
    }}
  >
    <img
      src="/assets/sprites/ui/battle/databox_normal_foe.png"
      alt=""
      draggable={false}
      style={{
        position: "absolute",
        inset: 0,
        imageRendering: "pixelated",
        width: "100%",
        height: "100%",
        objectFit: "fill",
      }}
    />
    <div
      style={{
        position: "absolute",
        left: 8,
        top: 6,
        display: "flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      <span style={{ fontSize: 10, fontFamily: "monospace", color: "#202020", fontWeight: "bold" }}>
        {pokemon.name}
      </span>
      <StatusChip status={pokemon.status} />
    </div>
    <div style={{ position: "absolute", left: 8, top: 18, fontSize: 9, fontFamily: "monospace", color: "#404040" }}>
      Lv{pokemon.level}
    </div>
    <div style={{ position: "absolute", left: 80, top: 28 }}>
      <HpBar current={pokemon.hpCurrent} max={pokemon.hpMax} width={96} />
    </div>
  </div>
);

// ─── Player databox ───────────────────────────────────────────────────────────

interface PlayerDataboxProps {
  pokemon: ActivePokemonView;
}

export const PlayerDatabox: React.FC<PlayerDataboxProps> = ({ pokemon }) => (
  <div
    style={{
      position: "absolute",
      left: 252,
      top: 206,
      width: 240,
      height: 46,
    }}
  >
    <img
      src="/assets/sprites/ui/battle/databox_normal.png"
      alt=""
      draggable={false}
      style={{
        position: "absolute",
        inset: 0,
        imageRendering: "pixelated",
        width: "100%",
        height: "100%",
        objectFit: "fill",
      }}
    />
    <div
      style={{
        position: "absolute",
        left: 8,
        top: 6,
        display: "flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      <span style={{ fontSize: 10, fontFamily: "monospace", color: "#202020", fontWeight: "bold" }}>
        {pokemon.name}
      </span>
      <StatusChip status={pokemon.status} />
    </div>
    <div style={{ position: "absolute", left: 8, top: 18, fontSize: 9, fontFamily: "monospace", color: "#404040" }}>
      Lv{pokemon.level}
    </div>
    <div style={{ position: "absolute", left: 80, top: 28 }}>
      <HpBar current={pokemon.hpCurrent} max={pokemon.hpMax} width={96} />
    </div>
    <div
      style={{
        position: "absolute",
        right: 10,
        bottom: 6,
        fontSize: 9,
        fontFamily: "monospace",
        color: "#404040",
      }}
    >
      {pokemon.hpCurrent}/{pokemon.hpMax}
    </div>
  </div>
);

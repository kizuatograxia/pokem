import type { Provenance } from './common.js';

export interface BaseStats {
  hp: number;
  atk: number;
  def: number;
  spe: number;
  spa: number;
  spd: number;
}

export interface EVYield {
  stat: string;
  amount: number;
}

export interface LevelMove {
  level: number;
  moveId: string;
}

export interface Evolution {
  targetId: string;
  method: string;
  param: string;
}

export interface PokemonSpriteMetrics {
  backSpriteX: number;
  backSpriteY: number;
  frontSpriteX: number;
  frontSpriteY: number;
  shadowX: number;
  shadowSize: number;
}

export type GenderRatio =
  | 'AlwaysMale'
  | 'FemaleOneEighth'
  | 'Female25Percent'
  | 'Female50Percent'
  | 'Female75Percent'
  | 'FemaleSevenEighths'
  | 'AlwaysFemale'
  | 'Genderless';

export interface Species {
  id: string;
  name: string;
  types: [string, string?];
  baseStats: BaseStats;
  genderRatio: GenderRatio;
  growthRate: string;
  baseExp: number;
  evYield: EVYield[];
  catchRate: number;
  happiness: number;
  abilities: string[];
  hiddenAbilities: string[];
  levelMoves: LevelMove[];
  tutorMoves: string[];
  eggMoves: string[];
  eggGroups: string[];
  hatchSteps: number;
  height: number;
  weight: number;
  color: string;
  shape: string;
  habitat: string | null;
  category: string;
  pokedex: string;
  generation: number;
  evolutions: Evolution[];
  metrics: PokemonSpriteMetrics | null;
  provenance: Provenance;
}

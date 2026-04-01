import type { Provenance } from './common.js';

export type MoveCategory = 'Physical' | 'Special' | 'Status';

export type MoveTarget =
  | 'NearOther'
  | 'AllNearFoes'
  | 'RandomNearFoe'
  | 'AllNearAllies'
  | 'NearAlly'
  | 'UserOrNearAlly'
  | 'User'
  | 'UserAndAllies'
  | 'AllBattlers'
  | 'AllFoes'
  | 'AllAllies'
  | 'None'
  | string;

export interface Move {
  id: string;
  name: string;
  type: string;
  category: MoveCategory;
  power: number | null;
  accuracy: number | null;
  pp: number;
  target: MoveTarget;
  functionCode: string;
  flags: string[];
  effectChance: number | null;
  description: string;
  provenance: Provenance;
}

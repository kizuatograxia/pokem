import type { Provenance } from './common.js';

export interface Ability {
  id: string;
  name: string;
  description: string;
  provenance: Provenance;
}

import type { PbsBlock } from './pbs.js';
import type { Ability } from '../schema/ability.js';
import type { Provenance, ValidationError } from '../schema/common.js';

export function parseAbilityBlock(
  id: string,
  block: PbsBlock,
  provenance: Provenance,
  errors: ValidationError[]
): Ability | null {
  if (!block['Name']) {
    errors.push({ id, field: 'Name', message: 'Missing required field: Name', severity: 'error' });
    return null;
  }

  return {
    id,
    name: block['Name'],
    description: block['Description'] ?? '',
    provenance,
  };
}

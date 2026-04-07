import type { PbsBlock } from './pbs.js';
import type { PokemonSpriteMetrics } from '../schema/species.js';
import type { ValidationError } from '../schema/common.js';

export function parseMetricsBlock(
  id: string,
  block: PbsBlock,
  errors: ValidationError[]
): PokemonSpriteMetrics {
  const parsePair = (raw: string | undefined): [number, number] => {
    if (!raw) return [0, 0];
    const parts = raw.split(',').map(Number);
    if (parts.length !== 2) {
      errors.push({ id, field: 'Metrics', message: `Expected pair, got: ${raw}`, severity: 'warning' });
      return [0, 0];
    }
    return [parts[0], parts[1]];
  };

  const [backX, backY] = parsePair(block['BackSprite']);
  const [frontX, frontY] = parsePair(block['FrontSprite']);

  return {
    backSpriteX: backX,
    backSpriteY: backY,
    frontSpriteX: frontX,
    frontSpriteY: frontY,
    shadowX: Number(block['ShadowX'] ?? 0),
    shadowSize: Number(block['ShadowSize'] ?? 1),
  };
}

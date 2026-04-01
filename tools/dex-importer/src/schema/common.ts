export type SourceLayer = 'essentials-21.1' | 'gen9-pack-3.3.4';

export interface Provenance {
  source: SourceLayer;
  file: string;
}

export interface ConflictRecord {
  id: string;
  field: string;
  baseValue: unknown;
  overrideValue: unknown;
  resolvedTo: unknown;
  sources: [SourceLayer, SourceLayer];
}

export interface ValidationError {
  id: string;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ImportResult<T> {
  entries: Map<string, T>;
  conflicts: ConflictRecord[];
  errors: ValidationError[];
}

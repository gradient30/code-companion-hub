import { buildCliCommandEntityKey, buildGuideEntityKey } from "./entity-keys";
import type {
  DocRefreshBaseEntity,
  DocRefreshDiffKind,
  DocRefreshDiffPair,
  DocRefreshDiffResult,
} from "./types";

function getEntityKey(item: DocRefreshBaseEntity): string {
  return item.entityKey;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const entries = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`);
  return `{${entries.join(",")}}`;
}

function stripEntityKey<T extends DocRefreshBaseEntity>(item: T): Record<string, unknown> {
  const { entityKey: _entityKey, ...rest } = item;
  return rest;
}

function normalizeText(input: string | undefined): string {
  return (input || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, " ")
    .trim();
}

function tokenize(input: string | undefined): Set<string> {
  const normalized = normalizeText(input);
  if (!normalized) return new Set();
  return new Set(normalized.split(/\s+/).filter(Boolean));
}

function itemText(item: DocRefreshBaseEntity): string {
  return [
    item.entityKey,
    item.vendorId,
    item.category,
    item.title,
    item.command,
    item.description,
    item.code,
    item.content,
    item.body,
  ]
    .filter(Boolean)
    .map((part) => String(part))
    .join(" ");
}

function contentFingerprint<T extends DocRefreshBaseEntity>(item: T): string {
  return stableStringify(stripEntityKey(item));
}

function similarityScore(a: DocRefreshBaseEntity, b: DocRefreshBaseEntity): number {
  const left = tokenize(itemText(a));
  const right = tokenize(itemText(b));
  if (left.size === 0 && right.size === 0) return 1;

  let intersection = 0;
  for (const token of left) {
    if (right.has(token)) intersection++;
  }

  const union = new Set([...left, ...right]).size;
  return union === 0 ? 0 : intersection / union;
}

function sortDiffPairs<T extends DocRefreshBaseEntity>(pairs: DocRefreshDiffPair<T>[]): DocRefreshDiffPair<T>[] {
  return [...pairs].sort((left, right) => {
    const leftKey = getEntityKey(left.candidate ?? left.baseline);
    const rightKey = getEntityKey(right.candidate ?? right.baseline);
    return leftKey.localeCompare(rightKey);
  });
}

export function diffCatalogItems<T extends DocRefreshBaseEntity>(input: {
  baseline: T[];
  candidate: T[];
  similarityThreshold?: number;
}): DocRefreshDiffResult<T> {
  const threshold = input.similarityThreshold ?? 0.45;
  const baselineByKey = new Map(input.baseline.map((item) => [getEntityKey(item), item] as const));

  const modified: DocRefreshDiffPair<T>[] = [];
  const added: T[] = [];
  const stale: T[] = [];
  const similar: DocRefreshDiffPair<T>[] = [];

  const matchedBaselineKeys = new Set<string>();
  const matchedCandidateKeys = new Set<string>();

  for (const candidate of input.candidate) {
    const baseline = baselineByKey.get(getEntityKey(candidate));
    if (!baseline) continue;

    matchedBaselineKeys.add(getEntityKey(candidate));
    matchedCandidateKeys.add(getEntityKey(candidate));

    if (contentFingerprint(baseline) !== contentFingerprint(candidate)) {
      modified.push({ baseline, candidate });
    }
  }

  const unmatchedCandidates = input.candidate.filter((item) => !matchedCandidateKeys.has(getEntityKey(item)));
  const unmatchedBaseline = input.baseline.filter((item) => !matchedBaselineKeys.has(getEntityKey(item)));

  const remainingBaseline = [...unmatchedBaseline];

  for (const candidate of unmatchedCandidates) {
    let bestMatch: T | null = null;
    let bestScore = 0;

    for (const baseline of remainingBaseline) {
      if (baseline.vendorId !== candidate.vendorId) continue;
      if (baseline.category !== candidate.category) continue;

      const score = similarityScore(baseline, candidate);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = baseline;
      }
    }

    if (bestMatch && bestScore >= threshold) {
      similar.push({ baseline: bestMatch, candidate, similarityScore: bestScore });
      matchedBaselineKeys.add(getEntityKey(bestMatch));
      const bestKey = getEntityKey(bestMatch);
      const bestIndex = remainingBaseline.findIndex((item) => getEntityKey(item) === bestKey);
      if (bestIndex >= 0) {
        remainingBaseline.splice(bestIndex, 1);
      }
      continue;
    }

    added.push(candidate);
  }

  for (const baseline of input.baseline) {
    if (!matchedBaselineKeys.has(getEntityKey(baseline))) {
      stale.push(baseline);
    }
  }

  const summary = {
    added: added.length,
    modified: modified.length,
    stale: stale.length,
    similar: similar.length,
  } satisfies Record<DocRefreshDiffKind, number>;

  return {
    summary,
    added,
    modified: sortDiffPairs(modified),
    stale,
    similar: sortDiffPairs(similar),
  };
}

export { buildCliCommandEntityKey, buildGuideEntityKey };

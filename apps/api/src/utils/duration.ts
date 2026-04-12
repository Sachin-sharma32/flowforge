const DURATION_REGEX = /^(\d+)(ms|s|m|h|d)$/;

const DURATION_MULTIPLIER: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export function parseDurationToMilliseconds(value: string): number {
  const normalized = value.trim();
  const match = normalized.match(DURATION_REGEX);

  if (!match) {
    throw new Error(`Invalid duration format: "${value}"`);
  }

  const amount = Number(match[1]);
  const unit = match[2];
  return amount * DURATION_MULTIPLIER[unit];
}

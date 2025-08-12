export function normalizePercentage({ score, percentage }) {
  const parseNumber = (value) => {
    if (value === undefined || value === null) return null;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      const cleaned = trimmed.endsWith('%') ? trimmed.slice(0, -1) : trimmed;
      const parsed = parseFloat(cleaned);
      return Number.isNaN(parsed) ? null : parsed;
    }
    if (typeof value === 'number') return value;
    return null;
  };

  let value = null;
  const percentageNumber = parseNumber(percentage);
  const scoreNumber = parseNumber(score);

  if (percentageNumber !== null) {
    value = percentageNumber;
  } else if (scoreNumber !== null) {
    value = scoreNumber;
  }

  if (value === null) return null;

  // If value seems like a fraction (0-1), convert to 0-100
  if (value >= 0 && value <= 1) {
    value = value * 100;
  }

  // Clamp to 0-100 and round to nearest integer for display
  if (value < 0) value = 0;
  if (value > 100) value = 100;

  return Math.round(value);
}
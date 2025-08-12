export function normalizeScoreToPercentage(rawScore) {
  if (rawScore === undefined || rawScore === null) {
    return null;
  }

  let numericScore;

  if (typeof rawScore === 'string') {
    const cleaned = rawScore.replace(/%/g, '').trim();
    numericScore = Number(cleaned);
    if (Number.isNaN(numericScore)) {
      return null;
    }
  } else if (typeof rawScore === 'number') {
    numericScore = rawScore;
  } else {
    return null;
  }

  // Convert fractional values to percentage
  if (numericScore > 0 && numericScore <= 1) {
    numericScore = numericScore * 100;
  }

  // Clamp to sensible range
  if (numericScore < 0) numericScore = 0;
  if (numericScore > 100) numericScore = 100;

  // Round to two decimals for display consistency
  return Math.round(numericScore * 100) / 100;
}

export function formatPercentage(scorePercentage, { maxFractionDigits = 2 } = {}) {
  if (scorePercentage === undefined || scorePercentage === null) {
    return 'N/A';
  }
  const formatter = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  });
  return formatter.format(scorePercentage);
}

export function normalizeCertificateData(raw) {
  const scorePercentage = normalizeScoreToPercentage(
    raw?.score ?? raw?.percentage ?? raw?.scorePercentage
  );

  return {
    id: raw?.id ?? 'N/A',
    examTitle: raw?.exam?.title ?? raw?.examTitle ?? 'Unknown Exam',
    scorePercentage,
    earnedDate:
      raw?.earnedDate ?? raw?.completedAt ?? raw?.createdAt ?? null,
    categoryName:
      raw?.exam?.examCategory?.name ?? raw?.categoryName ?? 'Unknown Category',
  };
}
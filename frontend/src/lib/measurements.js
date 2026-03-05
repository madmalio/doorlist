const FRACTION_DENOMINATOR = 32;

export function parseMeasurement(input) {
  const value = String(input ?? '').trim();
  if (!value) {
    return null;
  }

  const mixedMatch = value.match(/^([+-]?\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1], 10);
    const numerator = parseInt(mixedMatch[2], 10);
    const denominator = parseInt(mixedMatch[3], 10);
    if (denominator === 0) {
      return null;
    }

    const sign = whole < 0 ? -1 : 1;
    return whole + sign * (numerator / denominator);
  }

  const fractionMatch = value.match(/^([+-]?\d+)\/(\d+)$/);
  if (fractionMatch) {
    const numerator = parseInt(fractionMatch[1], 10);
    const denominator = parseInt(fractionMatch[2], 10);
    if (denominator === 0) {
      return null;
    }
    return numerator / denominator;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return parsed;
}

export function formatMeasurement(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '';
  }

  const numeric = Number(value);
  const negative = numeric < 0;
  const absValue = Math.abs(numeric);
  let whole = Math.floor(absValue);
  let numerator = Math.round((absValue - whole) * FRACTION_DENOMINATOR);
  let denominator = FRACTION_DENOMINATOR;

  if (numerator === denominator) {
    whole += 1;
    numerator = 0;
  }

  if (numerator > 0) {
    const divisor = gcd(numerator, denominator);
    numerator /= divisor;
    denominator /= divisor;
  }

  let formatted = '';
  if (numerator === 0) {
    formatted = `${whole}`;
  } else if (whole === 0) {
    formatted = `${numerator}/${denominator}`;
  } else {
    formatted = `${whole} ${numerator}/${denominator}`;
  }

  if (negative && formatted !== '0') {
    return `-${formatted}`;
  }

  return formatted;
}

function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

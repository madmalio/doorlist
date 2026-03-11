import { formatMeasurement, parseMeasurement } from './measurements';

const INCH_TO_MM = 25.4;

export function normalizeMeasurementSystem(value) {
  return value === 'metric' ? 'metric' : 'imperial';
}

export function inchesToMillimeters(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return numeric * INCH_TO_MM;
}

export function millimetersToInches(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return numeric / INCH_TO_MM;
}

export function parseLengthInput(input, measurementSystem = 'imperial') {
  const normalizedSystem = normalizeMeasurementSystem(measurementSystem);
  const text = String(input ?? '').trim().toLowerCase();
  if (!text) {
    return null;
  }

  if (normalizedSystem === 'metric') {
    const cleaned = text.replaceAll('mm', '').trim();
    const mmValue = Number(cleaned);
    if (!Number.isFinite(mmValue)) {
      return null;
    }
    return millimetersToInches(mmValue);
  }

  return parseMeasurement(text);
}

export function formatLengthInput(valueInInches, measurementSystem = 'imperial') {
  const normalizedSystem = normalizeMeasurementSystem(measurementSystem);
  const numeric = Number(valueInInches);
  if (!Number.isFinite(numeric)) {
    return '';
  }

  if (normalizedSystem === 'metric') {
    const mmValue = inchesToMillimeters(numeric);
    if (mmValue === null) {
      return '';
    }
    return String(Math.round(mmValue));
  }

  return formatMeasurement(numeric);
}

export function formatLengthDisplay(value, measurementSystem = 'imperial') {
  const normalizedSystem = normalizeMeasurementSystem(measurementSystem);
  const text = String(value ?? '').trim();
  if (!text || text === '-') {
    return text || '-';
  }

  if (normalizedSystem === 'metric') {
    const inches = parseMeasurement(text);
    if (inches === null) {
      return text;
    }
    const millimeters = inchesToMillimeters(inches);
    if (millimeters === null) {
      return text;
    }
    return `${Math.round(millimeters)} mm`;
  }

  const imperialText = Number.isFinite(Number(text)) ? formatMeasurement(Number(text)) : text;
  return imperialText.endsWith('"') ? imperialText : `${imperialText}"`;
}

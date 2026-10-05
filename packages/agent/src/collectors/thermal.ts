export function parseTempCelsius(text: string): number {
  const millidegrees = Number.parseInt(text.trim());

  if (Number.isNaN(millidegrees)) {
    throw new Error(`Malformed temp value: ${text}`);
  }

  return millidegrees / 1000;
}

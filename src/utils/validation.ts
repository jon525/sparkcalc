export const numberOrUndefined = (raw: string): number | undefined => {
  if (raw.trim() === '') return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
};

export const validateNumber = (
  label: string,
  value: number | undefined,
  options: { required?: boolean; allowZero?: boolean; allowNegative?: boolean; maxRealistic?: number } = {}
): string[] => {
  const warnings: string[] = [];
  if (value === undefined) {
    if (options.required) warnings.push(`${label} is missing.`);
    return warnings;
  }
  if (!options.allowNegative && value < 0) warnings.push(`${label} should not be negative.`);
  if (!options.allowZero && value === 0) warnings.push(`${label} should not be zero.`);
  if (options.maxRealistic !== undefined && Math.abs(value) > options.maxRealistic) {
    warnings.push(`${label} looks unusually high for a training example.`);
  }
  return warnings;
};

export const missingTwoInputWarning = (count: number): string[] =>
  count < 2 ? ['Enter at least two known values to calculate the rest.'] : [];
